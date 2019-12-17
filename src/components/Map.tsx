/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import MapWidgets from 'components/MapWidgets';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';

const mapStyles = css`
  height: 100%;
  background-color: whitesmoke;
`;

function Map() {
  const mapRef = React.useRef<HTMLDivElement>(null);

  const { EsriMap, GraphicsLayer, MapView } = React.useContext(
    EsriModulesContext,
  );

  const [layers, setLayers] = React.useState<any[]>([]);
  React.useEffect(() => {
    if (!GraphicsLayer || layers.length > 0) return;

    const sketchLayer = new GraphicsLayer({
      id: 'sketchLayer',
      title: 'Sketch Layer',
    });

    setLayers([sketchLayer]);
  }, [GraphicsLayer, layers]);

  const [mapView, setMapView] = React.useState<any>(null);
  React.useEffect(() => {
    if (
      !mapRef.current ||
      !EsriMap ||
      !MapView ||
      layers.length === 0 ||
      mapView
    )
      return;

    const map = new EsriMap({
      basemap: 'streets',
      layers,
    });

    const view = new MapView({
      container: mapRef.current,
      map,
      center: [-95, 37],
      zoom: 3,
    });
    setMapView(view);
  }, [EsriMap, MapView, mapView, layers]);

  return (
    <div ref={mapRef} css={mapStyles}>
      <MapWidgets mapView={mapView} />
    </div>
  );
}

export default Map;
