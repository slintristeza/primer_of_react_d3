import React from 'react'
import './App.css'

import MapSample from './MapSample'

const App: React.FC = () => {
  return (
    <div>
      <MapSample
        mapurl="ne_110m_admin_0_countries_topo_0.50.json"
        dataurl="world_population.csv"
        objectsname="countries"
        latitude={139}
        longitude={35}
      />
    </div>
  )
}

export default App
