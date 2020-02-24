/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import MapWidgets from 'components/MapWidgets';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';

// --- styles (Map) ---
const mapStyles = (height: number) => {
  return css`
    height: calc(100% - ${height}px);
    background-color: whitesmoke;
  `;
};

// --- components (Map) ---
type Props = {
  height: number;
};

function Map({ height }: Props) {
  const {
    EsriMap,
    // GraphicsLayer,
    MapView,
    Viewpoint,
  } = useEsriModulesContext();

  const mapRef = React.useRef<HTMLDivElement>(null);

  const {
    homeWidget,
    // layers,
    // setLayers,
    map,
    setMap,
    mapView,
    setMapView,
    sketchLayer,
    // setSketchLayer,
  } = React.useContext(SketchContext);

  // Creates the map and view
  React.useEffect(() => {
    if (!mapRef.current) return;
    if (mapView) return;

    const newMap = new EsriMap({
      basemap: 'streets',
      layers: [],
    });
    setMap(newMap);

    const view = new MapView({
      container: mapRef.current,
      map: newMap,
      center: [-95, 37],
      zoom: 3,
      popup: {
        defaultPopupTemplateEnabled: true,
      },
    });

    setMapView(view);
  }, [EsriMap, MapView, mapView, setMap, setMapView]);

  // Creates a watch event that is used for reordering the layers
  const [watchInitialized, setWatchInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!map || watchInitialized) return;

    // whenever layers are added, reorder them
    map.layers.on(
      'change',
      ({ target, added }: { target: any; added: any[] }) => {
        if (added.length === 0) return;

        const graphicsLayers: __esri.GraphicsLayer[] = [];
        const featureLayers: __esri.FeatureLayer[] = [];
        const imageryLayers: any[] = [];
        const otherLayers: any[] = [];

        target.items.forEach((layer: any) => {
          const { type } = layer;
          const imageryTypes = ['imagery', 'tile', 'vector-tile'];

          if (type === 'graphics') {
            graphicsLayers.push(layer);
          } else if (type === 'feature') {
            featureLayers.push(layer);
          } else if (imageryTypes.includes(type)) {
            imageryLayers.push(layer);
          } else {
            otherLayers.push(layer);
          }
        });

        // the layers are ordered as follows:
        // graphicsLayers (top)
        // featureLayers
        // otherLayers
        // imageryLayers (bottom)
        map.layers = [
          ...imageryLayers,
          ...otherLayers,
          ...featureLayers,
          ...graphicsLayers,
        ];
      },
    );

    setWatchInitialized(true);
  }, [map, watchInitialized]);

  // Zooms to the graphics whenever the sketchLayer changes
  React.useEffect(() => {
    if (!map || !mapView || !homeWidget) return;
    if (!sketchLayer || !sketchLayer.sketchLayer) return;

    const zoomGraphics = sketchLayer.sketchLayer.graphics.items;

    if (zoomGraphics.length > 0) {
      mapView.goTo(zoomGraphics).then(() => {
        // set map zoom and home widget's viewpoint
        homeWidget.viewpoint = new Viewpoint({
          targetGeometry: mapView.extent,
        });
      });
    }
  }, [map, mapView, sketchLayer, homeWidget, Viewpoint]);

  return (
    <div ref={mapRef} css={mapStyles(height)} data-testid="tots-map">
      {mapView && <MapWidgets mapView={mapView} />}
    </div>
  );
}

export default Map;
