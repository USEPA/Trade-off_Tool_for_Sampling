/** @jsx jsx */

import React from 'react';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';
// types
import { EditsType } from 'types/Edits';
import { LayerType, UrlLayerType } from 'types/Layer';
// config
import { polygonSymbol } from 'config/symbols';

// Saves data to session storage
function writeToStorage(key: string, data: any) {
  const itemSize = Math.round(JSON.stringify(data).length / 1024);

  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    const storageSize = Math.round(
      JSON.stringify(sessionStorage).length / 1024,
    );
    const message = `LIMIT REACHED: New storage size would be ${itemSize}K up from ${storageSize}K already in storage`;
    alert(message);
    console.log(message);
    console.error(e);
  }
}

// Reads data from session storage
function readFromStorage(key: string) {
  return sessionStorage.getItem(key);
}

export function useSessionStorage() {
  const {
    CSVLayer,
    FeatureLayer,
    Field,
    geometryJsonUtils,
    GeoRSSLayer,
    Graphic,
    GraphicsLayer,
    KMLLayer,
    Layer,
    Polygon,
    PortalItem,
    rendererJsonUtils,
    WMSLayer,
  } = useEsriModulesContext();
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    map,
    portalLayers,
    setPortalLayers,
    referenceLayers,
    setReferenceLayers,
    urlLayers,
    setUrlLayers,
  } = React.useContext(SketchContext);

  // Retreives edit data from session storage when the app loads
  const [localStorageInitialized, setLocalStorageInitialized] = React.useState(
    false,
  );
  React.useEffect(() => {
    if (!map || !setEdits || !setLayers || localStorageInitialized) return;

    setLocalStorageInitialized(true);
    const editsStr = readFromStorage('tots_edits');
    if (!editsStr) return;

    const edits: EditsType = JSON.parse(editsStr);
    setEdits(edits);

    const newLayers: LayerType[] = [];
    const graphicsLayers: __esri.GraphicsLayer[] = [];
    edits.edits.forEach((editsLayer) => {
      const sketchLayer = new GraphicsLayer({
        title: editsLayer.name,
        id: editsLayer.layerId,
      });

      const features: __esri.Graphic[] = [];
      const displayedFeatures = [...editsLayer.adds, ...editsLayer.updates];
      // add graphics to the map
      displayedFeatures.forEach((graphic) => {
        features.push(
          new Graphic({
            attributes: graphic.attributes,
            symbol: polygonSymbol,
            geometry: new Polygon({
              spatialReference: {
                wkid: 102100,
              },
              rings: graphic.geometry.rings,
            }),
          }),
        );
      });
      sketchLayer.addMany(features);
      graphicsLayers.push(sketchLayer);

      newLayers.push({
        id: editsLayer.id,
        layerId: editsLayer.layerId,
        value: `${editsLayer.id} - ${editsLayer.name} - from session`,
        name: editsLayer.name,
        label: editsLayer.name,
        layerType: editsLayer.layerType,
        addedFrom: editsLayer.addedFrom,
        defaultVisibility: true,
        geometryType: 'esriGeometryPolygon',
        sketchLayer,
      });
    });

    if (newLayers.length > 0) {
      setLayers([...layers, ...newLayers]);
      map.addMany(graphicsLayers);
    }
  }, [
    Graphic,
    GraphicsLayer,
    Polygon,
    setEdits,
    setLayers,
    layers,
    localStorageInitialized,
    map,
  ]);

  // Saves the edits to session storage everytime they change
  React.useEffect(() => {
    if (!localStorageInitialized) return;
    writeToStorage('tots_edits', edits);
  }, [edits, localStorageInitialized]);

  // Retreives portal layers from session storage when the app loads
  const [
    localPortalLayerInitialized,
    setLocalPortalLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!map || !setPortalLayers || localPortalLayerInitialized) return;

    setLocalPortalLayerInitialized(true);
    const portalLayersStr = readFromStorage('tots_portal_layers');
    if (!portalLayersStr) return;

    const portalLayers = JSON.parse(portalLayersStr);

    // add the portal layers to the map
    portalLayers.forEach((layerId: string) => {
      const layer = Layer.fromPortalItem({
        portalItem: new PortalItem({
          id: layerId,
        }),
      });
      map.add(layer);
    });

    setPortalLayers(portalLayers);
  }, [
    Layer,
    PortalItem,
    localPortalLayerInitialized,
    map,
    portalLayers,
    setPortalLayers,
  ]);

  // Saves the portal layers to session storage everytime they change
  React.useEffect(() => {
    if (!localPortalLayerInitialized) return;
    writeToStorage('tots_portal_layers', portalLayers);
  }, [portalLayers, localPortalLayerInitialized]);

  // Retreives url layers from session storage when the app loads
  const [
    localUrlLayerInitialized,
    setLocalUrlLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!map || !setUrlLayers || localUrlLayerInitialized) return;

    setLocalUrlLayerInitialized(true);
    const urlLayersStr = readFromStorage('tots_url_layers');
    if (!urlLayersStr) return;

    const urlLayers: UrlLayerType[] = JSON.parse(urlLayersStr);

    // add the portal layers to the map
    urlLayers.forEach((urlLayer) => {
      const type = urlLayer.type;
      const url = urlLayer.url;

      let layer;
      if (type === 'ArcGIS') {
        layer = Layer.fromArcGISServerUrl({ url });
      }
      if (type === 'WMS') {
        layer = new WMSLayer({ url });
      }
      /* // not supported in 4.x js api
      if(type === 'WFS') {
        layer = new WFSLayer({ url });
      } */
      if (type === 'KML') {
        layer = new KMLLayer({ url });
      }
      if (type === 'GeoRSS') {
        layer = new GeoRSSLayer({ url });
      }
      if (type === 'CSV') {
        layer = new CSVLayer({ url });
      }

      // add the layer if isn't null
      if (layer) {
        map.add(layer);

        const urlLayer = { url, type };
        setUrlLayers([...urlLayers, urlLayer]);
      }
    });

    setUrlLayers(urlLayers);
  }, [
    // Esri Modules
    CSVLayer,
    GeoRSSLayer,
    KMLLayer,
    Layer,
    WMSLayer,

    localUrlLayerInitialized,
    map,
    setUrlLayers,
  ]);

  // Saves the url layers to session storage everytime they change
  React.useEffect(() => {
    if (!localUrlLayerInitialized) return;
    writeToStorage('tots_url_layers', urlLayers);
  }, [urlLayers, localUrlLayerInitialized]);

  // Retreives reference layers from session storage when the app loads
  const [
    localReferenceLayerInitialized,
    setLocalReferenceLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!map || !setReferenceLayers || localReferenceLayerInitialized) return;

    setLocalReferenceLayerInitialized(true);
    const referenceLayersStr = readFromStorage('tots_reference_layers');
    if (!referenceLayersStr) return;

    const referenceLayers = JSON.parse(referenceLayersStr);

    // add the portal layers to the map
    const layersToAdd: __esri.FeatureLayer[] = [];
    referenceLayers.forEach((layer: any) => {
      const fields: __esri.Field[] = [];
      layer.fields.forEach((field: __esri.Field) => {
        fields.push(Field.fromJSON(field));
      });

      const source: any[] = [];
      layer.source.forEach((feature: any) => {
        source.push({
          attributes: feature.attributes,
          geometry: geometryJsonUtils.fromJSON(feature.geometry),
          popupTemplate: feature.popupTemplate,
          symbol: feature.symbol,
        });
      });

      const layerProps = {
        fields,
        source,
        id: layer.layerId,
        objectIdField: layer.objectIdField,
        outFields: layer.outFields,
        title: layer.title,
        renderer: rendererJsonUtils.fromJSON(layer.renderer),
        popupTemplate: layer.popupTemplate,
      };

      layersToAdd.push(new FeatureLayer(layerProps));
    });

    map.addMany(layersToAdd);
    setReferenceLayers(referenceLayers);
  }, [
    FeatureLayer,
    Field,
    geometryJsonUtils,
    localReferenceLayerInitialized,
    map,
    rendererJsonUtils,
    setReferenceLayers,
  ]);

  // Saves the reference layers to session storage everytime they change
  React.useEffect(() => {
    if (!localReferenceLayerInitialized) return;
    writeToStorage('tots_reference_layers', referenceLayers);
  }, [referenceLayers, localReferenceLayerInitialized]);
}
