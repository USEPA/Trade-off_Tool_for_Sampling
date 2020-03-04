/** @jsx jsx */

import React from 'react';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { CalculateContext } from 'contexts/Calculate';
import { SketchContext } from 'contexts/Sketch';
// types
import {
  CalculateResultsType,
  CalculateResultsDataType,
} from 'types/CalculateResults';
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

// Saves/Retrieves data to session storage
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
                wkid: 3857,
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
        scenarioName: editsLayer.scenarioName,
        scenarioDescription: editsLayer.scenarioDescription,
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

// Runs sampling plan calculations whenever the
// samples change or the variables on the calculate tab
// change.
export function useCalculatePlan() {
  const {
    geometryEngine,
    Polygon,
    projection,
    webMercatorUtils,
  } = useEsriModulesContext();
  const { edits, sketchLayer } = React.useContext(SketchContext);
  const {
    numLabs,
    numLabHours,
    numSamplingHours,
    numSamplingPersonnel,
    numSamplingShifts,
    numSamplingTeams,
    samplingLaborCost,
    surfaceArea,
    setCalculateResults,
  } = React.useContext(CalculateContext);

  // Load the esri projection module. This needs
  // to happen before the projection module will work.
  const [
    loadedProjection,
    setLoadedProjection, //
  ] = React.useState<__esri.projection | null>(null);
  React.useEffect(() => {
    projection.load().then(() => {
      setLoadedProjection(projection);
    });
  });

  // Reset the calculateResults context variable, whenever anything
  // changes that will cause a re-calculation.
  React.useEffect(() => {
    if (!sketchLayer?.sketchLayer) {
      setCalculateResults({ status: 'none', panelOpen: false, data: null });
      return;
    }

    setCalculateResults((calculateResults: CalculateResultsType) => {
      return {
        status: 'fetching',
        panelOpen: calculateResults.panelOpen,
        data: null,
      };
    });
  }, [
    edits,
    sketchLayer,
    numLabs,
    numLabHours,
    numSamplingHours,
    numSamplingPersonnel,
    numSamplingShifts,
    numSamplingTeams,
    samplingLaborCost,
    surfaceArea,
    setCalculateResults,
  ]);

  const [calcGraphics, setCalcGraphics] = React.useState<__esri.Graphic[]>([]);
  const [totalArea, setTotalArea] = React.useState(0);

  // perform geospatial calculatations
  React.useEffect(() => {
    // exit early checks
    if (!loadedProjection) return;
    if (!sketchLayer?.sketchLayer || edits.count === 0) return;
    if (sketchLayer.sketchLayer.type !== 'graphics') return;

    // caluclate the area for graphics
    let totalAreaSquareInches = 0;
    let totalAreaSquereFeet = 0;
    const calcGraphics: __esri.Graphic[] = [];
    sketchLayer.sketchLayer.graphics.forEach((graphic) => {
      const calcGraphic = graphic;

      // convert the geometry to WGS84 for geometryEngine
      const wgsGeometry = webMercatorUtils.webMercatorToGeographic(
        graphic.geometry,
      );

      // get the polygon object
      const geometry = geometryEngine.simplify(wgsGeometry) as __esri.Polygon;
      if (!geometry) return;

      const polygon = new Polygon({ rings: geometry.rings });

      // calulate the area
      const areaSI = geometryEngine.geodesicArea(polygon, 109454);
      totalAreaSquareInches = totalAreaSquareInches + areaSI;
      calcGraphic.attributes.AA = areaSI;

      // convert area to square inches
      const areaSF = areaSI * 0.00694444;
      totalAreaSquereFeet = totalAreaSquereFeet + areaSF;

      // calculate AC
      const { SA, AA } = calcGraphic.attributes;
      if (AA < SA) {
        calcGraphic.attributes.AC = 1;
      } else {
        calcGraphic.attributes.AC = Math.round(AA / SA);
      }

      // multiply all of the attributes by the area
      const {
        TTPK,
        TTC,
        TTA,
        TTPS,
        MCPS,
        TCPS,
        WVPS,
        WWPS,
        ALC,
        AMC,
        AC,
      } = calcGraphic.attributes;
      calcGraphic.attributes.TTPK = TTPK * AC;
      calcGraphic.attributes.TTC = TTC * AC;
      calcGraphic.attributes.TTA = TTA * AC;
      calcGraphic.attributes.TTPS = TTPS * AC;
      calcGraphic.attributes.MCPS = MCPS * AC;
      calcGraphic.attributes.TCPS = TCPS * AC;
      calcGraphic.attributes.WVPS = WVPS * AC;
      calcGraphic.attributes.WWPS = WWPS * AC;
      calcGraphic.attributes.ALC = ALC * AC;
      calcGraphic.attributes.AMC = AMC * AC;

      calcGraphics.push(calcGraphic);
    });

    setCalcGraphics(calcGraphics);
    setTotalArea(totalAreaSquereFeet);
  }, [
    // esri modules
    geometryEngine,
    loadedProjection,
    Polygon,
    webMercatorUtils,

    // TOTS items
    edits,
    sketchLayer,
  ]);

  // perform non-geospatial calculations
  React.useEffect(() => {
    // exit early checks
    if (calcGraphics.length === 0 || totalArea === 0) return;

    let ttpk_total = 0;
    let ttc_total = 0;
    let tta_total = 0;
    let ttps_total = 0;
    let lod_p_total = 0;
    let lod_non_total = 0;
    let mcps_total = 0;
    let tcps_total = 0;
    let wvps_total = 0;
    let wwps_total = 0;
    let sa_total = 0;
    let alc_total = 0;
    let amc_total = 0;
    let ac_total = 0;

    // get the totals for each attribute
    calcGraphics.forEach((graphic) => {
      const attributes = graphic.attributes;
      if (attributes.TTPK) {
        ttpk_total = ttpk_total + Number(attributes.TTPK);
      }
      if (attributes.TTC) {
        ttc_total = ttc_total + Number(attributes.TTC);
      }
      if (attributes.TTA) {
        tta_total = tta_total + Number(attributes.TTA);
      }
      if (attributes.TTPS) {
        ttps_total = ttps_total + Number(attributes.TTPS);
      }
      if (attributes.LOD_P) {
        lod_p_total = lod_p_total + Number(attributes.LOD_P);
      }
      if (attributes.LOD_NON) {
        lod_non_total = lod_non_total + Number(attributes.LOD_NON);
      }
      if (attributes.MCPS) {
        mcps_total = mcps_total + Number(attributes.MCPS);
      }
      if (attributes.TCPS) {
        tcps_total = tcps_total + Number(attributes.TCPS);
      }
      if (attributes.WVPS) {
        wvps_total = wvps_total + Number(attributes.WVPS);
      }
      if (attributes.WWPS) {
        wwps_total = wwps_total + Number(attributes.WWPS);
      }
      if (attributes.SA) {
        sa_total = sa_total + Number(attributes.SA);
      }
      if (attributes.ALC) {
        alc_total = alc_total + Number(attributes.ALC);
      }
      if (attributes.AMC) {
        amc_total = amc_total + Number(attributes.AMC);
      }
      if (attributes.AC) {
        ac_total = ac_total + Number(attributes.AC);
      }
    });

    // calculate spatial items
    let userSpecifiedAOI = null;
    let percentAreaSampled = null;
    if (surfaceArea > 0) {
      userSpecifiedAOI = surfaceArea;
      percentAreaSampled = (totalArea / surfaceArea) * 100;
    }

    // calculate the sampling items
    const samplingHours =
      numSamplingTeams * numSamplingHours * numSamplingShifts;
    const samplingPersonnelHoursPerDay = samplingHours * numSamplingPersonnel;
    const samplingPersonnelLaborCost = samplingLaborCost / numSamplingPersonnel;
    const timeCompleteSampling = (ttc_total + ttpk_total) / samplingHours;
    const totalSamplingLaborCost =
      numSamplingTeams *
      numSamplingPersonnel *
      numSamplingHours *
      numSamplingShifts *
      samplingPersonnelLaborCost *
      timeCompleteSampling;

    // calculate lab throughput
    const totalLabHours = numLabs * numLabHours;
    const labThroughput = tta_total / totalLabHours;

    // calculate total cost and time
    const totalCost =
      totalSamplingLaborCost + mcps_total + alc_total + amc_total;

    // Calculate total time. Note: Total Time is the greater of sample collection time or Analysis Total Time.
    // If Analysis Time is equal to or greater than Sampling Total Time then the value reported is total Analysis Time Plus one day.
    // The one day accounts for the time samples get collected and shipped to the lab on day one of the sampling response.
    let totalTime = 0;
    if (labThroughput < timeCompleteSampling) {
      totalTime = timeCompleteSampling;
    } else {
      totalTime = labThroughput + 1;
    }

    // Get limiting time factor (will be undefined if they are equal)
    let limitingFactor: CalculateResultsDataType['Limiting Time Factor'] = '';
    if (timeCompleteSampling > labThroughput) {
      limitingFactor = 'Sampling';
    }
    if (timeCompleteSampling < labThroughput) {
      limitingFactor = 'Analysis';
    }

    const resultObject: CalculateResultsDataType = {
      // assign input parameters
      'User Specified Number of Available Teams for Sampling': numSamplingTeams,
      'User Specified Personnel per Sampling Team': numSamplingPersonnel,
      'User Specified Sampling Team Hours per Shift': numSamplingHours,
      'User Specified Sampling Team Shifts per Day': numSamplingShifts,
      'User Specified Sampling Team Labor Cost': samplingLaborCost,
      'User Specified Number of Available Labs for Analysis': numLabs,
      'User Specified Analysis Lab Hours per Day': numLabHours,
      'Total Number of User-Defined Samples': calcGraphics.length,

      // assign counts
      'Total Number of Samples': ac_total,
      'Total Sampled Area': totalArea,
      'Time to Prepare Kits': ttpk_total,
      'Time to Collect': ttc_total,
      'Material Cost': mcps_total,
      'Time to Analyze': tta_total,
      'Analysis Labor Cost': alc_total,
      'Analysis Material Cost': amc_total,
      'Waste Volume': wvps_total,
      'Waste Weight': wwps_total,

      // spatial items
      'User Specified Total AOI': userSpecifiedAOI,
      'Percent of Area Sampled': percentAreaSampled,

      // sampling
      'Sampling Hours per Day': samplingHours,
      'Sampling Personnel hours per Day': samplingPersonnelHoursPerDay,
      'Sampling Personnel Labor Cost': samplingPersonnelLaborCost,
      'Time to Complete Sampling': timeCompleteSampling,
      'Total Sampling Labor Cost': totalSamplingLaborCost,

      // analysis
      'Time to Complete Analyses': labThroughput,

      //totals
      'Total Cost': totalCost,
      'Total Time': totalTime,
      'Limiting Time Factor': limitingFactor,
    };

    console.log('resultObject: ', resultObject);

    // display loading spinner for 1 second
    setTimeout(() => {
      setCalculateResults((calculateResults: CalculateResultsType) => {
        return {
          status: 'success',
          panelOpen: calculateResults.panelOpen,
          data: resultObject,
        };
      });
    }, 1000);
  }, [
    calcGraphics,
    totalArea,
    numLabs,
    numLabHours,
    numSamplingHours,
    numSamplingPersonnel,
    numSamplingShifts,
    numSamplingTeams,
    samplingLaborCost,
    surfaceArea,
    setCalculateResults,
  ]);
}
