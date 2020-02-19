/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import MapWidgets from 'components/MapWidgets';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';

const mapStyles = css`
  height: 100%;
  background-color: whitesmoke;
`;

function Map() {
  const { EsriMap, GraphicsLayer, MapView } = useEsriModulesContext();

  const mapRef = React.useRef<HTMLDivElement>(null);

  const [layers, setLayers] = React.useState<__esri.GraphicsLayer[]>([]);

  React.useEffect(() => {
    if (layers.length > 0) return;

    const sketchLayer = new GraphicsLayer({
      id: 'sketchLayer',
      title: 'Sketch Layer',
    });

    setLayers([sketchLayer]);
  }, [GraphicsLayer, layers]);

  const [mapView, setMapView] = React.useState<__esri.MapView | null>(null);

  React.useEffect(() => {
    if (!mapRef.current) return;
    if (layers.length === 0) return;
    if (mapView) return;

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
  }, [EsriMap, MapView, layers, mapView]);

  return (
    <div ref={mapRef} css={mapStyles}>
      {mapView && <MapWidgets mapView={mapView} />}
    </div>
  );
}

export default Map;
