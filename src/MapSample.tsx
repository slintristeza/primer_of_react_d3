import React, { Component } from 'react'
import * as d3 from 'd3'
import { GeoSphere, SubjectPosition, GeoPermissibleObjects } from 'd3'
import * as topojson from 'topojson'
import { Topology } from 'topojson-specification'
import { Feature } from 'geojson'

import './MapSample.css'

interface MapFile {
  mapurl: string
  dataurl: string
  objectsname: string
  latitude: number
  longitude: number
}

interface MapState {
  mapdata:
    | {
        status: 'Loading'
      }
    | {
        status: 'Success'
        topology: Topology
      }
    | {
        status: 'Failure'
        error: Error
      }
}

class MapSample extends Component<MapFile, MapState> {
  // Reactが管理しているDOM要素を使用するため、refから取得したsvgを使用する。
  svg: React.RefObject<SVGSVGElement>
  constructor(props: MapFile) {
    super(props)
    this.svg = React.createRef<SVGSVGElement>()
    this.state = {
      mapdata: {
        status: 'Loading',
      },
    }
  }

  // 投影法を取得する。
  getProjection = (): d3.GeoProjection => {
    let width = 0
    let height = 0
    if (this.svg.current) {
      width = this.svg.current.clientWidth
      height = this.svg.current.clientHeight
    }
    return d3
      .geoOrthographic()
      .scale(300)
      .rotate([-this.props.latitude, -this.props.longitude, 0])
      .translate([width / 2, height / 2])
  }

  // 地図を描画する。
  draw = (svg: d3.Selection<SVGSVGElement, Feature, null, undefined>) => {
    if (this.state.mapdata.status !== 'Success') return
    const mapData = this.state.mapdata.topology

    // 取得した地図データを DOM 要素に設定する。
    const projection = this.getProjection()
    const pathGenerator = d3
      .geoPath<SVGPathElement, GeoPermissibleObjects>()
      .projection(projection)
    const feature = topojson.feature(
      mapData,
      mapData.objects[this.props.objectsname]
    )
    const features: Feature[] =
      feature.type === 'FeatureCollection' ? feature.features : [feature]
    const [popMin, popMax] = d3.extent(features, (f) => {
      return f.properties ? +f.properties.POP_EST : undefined
    })
    const popScale =
      popMin && popMax
        ? d3.scaleSqrt().domain([popMin, popMax]).range([0, 1])
        : undefined

    const g = svg.append('g')

    // 海の描画
    const sphere: GeoSphere[] = [{ type: 'Sphere' }]
    const sea = g.selectAll('.sea').data(sphere)
    sea
      .enter()
      .append('path')
      .attr('class', 'shape sea')
      .attr('d', pathGenerator)
      .style('fill', 'blue')
      .style('fill-opacity', 0.2)

    const item = g.selectAll('.item').data(features)

    // 存在しないデータの DOM 要素を削除する。
    item.exit().remove()

    // 指定した地図データを元に地図を描画する。
    item
      .enter()
      .append('path')
      .attr('class', 'shape item')
      .attr('d', pathGenerator)
      .style('fill', (d) => {
        return this.getCountryColor(d, popScale)
      })
      .style('stroke', () => {
        return 'gray'
      })
      .style('stroke-width', () => {
        return 0.1
      })

/*
    const tokyo: [number, number] = [139.7494, 35.6869]
    const london: [number, number] = [0.1278, 51.5074]

    const lines: GeoJSON.LineString[] = [
      { type: 'LineString', coordinates: [tokyo, london] },
    ]
    const line = g.selectAll('.line').data(lines)
    line
      .enter()
      .append('path')
      .attr('class', 'shape line')
      .attr('d', pathGenerator)
      .style('fill', 'none')
      .style('stroke', 'red')
      .style('stroke-width', 5)

    const points: GeoJSON.Point[] = [
      { type: 'Point', coordinates: tokyo },
      { type: 'Point', coordinates: london },
    ]
    const point = g.selectAll('.point').data(points)
    point
      .enter()
      .append('path')
      .attr('class', 'shape point')
      .attr('d', pathGenerator.pointRadius(10))
      .style('fill', 'red')
*/
    const drag = d3
      .drag<SVGSVGElement, Feature, SubjectPosition>()
      .subject(() => {
        const rotate = projection.rotate()
        return { x: rotate[0], y: -rotate[1] }
      })
      .on('drag', () => {
        this.onDraged(projection, pathGenerator)
      })
    svg.call(drag)

    const zoom = d3
      .zoom<SVGSVGElement, Feature>()
      .scaleExtent([1, 24])
      .on('zoom', this.onZoomed)
    svg.call(zoom)
  }

  getCountryColor = (
    d: Feature,
    scale?: d3.ScaleContinuousNumeric<number, number>
  ) => {
    return d.properties && scale
      ? d3.interpolateReds(scale(+d.properties.POP_EST))
      : 'gary'
  }

  onDraged = (
    projection: d3.GeoProjection,
    pathGenerator: d3.GeoPath<SVGPathElement, GeoPermissibleObjects>
  ) => {
    const rotate = projection.rotate()
    projection.rotate([d3.event.x, -d3.event.y, rotate[2]])
    if (!this.svg.current) return
    const svg = d3.select<SVGSVGElement, Feature>(this.svg.current)
    svg
      .selectAll<SVGPathElement, GeoPermissibleObjects>('path')
      .attr('d', pathGenerator)
  }

  onZoomed = () => {
    if (!this.svg.current) return
    d3.select<SVGSVGElement, Feature>(this.svg.current)
      .selectAll('.shape')
      .attr('transform', d3.event.transform)
  }

  componentDidMount() {
    console.log('componentDidMount')
    d3.json<Topology>(this.props.mapurl)
      .then((topology: Topology) => {
        this.setState({
          mapdata: {
            status: 'Success',
            topology: topology,
          },
        })
      })
      .catch((error: Error) => {
        this.setState({
          mapdata: {
            status: 'Failure',
            error: error,
          },
        })
      })
  }

  componentDidUpdate = () => {
    console.log('componentDidUpdate')
    if (!this.svg.current) return
    const svg = d3.select<SVGSVGElement, Feature>(this.svg.current)
    this.draw(svg)
  }

  render() {
    if (this.state.mapdata.status === 'Loading') {
      return <p>Loading...</p>
    } else if (this.state.mapdata.status === 'Failure') {
      return <p>Error: {this.state.mapdata.error.message}</p>
    } else {
      return <svg ref={this.svg}></svg>
    }
  }
}

export default MapSample
