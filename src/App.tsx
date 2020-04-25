import React from 'react'
import './App.css'

import MapSample from './MapSample'

const App: React.FC = () => {
  return (
    <div>
      <MapSample
        url="ne_110m_admin_0_countries_topo_0.50.json"
        objectsname="countries"
      />
    </div>
  )
}

export default App
