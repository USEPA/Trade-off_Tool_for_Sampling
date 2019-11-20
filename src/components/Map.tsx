/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import { loadModules } from 'esri-loader';

// map types from @types/arcgis-js-api to our use of esri-loader's loadModules
type EsriModules = [
  typeof import('esri/Map'),
  typeof import('esri/views/MapView'),
];

const mapStyles = css`
  height: 100%;
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

  return <div ref={mapRef} css={mapStyles} />;
}

export default Map;
