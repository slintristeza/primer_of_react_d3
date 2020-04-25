import React, { Component } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson'
import { Topology } from 'topojson-specification'
import { Feature } from 'geojson'

import './MapSample.css'

interface MapFile {
  url: string
  objectsname: string
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
      .translate([width / 2, height / 2])
  }

  // 地図を描画する。
  draw = (svg: d3.Selection<SVGSVGElement, Feature[], null, undefined>) => {
    if (this.state.mapdata.status !== 'Success') return
    const mapData = this.state.mapdata.topology

    // 取得した地図データを DOM 要素に設定する。
    const projection = this.getProjection()
    const pathGenerator = d3.geoPath().projection(projection)
    const feature = topojson.feature(
      mapData,
      mapData.objects[this.props.objectsname]
    )
    const features: Feature[] =
      feature.type === 'FeatureCollection' ? feature.features : [feature]

    const g = svg.append('g')
    const item = g.selectAll('.item').data(features)

    // 存在しないデータの DOM 要素を削除する。
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    item.exit().remove

    // 指定した地図データを元に地図を描画する。
    item
      .enter()
      .append('path')
      .attr('class', 'shape item')
      .attr('d', pathGenerator)
      .style('fill', 'black')
      .style('stroke', () => {
        return 'white'
      })
      .style('stroke-width', () => {
        return 0.1
      })
  }

  componentDidMount() {
    console.log('componentDidMount')
    d3.json<Topology>(this.props.url)
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
    const svg = d3.select<SVGSVGElement, Feature[]>(this.svg.current)
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
