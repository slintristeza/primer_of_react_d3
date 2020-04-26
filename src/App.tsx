import React from 'react'
import './App.css'

import MapSample from './MapSample'

const App: React.FC = () => {
  return (
    <div>
      <MapSample
        url="ne_110m_admin_0_countries_topo_0.50.json"
        objectsname="countries"
        latitude={139.74946157054467}
        longitude={90}
      />
    </div>
  )
}

export default App
