import React, { Component } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson'
import { Topology } from 'topojson-specification'
import { Feature, FeatureCollection } from 'geojson'

import './MapSample.css'
import { GeoSphere, GeoPermissibleObjects } from 'd3'

/* #@@range_begin(line_sample2) */
interface MapFile {
  mapurl: string
  dataurl: string
  objectsname: string
  latitude: number
  longitude: number
}
/* #@@range_end(line_sample2) */

interface MapState {
  mapdata:
    | {
        status: 'Loading'
      }
    | {
        status: 'Success'
        topology: Topology
        data: Topology
      }
    | {
        status: 'Failure'
        error: Error
      }
}

class MapSample extends Component<MapFile, MapState> {
  // d3.select("svg")は他のコンポーネントのDOMまで取得するため使用しない。
  // 代わりにrefから取得したsvgを使用する。
  svg: React.RefObject<SVGSVGElement>
  canvas: React.RefObject<HTMLCanvasElement>

  constructor(props: MapFile) {
    super(props)
    this.svg = React.createRef<SVGSVGElement>()
    this.canvas = React.createRef<HTMLCanvasElement>()
    this.state = {
      mapdata: {
        status: 'Loading',
      },
    }
  }

  getSize = () => {
    let width = 0
    let height = 0
    if (this.canvas.current) {
      width = this.canvas.current.clientWidth
      height = this.canvas.current.clientHeight
    }
    return [width, height]
  }

  // 投影法を取得する。
  getProjection = (scale = 300): d3.GeoProjection => {
    const [width, height] = this.getSize()
    // return d3.geoEquirectangular()
    // return d3.geoMercator()
    /* #@@range_begin(line_sample3) */
    return d3
      .geoOrthographic()
      .scale(scale)
      .rotate([-this.props.latitude, -this.props.longitude, 0])
      .translate([width / 1.5, height - 100])
    /* #@@range_end(line_sample3) */
  }

  draw = async (ctx: CanvasRenderingContext2D) => {
    if (this.state.mapdata.status !== 'Success') return
    const mapData = this.state.mapdata.topology
    const citydata = this.state.mapdata.data

    // 投影法の設定を取得する。
    const projection = this.getProjection()
    // 地理情報のPathGeneratorを取得する。
    const pathGenerator = d3
      .geoPath<any, GeoPermissibleObjects>()
      .projection(projection)
      .context(ctx)

    // 取得した地図データをDOM要素に設定する。
    const feature = topojson.feature(
      mapData,
      mapData.objects[this.props.objectsname]
    )
    const cityFeature = topojson.feature(
      citydata,
      citydata.objects[this.props.objectsname]
    )
    const cityFeatures: Feature[] =
      cityFeature.type === 'FeatureCollection'
        ? cityFeature.features
        : [cityFeature]

    this.createSea(ctx, pathGenerator)
    this.createLand(ctx, pathGenerator, feature)
    this.createArcLine(cityFeatures, projection, ctx)
    this.createCity(cityFeatures, projection, ctx)

    if (!this.canvas.current) return
    const canvas = d3.select<HTMLCanvasElement, Feature>(this.canvas.current)

    // const drag = d3.drag<HTMLCanvasElement, Feature, SubjectPosition>()
    // 	.subject(() => {
    // 		const rotate = projection.rotate();
    // 		return {x: rotate[0], y: -rotate[1]}
    // 	})
    //   .on("drag", () => { this.onDraged(projection) });
    // canvas.call(drag);

    const zoom = d3
      .zoom<HTMLCanvasElement, Feature>()
      .scaleExtent([1, 24]) // 範囲
      .on('zoom', () => this.onZoomed(projection))
    canvas.call(zoom)
  }

  // onDraged = (projection:d3.GeoProjection) => {
  //   if (!this.canvas.current) return;
  //   const context = this.canvas.current.getContext("2d");
  //   if (!context) return;
  //   const rotate = projection.rotate();
  //   const transform = d3.event.transform;
  //   const [width, height] = this.getSize();
  //   context.save();
  //   context.clearRect(0, 0, width, height);
  //   context.translate(transform.x, transform.y);
  //   context.scale(transform.k, transform.k);
  //   projection.rotate([transform.x, transform.y, rotate[2]]);
  //   this.draw(context);
  //   context.restore();
  // }

  onZoomed = (projection: d3.GeoProjection) => {
    if (!this.canvas.current) return
    const context = this.canvas.current.getContext('2d')
    if (!context) return
    const transform = d3.event.transform
    const [width, height] = this.getSize()
    context.save()
    context.clearRect(0, 0, width, height)
    context.translate(transform.x, transform.y)
    context.scale(transform.k, transform.k)
    projection.rotate([transform.x, transform.y])
    this.draw(context)
    context.restore()
  }

  private createCity(
    cityFeatures: Feature[],
    projection: d3.GeoProjection,
    ctx: CanvasRenderingContext2D
  ) {
    const [min, max] = d3.extent(cityFeatures, (f): number => {
      return f.properties ? f.properties.POP_MAX : 0
    })
    const scale =
      min !== undefined && max !== undefined
        ? d3.scaleLinear().domain([min, max]).range([0, 10])
        : null
    if (!scale) return

    cityFeatures.forEach((f) => {
      if (f.geometry.type === 'Point' && f.properties) {
        const p = projection([
          f.geometry.coordinates[0],
          f.geometry.coordinates[1],
        ])
        if (!p) return
        ctx.fillStyle = 'yellow'
        ctx.strokeStyle = 'none'
        ctx.beginPath()
        ctx.arc(p[0], p[1], scale(f.properties.POP_MAX), 0, Math.PI * 2, false)
        ctx.fill()
      }
    })
  }

  /* #@@range_begin(3d_arc_sample1) */
  private createArcLine(
    cityFeatures: Feature[],
    projection: d3.GeoProjection,
    ctx: CanvasRenderingContext2D
  ) {
    const sky = this.getProjection(600)
    const len = cityFeatures.length
    const lineString: GeoJSON.LineString[] = []
    cityFeatures.forEach((f, i, d) => {
      if (f.geometry.type === 'Point' && f.properties) {
        if (f.properties.POP_MAX < 5000000) return
        const target = Math.floor(d3.randomNormal(1, len)())
        const targetF = d[target]
        if (
          target !== i &&
          targetF &&
          targetF.geometry &&
          targetF.geometry.type === 'Point'
        ) {
          const inter = d3.geoInterpolate(
            [f.geometry.coordinates[0], f.geometry.coordinates[1]],
            [targetF.geometry.coordinates[0], targetF.geometry.coordinates[1]]
          )
          const start = projection([
            f.geometry.coordinates[0],
            f.geometry.coordinates[1],
          ])
          const mid1 = sky(inter(0.33))
          const mid2 = sky(inter(0.76))
          const end = projection([
            targetF.geometry.coordinates[0],
            targetF.geometry.coordinates[1],
          ])
          if (start && mid1 && mid2 && end) {
            const obj: GeoJSON.LineString = {
              type: 'LineString',
              coordinates: [start, mid1, mid2, end],
            }
            lineString.push(obj)
          } else {
            const obj: GeoJSON.LineString = {
              type: 'LineString',
              coordinates: [
                f.geometry.coordinates,
                targetF.geometry.coordinates,
              ],
            }
            lineString.push(obj)
          }
        }
      }
    })
    lineString.forEach((s) => {
      if (s.type === 'LineString') {
        ctx.fillStyle = 'none'
        ctx.strokeStyle = 'yellow'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(s.coordinates[0][0], s.coordinates[0][1])
        ctx.bezierCurveTo(
          s.coordinates[1][0],
          s.coordinates[1][1],
          s.coordinates[2][0],
          s.coordinates[2][1],
          s.coordinates[3][0],
          s.coordinates[3][1]
        )
        ctx.stroke()
      }
    })
  }
  /* #@@range_end(3d_arc_sample1) */

  private createLand(
    ctx: CanvasRenderingContext2D,
    pathGenerator: d3.GeoPath<any, d3.GeoPermissibleObjects>,
    feature: Feature | FeatureCollection
  ) {
    const grey = 10 + 5 * 1 + 2 * Math.pow(10, 1.0 / 2.5)
    ctx.fillStyle = d3.rgb(grey, grey, grey).toString()
    ctx.strokeStyle = 'gray'
    ctx.lineWidth = 0.1
    ctx.beginPath()
    pathGenerator(feature)
    ctx.fill()
    ctx.stroke()
  }

  private createSea(
    ctx: CanvasRenderingContext2D,
    pathGenerator: d3.GeoPath<any, d3.GeoPermissibleObjects>
  ) {
    const sphere: GeoSphere = { type: 'Sphere' }
    ctx.fillStyle = 'rgba(30, 30, 30, 0.5)'
    ctx.beginPath()
    pathGenerator(sphere)
    ctx.fill()
    ctx.stroke()
  }

  componentDidMount() {
    console.log('componentDidMount')
    // 地図データを取得する。
    // d3.jsはFetch APIを使用している。
    Promise.all([
      d3.json<Topology>(this.props.mapurl),
      d3.json<Topology>(this.props.dataurl),
    ])
      .then(([map, data]) => {
        this.setState({
          mapdata: {
            status: 'Success',
            topology: map,
            data: data,
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
    const context = this.initCanvas()
    if (!context) return
    this.draw(context)
  }

  initCanvas = () => {
    if (!this.canvas.current) return
    const canvas = d3.select<HTMLCanvasElement, unknown>(this.canvas.current)
    if (!canvas) return
    const canvasElement = canvas.node()
    if (!canvasElement) return
    const [width, height] = this.getSize()
    // For Ratina Display
    const dpr = window.devicePixelRatio || 1
    canvasElement.width = width * dpr
    canvasElement.height = height * dpr

    const context = this.canvas.current.getContext('2d')
    if (!context) return
    context.globalCompositeOperation = 'lighter'
    return context
  }

  render() {
    if (this.state.mapdata.status === 'Loading') {
      return <p>Loading...</p>
    } else if (this.state.mapdata.status === 'Failure') {
      return <p>Error: {this.state.mapdata.error.message}</p>
    } else {
      return (
        <>
          <canvas ref={this.canvas}></canvas>
        </>
      )
    }
  }
}

export default MapSample
