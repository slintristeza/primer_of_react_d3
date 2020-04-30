import React from 'react'
import './App.css'

import MapSample from './MapSample3DArc'

const App: React.FC = () => {
  return (
    <div>
       <MapSample
        mapurl="ne_10m_admin_0_countries_topo.json"
        dataurl="ne_50m_populated_places_topo.json"
        objectsname="countries"
        latitude={139}
        longitude={35}></MapSample>
    </div>
  );
}

export default App;
