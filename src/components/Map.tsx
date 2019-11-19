import React from 'react';
import styled from '@emotion/styled/macro';
import { loadModules } from 'esri-loader';

// map types from @types/arcgis-js-api to our use of esri-loader's loadModules
type EsriModules = [
  typeof import('esri/Map'),
  typeof import('esri/views/MapView'),
];

const MapContainer = styled.div`
  border: 1px solid #ccc;
  border-top: none;
  height: 400px;
  background-color: whitesmoke;
`;

function Map() {
  const mapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    (loadModules(['esri/Map', 'esri/views/MapView'], {
      version: '4.13',
      css: true,
    }) as Promise<EsriModules>)
      .then(([EsriMap, MapView]) => {
        if (!mapRef.current) return;

        const map = new EsriMap({
          basemap: 'gray-vector',
        });

        new MapView({
          container: mapRef.current,
          map,
          center: [-95, 37],
          zoom: 3,
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return <MapContainer ref={mapRef} />;
}

export default Map;
