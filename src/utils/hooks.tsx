/** @jsx jsx */

import React from 'react';
import ReactDOM from 'react-dom';
import { jsx } from '@emotion/core';
// components
import MapPopup from 'components/MapPopup';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { CalculateContext } from 'contexts/Calculate';
import { DialogContext, AlertDialogOptions } from 'contexts/Dialog';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import {
  CalculateResultsType,
  CalculateResultsDataType,
} from 'types/CalculateResults';
import {
  EditsType,
  FeatureEditsType,
  LayerEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import {
  FieldInfos,
  LayerType,
  LayerTypeName,
  PortalLayerType,
  UrlLayerType,
} from 'types/Layer';
// config
import { PanelValueType } from 'config/navigation';
// utils
import { findLayerInEdits, updateLayerEdits } from 'utils/sketchUtils';
import { GoToOptions } from 'types/Navigation';
import {
  UserDefinedAttributes,
  SampleSelectType,
  sampleAttributes,
} from 'config/sampleAttributes';

// Saves data to session storage
export async function writeToStorage(
  key: string,
  data: string | boolean | object,
  setOptions: React.Dispatch<React.SetStateAction<AlertDialogOptions | null>>,
) {
  const itemSize = Math.round(JSON.stringify(data).length / 1024);

  try {
    if (typeof data === 'string') sessionStorage.setItem(key, data);
    else sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    const storageSize = Math.round(
      JSON.stringify(sessionStorage).length / 1024,
    );
    const message = `New storage size would be ${
      storageSize + itemSize
    }K up from ${storageSize}K already in storage`;
    console.error(e);

    setOptions({
      title: 'Session Storage Limit Reached',
      ariaLabel: 'Session Storage Limit Reached',
      description: message,
    });
  }
}

// Reads data from session storage
export function readFromStorage(key: string) {
  return sessionStorage.getItem(key);
}

// Finds the layer by the layer id
function getLayerById(layers: LayerType[], id: string) {
  const index = layers.findIndex((layer) => layer.layerId === id);
  return layers[index];
}

// Hook that allows the user to easily start over without
// having to manually start a new session.
export function useStartOver() {
  const { Point } = useEsriModulesContext();
  const { resetCalculateContext } = React.useContext(CalculateContext);
  const { setOptions } = React.useContext(DialogContext);
  const {
    setCurrentPanel,
    setGettingStartedOpen,
    setGoTo,
    setGoToOptions,
    setLatestStepIndex,
    setTrainingMode,
  } = React.useContext(NavigationContext);
  const {
    basemapWidget,
    map,
    mapView,
    homeWidget,
    setLayers,
    setEdits,
    setUrlLayers,
    setReferenceLayers,
    setPortalLayers,
    setSelectedScenario,
    setSketchLayer,
    setAoiSketchLayer,
    setUserDefinedAttributes,
    setUserDefinedOptions,
  } = React.useContext(SketchContext);

  function startOver() {
    setSelectedScenario(null);
    setSketchLayer(null);
    setAoiSketchLayer(null);

    // clear the map
    map?.removeAll();

    // set the layers to just the defaults
    setLayers([]);
    setEdits({ count: 0, edits: [] });
    setUrlLayers([]);
    setReferenceLayers([]);
    setPortalLayers([]);
    setUserDefinedAttributes({ editCount: 0, attributes: {} });
    setUserDefinedOptions([]);

    // clear navigation
    setCurrentPanel(null);
    setGoTo('');
    setGoToOptions(null);
    writeToStorage(
      'tots_current_tab',
      { goTo: '', goToOptions: null },
      setOptions,
    );
    setLatestStepIndex(-1);
    setTrainingMode(false);
    setGettingStartedOpen(false);

    // set the calculate settings back to defaults
    resetCalculateContext();

    // reset the zoom
    if (mapView) {
      mapView.center = new Point({ longitude: -95, latitude: 37 });
      mapView.zoom = 3;

      if (homeWidget) {
        homeWidget.viewpoint = mapView.viewpoint;
      }

      if (basemapWidget) {
        // Search for the basemap with the matching portal id
        const portalId = 'f81bc478e12c4f1691d0d7ab6361f5a6';
        let selectedBasemap: __esri.Basemap | null = null;
        basemapWidget.source.basemaps.forEach((basemap) => {
          if (basemap.portalItem.id === portalId) selectedBasemap = basemap;
        });

        // Set the activeBasemap to the basemap that was found
        if (selectedBasemap) basemapWidget.activeBasemap = selectedBasemap;
      }
    }
  }

  return function () {
    setOptions({
      title: 'Would you like to continue?',
      ariaLabel: 'Would you like to continue?',
      description: 'This operation will clear all of your progress so far.',
      onContinue: startOver,
    });
  };
}

// Provides geometry engine related tools
//    calculateArea    - Function for calculating the area of the provided graphic.
//    createBuffer     - Function for creating a square around the center point of
//                       the provided graphic with the provided width.
//    loadedProjection - The esri projection library. Mainly used to test if the
//                       library is ready for use.
export function useGeometryTools() {
  const {
    geometryEngine,
    Polygon,
    projection,
    SpatialReference,
    webMercatorUtils,
  } = useEsriModulesContext();

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

  // Calculates the area of the provided graphic using a
  // spatial reference system based on where the sample is located.
  const calculateArea = React.useCallback(
    (graphic: __esri.Graphic) => {
      if (!loadedProjection) return 'ERROR - Projection library not loaded';

      // convert the geometry to WGS84 for geometryEngine
      // Cast the geometry as a Polygon to avoid typescript errors on
      // accessing the centroid.
      const wgsGeometry = webMercatorUtils.webMercatorToGeographic(
        graphic.geometry,
      ) as __esri.Polygon;

      if (!wgsGeometry) return 'ERROR - WGS Geometry is null';

      // get the spatial reference from the centroid
      const { latitude, longitude } = wgsGeometry.centroid;
      const base_wkid = latitude > 0 ? 32600 : 32700;
      const out_wkid = base_wkid + Math.floor((longitude + 180) / 6) + 1;
      const spatialReference = new SpatialReference({ wkid: out_wkid });

      if (!spatialReference) return 'ERROR - Spatial Reference is null';

      // project the geometry
      const projectedGeometry = loadedProjection.project(
        wgsGeometry,
        spatialReference,
      ) as __esri.Polygon;

      if (!projectedGeometry) return 'ERROR - Projected Geometry is null';

      // calulate the area
      const areaSI = geometryEngine.planarArea(projectedGeometry, 109454);
      return areaSI;
    },
    [geometryEngine, loadedProjection, SpatialReference, webMercatorUtils],
  );

  // Creates a square buffer around the center of the provided graphic,
  // where the width of the sqaure is the provided width.
  const createBuffer = React.useCallback(
    (graphic: __esri.Graphic, width: number) => {
      // create the graphic
      let geometry;
      let center: __esri.Point | null = null;
      if (graphic.geometry.type === 'point') {
        geometry = graphic.geometry as __esri.Point;
        center = geometry;
      }
      if (graphic.geometry.type === 'polygon') {
        geometry = graphic.geometry as __esri.Polygon;
        center = geometry.centroid as __esri.Point;
      }

      if (!center) return;

      // create a circular buffer around the center point
      const halfWidth = width / 2;
      const ptBuff = geometryEngine.geodesicBuffer(
        center,
        halfWidth,
        109009,
      ) as __esri.Polygon;

      // use the extent to make the buffer a square
      graphic.geometry = new Polygon({
        spatialReference: center.spatialReference,
        centroid: center,
        rings: [
          [
            [ptBuff.extent.xmin, ptBuff.extent.ymin],
            [ptBuff.extent.xmin, ptBuff.extent.ymax],
            [ptBuff.extent.xmax, ptBuff.extent.ymax],
            [ptBuff.extent.xmax, ptBuff.extent.ymin],
            [ptBuff.extent.xmin, ptBuff.extent.ymin],
          ],
        ],
      });
    },
    [geometryEngine, Polygon],
  );

  return { calculateArea, createBuffer, loadedProjection };
}

// Runs sampling plan calculations whenever the
// samples change or the variables on the calculate tab
// change.
export function useCalculatePlan() {
  const {
    geometryEngine,
    Polygon,
    SpatialReference,
    webMercatorUtils,
  } = useEsriModulesContext();
  const { edits, layers, selectedScenario } = React.useContext(SketchContext);
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

  const { calculateArea, loadedProjection } = useGeometryTools();

  // Reset the calculateResults context variable, whenever anything
  // changes that will cause a re-calculation.
  const [calcGraphics, setCalcGraphics] = React.useState<__esri.Graphic[]>([]);
  React.useEffect(() => {
    // Get the number of graphics for the selected scenario
    let numGraphics = 0;
    if (selectedScenario && selectedScenario.layers.length > 0) {
      layers.forEach((layer) => {
        if (layer.parentLayer?.id !== selectedScenario.layerId) return;
        if (layer.sketchLayer.type !== 'graphics') return;

        numGraphics += layer.sketchLayer.graphics.length;
      });
    }

    // exit early
    if (!selectedScenario || numGraphics === 0) {
      setCalculateResults({ status: 'none', panelOpen: false, data: null });
      setCalcGraphics([]);
      return;
    }
    if (selectedScenario.editType === 'properties') return;

    // to improve performance, do not perform calculations if
    // only the scenario name/description changed
    const { editsScenario } = findLayerInEdits(
      edits.edits,
      selectedScenario.layerId,
    );
    if (!editsScenario || editsScenario.editType === 'properties') return;

    setCalculateResults((calculateResults: CalculateResultsType) => {
      return {
        status: 'fetching',
        panelOpen: calculateResults.panelOpen,
        data: null,
      };
    });
  }, [
    edits,
    layers,
    selectedScenario,
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

  const [totals, setTotals] = React.useState({
    ttpk: 0,
    ttc: 0,
    tta: 0,
    ttps: 0,
    lod_p: 0,
    lod_non: 0,
    mcps: 0,
    tcps: 0,
    wvps: 0,
    wwps: 0,
    sa: 0,
    alc: 0,
    amc: 0,
    ac: 0,
  });
  const [totalArea, setTotalArea] = React.useState(0);

  // perform geospatial calculatations
  React.useEffect(() => {
    // exit early checks
    if (!loadedProjection) return;
    if (
      !selectedScenario ||
      selectedScenario.layers.length === 0 ||
      edits.count === 0
    ) {
      return;
    }

    // to improve performance, do not perform calculations if
    // only the scenario name/description changed
    if (selectedScenario.editType === 'properties') return;
    const { editsScenario } = findLayerInEdits(
      edits.edits,
      selectedScenario.layerId,
    );
    if (!editsScenario || editsScenario.editType === 'properties') return;

    let ttpk = 0;
    let ttc = 0;
    let tta = 0;
    let ttps = 0;
    let lod_p = 0;
    let lod_non = 0;
    let mcps = 0;
    let tcps = 0;
    let wvps = 0;
    let wwps = 0;
    let sa = 0;
    let alc = 0;
    let amc = 0;
    let ac = 0;

    // caluclate the area for graphics for the selected scenario
    let totalAreaSquereFeet = 0;
    const calcGraphics: __esri.Graphic[] = [];
    layers.forEach((layer) => {
      if (
        layer.parentLayer?.id !== selectedScenario.layerId ||
        layer.sketchLayer.type !== 'graphics'
      ) {
        return;
      }

      layer.sketchLayer.graphics.forEach((graphic) => {
        const calcGraphic = graphic.clone();

        // calculate the area using the custom hook
        const areaSI = calculateArea(graphic);
        if (typeof areaSI !== 'number') {
          return;
        }

        // convert area to square feet
        const areaSF = areaSI * 0.00694444;
        totalAreaSquereFeet = totalAreaSquereFeet + areaSF;

        // Get the number of reference surface areas that are in the actual area.
        // This is to prevent users from cheating the system by drawing larger shapes
        // then the reference surface area and it only getting counted as "1" sample.
        const { SA } = calcGraphic.attributes;
        let areaCount = 1;
        if (areaSI >= SA) {
          areaCount = Math.round(areaSI / SA);
        }

        // set the AA on the original graphic, so it is visible in the popup
        graphic.setAttribute('AA', Math.round(areaSI));
        graphic.setAttribute('AC', areaCount);

        // multiply all of the attributes by the area
        const {
          TTPK,
          TTC,
          TTA,
          TTPS,
          LOD_P,
          LOD_NON,
          MCPS,
          TCPS,
          WVPS,
          WWPS,
          ALC,
          AMC,
        } = calcGraphic.attributes;

        if (TTPK) {
          ttpk = ttpk + Number(TTPK) * areaCount;
        }
        if (TTC) {
          ttc = ttc + Number(TTC) * areaCount;
        }
        if (TTA) {
          tta = tta + Number(TTA) * areaCount;
        }
        if (TTPS) {
          ttps = ttps + Number(TTPS) * areaCount;
        }
        if (LOD_P) {
          lod_p = lod_p + Number(LOD_P);
        }
        if (LOD_NON) {
          lod_non = lod_non + Number(LOD_NON);
        }
        if (MCPS) {
          mcps = mcps + Number(MCPS) * areaCount;
        }
        if (TCPS) {
          tcps = tcps + Number(TCPS) * areaCount;
        }
        if (WVPS) {
          wvps = wvps + Number(WVPS) * areaCount;
        }
        if (WWPS) {
          wwps = wwps + Number(WWPS) * areaCount;
        }
        if (SA) {
          sa = sa + Number(SA);
        }
        if (ALC) {
          alc = alc + Number(ALC) * areaCount;
        }
        if (AMC) {
          amc = amc + Number(AMC) * areaCount;
        }
        if (areaCount) {
          ac = ac + Number(areaCount);
        }

        calcGraphics.push(calcGraphic);
      });
    });

    setTotals({
      ttpk,
      ttc,
      tta,
      ttps,
      lod_p,
      lod_non,
      mcps,
      tcps,
      wvps,
      wwps,
      sa,
      alc,
      amc,
      ac,
    });
    setCalcGraphics(calcGraphics);
    setTotalArea(totalAreaSquereFeet);
  }, [
    // esri modules
    geometryEngine,
    loadedProjection,
    Polygon,
    SpatialReference,
    webMercatorUtils,

    // TOTS items
    edits,
    layers,
    selectedScenario,
    calculateArea,
  ]);

  // perform non-geospatial calculations
  React.useEffect(() => {
    // exit early checks
    if (calcGraphics.length === 0 || totalArea === 0) {
      setCalculateResults({ status: 'none', panelOpen: false, data: null });
      return;
    }

    // calculate spatial items
    let userSpecifiedAOI = null;
    let percentAreaSampled = null;
    if (surfaceArea > 0) {
      userSpecifiedAOI = surfaceArea;
      percentAreaSampled = (totalArea / surfaceArea) * 100;
    }

    // calculate the sampling items
    const samplingTimeHours = totals.ttpk + totals.ttc;
    const samplingHours =
      numSamplingTeams * numSamplingHours * numSamplingShifts;
    const samplingPersonnelHoursPerDay = samplingHours * numSamplingPersonnel;
    const samplingPersonnelLaborCost = samplingLaborCost / numSamplingPersonnel;
    const timeCompleteSampling = (totals.ttc + totals.ttpk) / samplingHours;
    const totalSamplingLaborCost =
      numSamplingTeams *
      numSamplingPersonnel *
      numSamplingHours *
      numSamplingShifts *
      samplingPersonnelLaborCost *
      timeCompleteSampling;

    // calculate lab throughput
    const totalLabHours = numLabs * numLabHours;
    let labThroughput = totals.tta / totalLabHours;

    // calculate total cost and time
    const totalCost =
      totalSamplingLaborCost + totals.mcps + totals.alc + totals.amc;

    // Calculate total time. Note: Total Time is the greater of sample collection time or Analysis Total Time.
    // If Analysis Time is equal to or greater than Sampling Total Time then the value reported is total Analysis Time Plus one day.
    // The one day accounts for the time samples get collected and shipped to the lab on day one of the sampling response.
    let totalTime = 0;
    if (labThroughput + 1 < timeCompleteSampling) {
      totalTime = timeCompleteSampling;
    } else {
      totalTime = labThroughput + 1;
    }

    // Get limiting time factor (will be undefined if they are equal)
    let limitingFactor: CalculateResultsDataType['Limiting Time Factor'] = '';
    if (timeCompleteSampling > labThroughput) {
      limitingFactor = 'Sampling';
    } else {
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
      'User Specified Surface Area': surfaceArea,
      'Total Number of User-Defined Samples': calcGraphics.length,

      // assign counts
      'Total Number of Samples': totals.ac,
      'Total Sampled Area': totalArea,
      'Time to Prepare Kits': totals.ttpk,
      'Time to Collect': totals.ttc,
      'Sampling Material Cost': totals.mcps,
      'Time to Analyze': totals.tta,
      'Analysis Labor Cost': totals.alc,
      'Analysis Material Cost': totals.amc,
      'Waste Volume': totals.wvps,
      'Waste Weight': totals.wwps,

      // spatial items
      'User Specified Total AOI': userSpecifiedAOI,
      'Percent of Area Sampled': percentAreaSampled,

      // sampling
      'Total Required Sampling Time': samplingTimeHours,
      'Sampling Hours per Day': samplingHours,
      'Sampling Personnel hours per Day': samplingPersonnelHoursPerDay,
      'Sampling Personnel Labor Cost': samplingPersonnelLaborCost,
      'Time to Complete Sampling': timeCompleteSampling,
      'Total Sampling Labor Cost': totalSamplingLaborCost,

      // analysis
      'Time to Complete Analyses': labThroughput,

      //totals
      'Total Cost': totalCost,
      'Total Time': Math.round(totalTime * 10) / 10,
      'Limiting Time Factor': limitingFactor,
    };

    // display loading spinner for 1 second
    setCalculateResults((calculateResults: CalculateResultsType) => {
      return {
        status: 'success',
        panelOpen: calculateResults.panelOpen,
        data: resultObject,
      };
    });
  }, [
    calcGraphics,
    totals,
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

// Allows using a dynamicPopup that has access to react state/context.
// This is primarily needed for sample popups.
export function useDynamicPopup() {
  const { Collection } = useEsriModulesContext();
  const { edits, setEdits, layers } = React.useContext(SketchContext);

  // Makes all sketch buttons no longer active by removing
  // the sketch-button-selected class.
  function deactivateButtons() {
    const buttons = document.querySelectorAll('.sketch-button');

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].classList.remove('sketch-button-selected');
    }
  }

  // handles the sketch button clicks
  const handleClick = (
    ev: React.MouseEvent<HTMLElement>,
    feature: any,
    type: string,
    newLayer: LayerType | null = null,
  ) => {
    if (!feature?.graphic) return;

    // set the clicked button as active until the drawing is complete
    deactivateButtons();

    const target = ev.target as HTMLElement;
    target.classList.add('sketch-button-selected');

    const changes = new Collection<__esri.Graphic>();

    // find the layer
    const tempGraphic = feature.graphic;
    const tempLayer = tempGraphic.layer as __esri.GraphicsLayer;
    const tempSketchLayer = layers.find(
      (layer) => layer.layerId === tempLayer.id,
    );
    if (!tempSketchLayer || tempSketchLayer.sketchLayer.type !== 'graphics') {
      return;
    }

    // find the graphic
    const graphic: __esri.Graphic = tempSketchLayer.sketchLayer.graphics.find(
      (item) =>
        item.attributes.PERMANENT_IDENTIFIER ===
        tempGraphic.attributes.PERMANENT_IDENTIFIER,
    );
    graphic.attributes = tempGraphic.attributes;

    if (type === 'Save') {
      changes.add(graphic);

      // make a copy of the edits context variable
      const editsCopy = updateLayerEdits({
        edits,
        layer: tempSketchLayer,
        type: 'update',
        changes,
      });

      setEdits(editsCopy);
    }
    if (type === 'Move' && newLayer) {
      // get items from sketch view model
      graphic.attributes.DECISIONUNITUUID = newLayer.uuid;
      graphic.attributes.DECISIONUNIT = newLayer.label;
      changes.add(graphic);

      // add the graphics to move to the new layer
      let editsCopy = updateLayerEdits({
        edits,
        layer: newLayer,
        type: 'add',
        changes,
      });

      // remove the graphics from the old layer
      editsCopy = updateLayerEdits({
        edits: editsCopy,
        layer: tempSketchLayer,
        type: 'delete',
        changes,
      });
      setEdits(editsCopy);

      // move between layers on map
      const tempNewLayer = newLayer.sketchLayer as __esri.GraphicsLayer;
      tempNewLayer.addMany(changes.toArray());
      tempSketchLayer.sketchLayer.remove(graphic);
    }
  };

  // Gets the sample popup with controls
  const getSampleTemplate = (feature: any, fieldInfos: FieldInfos) => {
    const content = (
      <MapPopup
        feature={feature}
        selectedGraphicsIds={[feature.graphic.attributes.PERMANENT_IDENTIFIER]}
        edits={edits}
        layers={layers}
        fieldInfos={fieldInfos}
        onClick={handleClick}
      />
    );

    // wrap the content for esri
    const contentContainer = document.createElement('div');
    ReactDOM.render(content, contentContainer);

    return contentContainer;
  };

  /**
   * Creates a popup that contains all of the attributes with human readable labels.
   * The attributes displayed depends on the type provided.
   * Note: Reference layers will return an empty object. Reference layers should not use
   *  this function for getting the popup.
   *
   * @param type - The layer type to get the popup for.
   * @param includeContaminationFields - If true the contamination map fields will be included in the samples popups.
   * @returns the json object or function to pass to the Esri PopupTemplate constructor.
   */
  return function getPopupTemplate(
    type: LayerTypeName,
    includeContaminationFields: boolean = false,
  ) {
    if (type === 'Sampling Mask') {
      return {
        title: '',
        content: [
          {
            type: 'fields',
            fieldInfos: [{ fieldName: 'TYPE', label: 'Type' }],
          },
        ],
      };
    }
    if (type === 'Area of Interest') {
      return {
        title: '',
        content: [
          {
            type: 'fields',
            fieldInfos: [{ fieldName: 'TYPE', label: 'Type' }],
          },
        ],
      };
    }
    if (type === 'Contamination Map') {
      return {
        title: '',
        content: [
          {
            type: 'fields',
            fieldInfos: [
              { fieldName: 'TYPE', label: 'Type' },
              { fieldName: 'CONTAMTYPE', label: 'Contamination Type' },
              { fieldName: 'CONTAMVAL', label: 'Activity' },
              { fieldName: 'CONTAMUNIT', label: 'Unit of Measure' },
            ],
          },
        ],
      };
    }
    if (type === 'Samples' || type === 'VSP') {
      const fieldInfos = [
        { fieldName: 'TYPE', label: 'Sample Type' },
        { fieldName: 'SA', label: 'Reference Surface Area (sq inch)' },
        { fieldName: 'AA', label: 'Actual Surface Area (sq inch)' },
        { fieldName: 'AC', label: 'Equivalent TOTS Samples' },
        {
          fieldName: 'TCPS',
          label: 'Total Cost Per Sample (Labor + Material + Waste)',
        },
        { fieldName: 'Notes', label: 'Notes' },
        { fieldName: 'ALC', label: 'Analysis Labor Cost' },
        { fieldName: 'AMC', label: 'Analysis Material Cost' },
        { fieldName: 'MCPS', label: 'Sampling Material Cost ($/sample)' },
        {
          fieldName: 'TTPK',
          label: 'Time to Prepare Kits (person hrs/sample)',
        },
        { fieldName: 'TTC', label: 'Time to Collect (person hrs/sample)' },
        { fieldName: 'TTA', label: 'Time to Analyze (person hrs/sample)' },
        {
          fieldName: 'TTPS',
          label: 'Total Time per Sample (person hrs/sample)',
        },
        { fieldName: 'LOD_P', label: 'Limit of Detection (CFU) Porous' },
        {
          fieldName: 'LOD_NON',
          label: 'Limit of Detection (CFU) Nonporous',
        },
        { fieldName: 'WVPS', label: 'Waste Volume (L/sample)' },
        { fieldName: 'WWPS', label: 'Waste Weight (lbs/sample)' },
      ];

      // add the contamination map related fields if necessary
      if (includeContaminationFields) {
        fieldInfos.push({
          fieldName: 'CONTAMTYPE',
          label: 'Contamination Type',
        });
        fieldInfos.push({ fieldName: 'CONTAMVAL', label: 'Activity' });
        fieldInfos.push({ fieldName: 'CONTAMUNIT', label: 'Unit of Measure' });
      }

      const actions = new Collection<any>();
      actions.addMany([
        {
          title: 'Delete Sample',
          id: 'delete',
          className: 'esri-icon-trash',
        },
        {
          title: 'View In Table',
          id: 'table',
          className: 'esri-icon-table',
        },
      ]);

      return {
        title: '',
        content: (feature: any) => getSampleTemplate(feature, fieldInfos),
        actions,
      };
    }

    return {};
  };
}

///////////////////////////////////////////////////////////////////
////////////////// Browser storage related hooks //////////////////
///////////////////////////////////////////////////////////////////

// Uses browser storage for holding graphics color.
function useGraphicColor() {
  const key = 'tots_polygon_symbol';

  const { setOptions } = React.useContext(DialogContext);
  const {
    polygonSymbol,
    setPolygonSymbol,
    setSymbolsInitialized,
  } = React.useContext(SketchContext);

  // Retreives training mode data from browser storage when the app loads
  const [localPolygonInitialized, setLocalPolygonInitialized] = React.useState(
    false,
  );
  React.useEffect(() => {
    if (localPolygonInitialized) return;

    setLocalPolygonInitialized(true);

    const polygonStr = readFromStorage(key);
    if (!polygonStr) {
      // if no key in browser storage, leave as default and say initialized
      setSymbolsInitialized(true);
      return;
    }

    const polygon = JSON.parse(polygonStr);

    // validate the polygon
    setPolygonSymbol(polygon);
    setSymbolsInitialized(true);
  }, [localPolygonInitialized, setPolygonSymbol, setSymbolsInitialized]);

  React.useEffect(() => {
    if (!localPolygonInitialized) return;

    const polygonObj = polygonSymbol as object;
    writeToStorage(key, polygonObj, setOptions);
  }, [polygonSymbol, localPolygonInitialized, setOptions]);
}

// Uses browser storage for holding the training mode selection.
function useTrainingModeStorage() {
  const key = 'tots_training_mode';

  const { setOptions } = React.useContext(DialogContext);
  const { trainingMode, setTrainingMode } = React.useContext(NavigationContext);

  // Retreives training mode data from browser storage when the app loads
  const [
    localTrainingModeInitialized,
    setLocalTrainingModeInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (localTrainingModeInitialized) return;

    setLocalTrainingModeInitialized(true);

    const trainingModeStr = readFromStorage(key);
    if (!trainingModeStr) return;

    const trainingMode = JSON.parse(trainingModeStr);
    setTrainingMode(trainingMode);
  }, [localTrainingModeInitialized, setTrainingMode]);

  React.useEffect(() => {
    if (!localTrainingModeInitialized) return;

    writeToStorage(key, trainingMode, setOptions);
  }, [trainingMode, localTrainingModeInitialized, setOptions]);
}

// Uses browser storage for holding any editable layers.
function useEditsLayerStorage() {
  const key = 'tots_edits';
  const { setOptions } = React.useContext(DialogContext);
  const {
    Graphic,
    GraphicsLayer,
    GroupLayer,
    Polygon,
  } = useEsriModulesContext();
  const {
    edits,
    setEdits,
    layersInitialized,
    setLayersInitialized,
    layers,
    setLayers,
    map,
    polygonSymbol,
    symbolsInitialized,
  } = React.useContext(SketchContext);
  const getPopupTemplate = useDynamicPopup();

  // Retreives edit data from browser storage when the app loads
  React.useEffect(() => {
    if (
      !map ||
      !setEdits ||
      !setLayers ||
      !symbolsInitialized ||
      layersInitialized
    )
      return;

    const editsStr = readFromStorage(key);
    if (!editsStr) {
      setLayersInitialized(true);
      return;
    }

    // change the edit type to add and set the edit context state
    const edits: EditsType = JSON.parse(editsStr);
    edits.edits.forEach((edit) => {
      edit.editType = 'add';
    });
    setEdits(edits);

    function createLayer(
      editsLayer: LayerEditsType,
      newLayers: LayerType[],
      parentLayer: __esri.GroupLayer | null = null,
    ) {
      const sketchLayer = new GraphicsLayer({
        title: editsLayer.label,
        id: editsLayer.uuid,
        visible: editsLayer.visible,
        listMode: editsLayer.listMode,
      });

      const popupTemplate = getPopupTemplate(
        editsLayer.layerType,
        editsLayer.hasContaminationRan,
      );
      const features: __esri.Graphic[] = [];
      const idsUsed: string[] = [];
      const displayedFeatures: FeatureEditsType[] = [];

      // push the items from the adds array
      editsLayer.adds.forEach((item) => {
        displayedFeatures.push(item);
        idsUsed.push(item.attributes['PERMANENT_IDENTIFIER']);
      });

      // push the items from the updates array
      editsLayer.updates.forEach((item) => {
        displayedFeatures.push(item);
        idsUsed.push(item.attributes['PERMANENT_IDENTIFIER']);
      });

      // only push the ids of the deletes array to prevent drawing deleted items
      editsLayer.deletes.forEach((item) => {
        idsUsed.push(item.PERMANENT_IDENTIFIER);
      });

      // add graphics from AGOL that haven't been changed
      editsLayer.published.forEach((item) => {
        // don't re-add graphics that have already been added above
        if (idsUsed.includes(item.attributes['PERMANENT_IDENTIFIER'])) return;

        displayedFeatures.push(item);
      });

      // add graphics to the map
      displayedFeatures.forEach((graphic) => {
        features.push(
          new Graphic({
            attributes: { ...graphic.attributes },
            symbol: polygonSymbol,
            geometry: new Polygon({
              spatialReference: {
                wkid: 3857,
              },
              rings: graphic.geometry.rings,
            }),
            popupTemplate,
          }),
        );
      });
      sketchLayer.addMany(features);

      newLayers.push({
        id: editsLayer.id,
        uuid: editsLayer.uuid,
        layerId: editsLayer.layerId,
        portalId: editsLayer.portalId,
        value: editsLayer.label,
        name: editsLayer.name,
        label: editsLayer.label,
        layerType: editsLayer.layerType,
        editType: 'add',
        addedFrom: editsLayer.addedFrom,
        status: editsLayer.status,
        visible: editsLayer.visible,
        listMode: editsLayer.listMode,
        sort: editsLayer.sort,
        geometryType: 'esriGeometryPolygon',
        sketchLayer,
        parentLayer,
      });

      return sketchLayer;
    }

    const newLayers: LayerType[] = [];
    const graphicsLayers: (__esri.GraphicsLayer | __esri.GroupLayer)[] = [];
    edits.edits.forEach((editsLayer) => {
      // add layer edits directly
      if (editsLayer.type === 'layer') {
        graphicsLayers.push(createLayer(editsLayer, newLayers));
      }
      // scenarios need to be added to a group layer first
      if (editsLayer.type === 'scenario') {
        const groupLayer = new GroupLayer({
          id: editsLayer.layerId,
          title: editsLayer.scenarioName,
          visible: editsLayer.visible,
          listMode: editsLayer.listMode,
        });

        // create the layers and add them to the group layer
        const scenarioLayers: __esri.GraphicsLayer[] = [];
        editsLayer.layers.forEach((layer) => {
          scenarioLayers.push(createLayer(layer, newLayers, groupLayer));
        });
        groupLayer.addMany(scenarioLayers);

        graphicsLayers.push(groupLayer);
      }
    });

    if (newLayers.length > 0) {
      setLayers([...layers, ...newLayers]);
      map.addMany(graphicsLayers);
    }

    setLayersInitialized(true);
  }, [
    Graphic,
    GraphicsLayer,
    GroupLayer,
    Polygon,
    setEdits,
    getPopupTemplate,
    setLayers,
    layers,
    layersInitialized,
    setLayersInitialized,
    map,
    polygonSymbol,
    symbolsInitialized,
  ]);

  // Saves the edits to browser storage everytime they change
  React.useEffect(() => {
    if (!layersInitialized) return;
    writeToStorage(key, edits, setOptions);
  }, [edits, layersInitialized, setOptions]);
}

// Uses browser storage for holding the reference layers that have been added.
function useReferenceLayerStorage() {
  const key = 'tots_reference_layers';
  const { setOptions } = React.useContext(DialogContext);
  const {
    FeatureLayer,
    Field,
    geometryJsonUtils,
    rendererJsonUtils,
  } = useEsriModulesContext();
  const { map, referenceLayers, setReferenceLayers } = React.useContext(
    SketchContext,
  );

  // Retreives reference layers from browser storage when the app loads
  const [
    localReferenceLayerInitialized,
    setLocalReferenceLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!map || !setReferenceLayers || localReferenceLayerInitialized) return;

    setLocalReferenceLayerInitialized(true);
    const referenceLayersStr = readFromStorage(key);
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

  // Saves the reference layers to browser storage everytime they change
  React.useEffect(() => {
    if (!localReferenceLayerInitialized) return;
    writeToStorage(key, referenceLayers, setOptions);
  }, [referenceLayers, localReferenceLayerInitialized, setOptions]);
}

// Uses browser storage for holding the url layers that have been added.
function useUrlLayerStorage() {
  const key = 'tots_url_layers';
  const { setOptions } = React.useContext(DialogContext);
  const {
    CSVLayer,
    GeoRSSLayer,
    KMLLayer,
    Layer,
    WMSLayer,
  } = useEsriModulesContext();
  const { map, urlLayers, setUrlLayers } = React.useContext(SketchContext);

  // Retreives url layers from browser storage when the app loads
  const [
    localUrlLayerInitialized,
    setLocalUrlLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!map || !setUrlLayers || localUrlLayerInitialized) return;

    setLocalUrlLayerInitialized(true);
    const urlLayersStr = readFromStorage(key);
    if (!urlLayersStr) return;

    const urlLayers: UrlLayerType[] = JSON.parse(urlLayersStr);
    const newUrlLayers: UrlLayerType[] = [];

    // add the portal layers to the map
    urlLayers.forEach((urlLayer) => {
      const type = urlLayer.type;
      const url = urlLayer.url;
      const id = urlLayer.layerId;

      let layer;
      if (type === 'ArcGIS') {
        layer = Layer.fromArcGISServerUrl({ url, properties: { id } });
      }
      if (type === 'WMS') {
        layer = new WMSLayer({ url, id });
      }
      /* // not supported in 4.x js api
      if(type === 'WFS') {
        layer = new WFSLayer({ url, id });
      } */
      if (type === 'KML') {
        layer = new KMLLayer({ url, id });
      }
      if (type === 'GeoRSS') {
        layer = new GeoRSSLayer({ url, id });
      }
      if (type === 'CSV') {
        layer = new CSVLayer({ url, id });
      }

      // add the layer if isn't null
      if (layer) {
        map.add(layer);

        newUrlLayers.push(urlLayer);
      }
    });

    setUrlLayers(newUrlLayers);
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

  // Saves the url layers to browser storage everytime they change
  React.useEffect(() => {
    if (!localUrlLayerInitialized) return;
    writeToStorage(key, urlLayers, setOptions);
  }, [urlLayers, localUrlLayerInitialized, setOptions]);
}

// Uses browser storage for holding the portal layers that have been added.
function usePortalLayerStorage() {
  const key = 'tots_portal_layers';
  const { setOptions } = React.useContext(DialogContext);
  const { Layer, PortalItem } = useEsriModulesContext();
  const { map, portalLayers, setPortalLayers } = React.useContext(
    SketchContext,
  );

  // Retreives portal layers from browser storage when the app loads
  const [
    localPortalLayerInitialized,
    setLocalPortalLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!map || !setPortalLayers || localPortalLayerInitialized) return;

    setLocalPortalLayerInitialized(true);
    const portalLayersStr = readFromStorage(key);
    if (!portalLayersStr) return;

    const portalLayers: PortalLayerType[] = JSON.parse(portalLayersStr);

    // add the portal layers to the map
    portalLayers.forEach((portalLayer) => {
      // Skip tots layers, since they are stored in edits.
      // The only reason tots layers are also in portal layers is
      // so the search panel will show the layer as having been
      // added.
      if (portalLayer.type === 'tots') return;

      const layer = Layer.fromPortalItem({
        portalItem: new PortalItem({
          id: portalLayer.id,
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

  // Saves the portal layers to browser storage everytime they change
  React.useEffect(() => {
    if (!localPortalLayerInitialized) return;
    writeToStorage(key, portalLayers, setOptions);
  }, [portalLayers, localPortalLayerInitialized, setOptions]);
}

// Uses browser storage for holding the map's view port extent.
function useMapPositionStorage() {
  const key = 'tots_map_extent';

  const { setOptions } = React.useContext(DialogContext);
  const { Extent, watchUtils } = useEsriModulesContext();
  const { mapView } = React.useContext(SketchContext);

  // Retreives the map position and zoom level from browser storage when the app loads
  const [
    localMapPositionInitialized,
    setLocalMapPositionInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!mapView || localMapPositionInitialized) return;

    setLocalMapPositionInitialized(true);

    const positionStr = readFromStorage(key);
    if (!positionStr) return;

    const extent = JSON.parse(positionStr) as any;
    mapView.extent = Extent.fromJSON(extent);

    setLocalMapPositionInitialized(true);
  }, [Extent, mapView, localMapPositionInitialized]);

  // Saves the map position and zoom level to browser storage whenever it changes
  const [
    watchExtentInitialized,
    setWatchExtentInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (!mapView || watchExtentInitialized) return;

    watchUtils.watch(mapView, 'extent', (newVal, oldVal, propName, target) => {
      writeToStorage(key, newVal.toJSON(), setOptions);
    });

    setWatchExtentInitialized(true);
  }, [
    watchUtils,
    mapView,
    watchExtentInitialized,
    localMapPositionInitialized,
    setOptions,
  ]);
}

// Uses browser storage for holding the home widget's viewpoint.
function useHomeWidgetStorage() {
  const key = 'tots_home_viewpoint';

  const { setOptions } = React.useContext(DialogContext);
  const { Viewpoint, watchUtils } = useEsriModulesContext();
  const { homeWidget } = React.useContext(SketchContext);

  // Retreives the home widget viewpoint from browser storage when the app loads
  const [
    localHomeWidgetInitialized,
    setLocalHomeWidgetInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!homeWidget || localHomeWidgetInitialized) return;

    setLocalHomeWidgetInitialized(true);

    const viewpointStr = readFromStorage(key);

    if (viewpointStr) {
      const viewpoint = JSON.parse(viewpointStr) as any;
      homeWidget.viewpoint = Viewpoint.fromJSON(viewpoint);
    }
  }, [Viewpoint, homeWidget, localHomeWidgetInitialized]);

  // Saves the home widget viewpoint to browser storage whenever it changes
  const [
    watchHomeWidgetInitialized,
    setWatchHomeWidgetInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (!homeWidget || watchHomeWidgetInitialized) return;

    watchUtils.watch(
      homeWidget,
      'viewpoint',
      (newVal, oldVal, propName, target) => {
        writeToStorage(key, homeWidget.viewpoint.toJSON(), setOptions);
      },
    );

    setWatchHomeWidgetInitialized(true);
  }, [watchUtils, homeWidget, watchHomeWidgetInitialized, setOptions]);
}

// Uses browser storage for holding the currently selected sample layer.
function useSamplesLayerStorage() {
  const key = 'tots_selected_sample_layer';
  const key2 = 'tots_selected_scenario';

  const { setOptions } = React.useContext(DialogContext);
  const {
    edits,
    layers,
    selectedScenario,
    setSelectedScenario,
    sketchLayer,
    setSketchLayer,
  } = React.useContext(SketchContext);

  // Retreives the selected sample layer (sketchLayer) from browser storage
  // when the app loads
  const [
    localSampleLayerInitialized,
    setLocalSampleLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (layers.length === 0 || localSampleLayerInitialized) return;

    setLocalSampleLayerInitialized(true);

    // set the selected scenario first
    const scenarioId = readFromStorage(key2);
    const scenario = edits.edits.find(
      (item) => item.type === 'scenario' && item.layerId === scenarioId,
    );
    if (scenario) setSelectedScenario(scenario as ScenarioEditsType);

    // then set the layer
    const layerId = readFromStorage(key);
    if (!layerId) return;

    setSketchLayer(getLayerById(layers, layerId));
  }, [
    edits,
    layers,
    setSelectedScenario,
    setSketchLayer,
    localSampleLayerInitialized,
  ]);

  // Saves the selected sample layer (sketchLayer) to browser storage whenever it changes
  React.useEffect(() => {
    if (!localSampleLayerInitialized) return;

    const data = sketchLayer?.layerId ? sketchLayer.layerId : '';
    writeToStorage(key, data, setOptions);
  }, [sketchLayer, localSampleLayerInitialized, setOptions]);

  // Saves the selected scenario to browser storage whenever it changes
  React.useEffect(() => {
    if (!localSampleLayerInitialized) return;

    const data = selectedScenario?.layerId ? selectedScenario.layerId : '';
    writeToStorage(key2, data, setOptions);
  }, [selectedScenario, localSampleLayerInitialized, setOptions]);
}

// Uses browser storage for holding the currently selected contamination map layer.
function useContaminationMapStorage() {
  const key = 'tots_selected_contamination_layer';
  const { setOptions } = React.useContext(DialogContext);
  const { layers } = React.useContext(SketchContext);
  const {
    contaminationMap,
    setContaminationMap, //
  } = React.useContext(CalculateContext);

  // Retreives the selected contamination map from browser storage
  // when the app loads
  const [
    localContaminationLayerInitialized,
    setLocalContaminationLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (layers.length === 0 || localContaminationLayerInitialized) return;

    setLocalContaminationLayerInitialized(true);

    const layerId = readFromStorage(key);
    if (!layerId) return;

    setContaminationMap(getLayerById(layers, layerId));
  }, [layers, setContaminationMap, localContaminationLayerInitialized]);

  // Saves the selected contamination map to browser storage whenever it changes
  React.useEffect(() => {
    if (!localContaminationLayerInitialized) return;

    const data = contaminationMap?.layerId ? contaminationMap.layerId : '';
    writeToStorage(key, data, setOptions);
  }, [contaminationMap, localContaminationLayerInitialized, setOptions]);
}

// Uses browser storage for holding the currently selected sampling mask layer.
function useGenerateRandomMaskStorage() {
  const key = 'tots_generate_random_mask_layer';
  const { setOptions } = React.useContext(DialogContext);
  const { layers } = React.useContext(SketchContext);
  const {
    aoiSketchLayer,
    setAoiSketchLayer, //
  } = React.useContext(SketchContext);

  // Retreives the selected sampling mask from browser storage
  // when the app loads
  const [
    localAoiLayerInitialized,
    setLocalAoiLayerInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (layers.length === 0 || localAoiLayerInitialized) return;

    setLocalAoiLayerInitialized(true);

    const layerId = readFromStorage(key);
    if (!layerId) return;

    setAoiSketchLayer(getLayerById(layers, layerId));
  }, [layers, setAoiSketchLayer, localAoiLayerInitialized]);

  // Saves the selected sampling mask to browser storage whenever it changes
  React.useEffect(() => {
    if (!localAoiLayerInitialized) return;

    const data = aoiSketchLayer?.layerId ? aoiSketchLayer.layerId : '';
    writeToStorage(key, data, setOptions);
  }, [aoiSketchLayer, localAoiLayerInitialized, setOptions]);
}

// Uses browser storage for holding the current calculate settings.
function useCalculateSettingsStorage() {
  const key = 'tots_calculate_settings';
  const { setOptions } = React.useContext(DialogContext);
  const {
    setNumLabs,
    setNumLabHours,
    setNumSamplingHours,
    setNumSamplingPersonnel,
    setNumSamplingShifts,
    setNumSamplingTeams,
    setSamplingLaborCost,
    setSurfaceArea,
    inputNumLabs,
    setInputNumLabs,
    inputNumLabHours,
    setInputNumLabHours,
    inputNumSamplingHours,
    setInputNumSamplingHours,
    inputNumSamplingPersonnel,
    setInputNumSamplingPersonnel,
    inputNumSamplingShifts,
    setInputNumSamplingShifts,
    inputNumSamplingTeams,
    setInputNumSamplingTeams,
    inputSamplingLaborCost,
    setInputSamplingLaborCost,
    inputSurfaceArea,
    setInputSurfaceArea,
  } = React.useContext(CalculateContext);

  type CalculateSettingsType = {
    numLabs: number;
    numLabHours: number;
    numSamplingHours: number;
    numSamplingPersonnel: number;
    numSamplingShifts: number;
    numSamplingTeams: number;
    samplingLaborCost: number;
    surfaceArea: number;
  };

  // Reads the calculate settings from browser storage.
  const [settingsInitialized, setSettingsInitialized] = React.useState(false);
  React.useEffect(() => {
    if (settingsInitialized) return;
    const settingsStr = readFromStorage(key);

    setSettingsInitialized(true);

    if (!settingsStr) return;
    const settings: CalculateSettingsType = JSON.parse(settingsStr);

    setNumLabs(settings.numLabs);
    setNumLabHours(settings.numLabHours);
    setNumSamplingHours(settings.numSamplingHours);
    setNumSamplingPersonnel(settings.numSamplingPersonnel);
    setNumSamplingShifts(settings.numSamplingShifts);
    setNumSamplingTeams(settings.numSamplingTeams);
    setSamplingLaborCost(settings.samplingLaborCost);
    setSurfaceArea(settings.surfaceArea);
    setInputNumLabs(settings.numLabs);
    setInputNumLabHours(settings.numLabHours);
    setInputNumSamplingHours(settings.numSamplingHours);
    setInputNumSamplingPersonnel(settings.numSamplingPersonnel);
    setInputNumSamplingShifts(settings.numSamplingShifts);
    setInputNumSamplingTeams(settings.numSamplingTeams);
    setInputSamplingLaborCost(settings.samplingLaborCost);
    setInputSurfaceArea(settings.surfaceArea);
  }, [
    setNumLabs,
    setNumLabHours,
    setNumSamplingHours,
    setNumSamplingPersonnel,
    setNumSamplingShifts,
    setNumSamplingTeams,
    setSamplingLaborCost,
    setSurfaceArea,
    setInputNumLabs,
    setInputNumLabHours,
    setInputNumSamplingHours,
    setInputNumSamplingPersonnel,
    setInputNumSamplingShifts,
    setInputNumSamplingTeams,
    setInputSamplingLaborCost,
    setInputSurfaceArea,
    settingsInitialized,
  ]);

  // Saves the calculate settings to browser storage
  React.useEffect(() => {
    const settings: CalculateSettingsType = {
      numLabs: inputNumLabs,
      numLabHours: inputNumLabHours,
      numSamplingHours: inputNumSamplingHours,
      numSamplingPersonnel: inputNumSamplingPersonnel,
      numSamplingShifts: inputNumSamplingShifts,
      numSamplingTeams: inputNumSamplingTeams,
      samplingLaborCost: inputSamplingLaborCost,
      surfaceArea: inputSurfaceArea,
    };

    writeToStorage(key, settings, setOptions);
  }, [
    inputNumLabs,
    inputNumLabHours,
    inputNumSamplingHours,
    inputNumSamplingPersonnel,
    inputNumSamplingShifts,
    inputNumSamplingTeams,
    inputSamplingLaborCost,
    inputSurfaceArea,
    setOptions,
  ]);
}

// Uses browser storage for holding the current tab and current tab's options.
function useCurrentTabSettings() {
  const key = 'tots_current_tab';

  type PanelSettingsType = {
    goTo: PanelValueType | '';
    goToOptions: GoToOptions;
  };

  const { setOptions } = React.useContext(DialogContext);
  const {
    goTo,
    setGoTo,
    goToOptions,
    setGoToOptions, //
  } = React.useContext(NavigationContext);

  // Retreives the current tab and current tab's options from browser storage
  const [
    localTabDataInitialized,
    setLocalTabDataInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (localTabDataInitialized) return;

    setLocalTabDataInitialized(true);

    const dataStr = readFromStorage(key);
    if (!dataStr) return;

    const data: PanelSettingsType = JSON.parse(dataStr);

    setGoTo(data.goTo);
    setGoToOptions(data.goToOptions);
  }, [setGoTo, setGoToOptions, localTabDataInitialized]);

  // Saves the current tab and optiosn to browser storage whenever it changes
  React.useEffect(() => {
    if (!localTabDataInitialized) return;

    let data: PanelSettingsType = { goTo: '', goToOptions: null };

    // get the current value from storage, if it exists
    const dataStr = readFromStorage(key);
    if (dataStr) {
      data = JSON.parse(dataStr);
    }

    // Update the data values only if they have values.
    // This is because other components clear these once they have been applied
    // but the browser storage needs to hold onto it.
    if (goTo) data['goTo'] = goTo;
    if (goToOptions) data['goToOptions'] = goToOptions;

    // save to storage
    writeToStorage(key, data, setOptions);
  }, [goTo, goToOptions, localTabDataInitialized, setOptions]);
}

// Uses browser storage for holding the currently selected basemap.
function useBasemapStorage() {
  const key = 'tots_selected_basemap_layer';

  const { setOptions } = React.useContext(DialogContext);
  const { basemapWidget } = React.useContext(SketchContext);

  // Retreives the selected basemap from browser storage when the app loads
  const [
    localBasemapInitialized,
    setLocalBasemapInitialized, //
  ] = React.useState(false);
  const [
    watchHandler,
    setWatchHandler, //
  ] = React.useState<__esri.WatchHandle | null>(null);
  React.useEffect(() => {
    if (!basemapWidget || watchHandler || localBasemapInitialized) return;

    const portalId = readFromStorage(key);
    if (!portalId) {
      // early return since this field isn't in storage
      setLocalBasemapInitialized(true);
      return;
    }

    // create the watch handler for finding the selected basemap
    const newWatchHandle = basemapWidget.watch(
      'source.basemaps.length',
      (newValue) => {
        // wait for the basemaps to be populated
        if (newValue === 0) return;

        setLocalBasemapInitialized(true);

        // Search for the basemap with the matching portal id
        let selectedBasemap: __esri.Basemap | null = null;
        basemapWidget.source.basemaps.forEach((basemap) => {
          if (basemap.portalItem.id === portalId) selectedBasemap = basemap;
        });

        // Set the activeBasemap to the basemap that was found
        if (selectedBasemap) basemapWidget.activeBasemap = selectedBasemap;
      },
    );

    setWatchHandler(newWatchHandle);
  }, [basemapWidget, watchHandler, localBasemapInitialized]);

  // destroys the watch handler after initialization completes
  React.useEffect(() => {
    if (!watchHandler || !localBasemapInitialized) return;

    watchHandler.remove();
    setWatchHandler(null);
  }, [watchHandler, localBasemapInitialized]);

  // Saves the selected basemap to browser storage whenever it changes
  const [
    watchBasemapInitialized,
    setWatchBasemapInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (!basemapWidget || !localBasemapInitialized || watchBasemapInitialized) {
      return;
    }

    basemapWidget.watch('activeBasemap.portalItem.id', (newValue) => {
      writeToStorage(key, newValue, setOptions);
    });

    setWatchBasemapInitialized(true);
  }, [
    basemapWidget,
    localBasemapInitialized,
    watchBasemapInitialized,
    setOptions,
  ]);
}

// Uses browser storage for holding the url layers that have been added.
function useUserDefinedSampleOptionsStorage() {
  const key = 'tots_user_defined_sample_options';
  const { setOptions } = React.useContext(DialogContext);
  const { userDefinedOptions, setUserDefinedOptions } = React.useContext(
    SketchContext,
  );

  // Retreives url layers from browser storage when the app loads
  const [
    localUserDefinedSamplesInitialized,
    setLocalUserDefinedSamplesInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!setUserDefinedOptions || localUserDefinedSamplesInitialized) return;

    setLocalUserDefinedSamplesInitialized(true);
    const userDefinedSamplesStr = readFromStorage(key);
    if (!userDefinedSamplesStr) return;

    const userDefinedSamples: SampleSelectType[] = JSON.parse(
      userDefinedSamplesStr,
    );

    setUserDefinedOptions(userDefinedSamples);
  }, [localUserDefinedSamplesInitialized, setUserDefinedOptions]);

  // Saves the url layers to browser storage everytime they change
  React.useEffect(() => {
    if (!localUserDefinedSamplesInitialized) return;
    writeToStorage(key, userDefinedOptions, setOptions);
  }, [userDefinedOptions, localUserDefinedSamplesInitialized, setOptions]);
}

// Uses browser storage for holding the url layers that have been added.
function useUserDefinedSampleAttributesStorage() {
  const key = 'tots_user_defined_sample_attributes';
  const { setOptions } = React.useContext(DialogContext);
  const { userDefinedAttributes, setUserDefinedAttributes } = React.useContext(
    SketchContext,
  );

  // Retreives url layers from browser storage when the app loads
  const [
    localUserDefinedSamplesInitialized,
    setLocalUserDefinedSamplesInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (!setUserDefinedAttributes || localUserDefinedSamplesInitialized) return;

    setLocalUserDefinedSamplesInitialized(true);
    const userDefinedAttributesStr = readFromStorage(key);
    if (!userDefinedAttributesStr) return;

    // parse the storage value
    const userDefinedAttributesObj: UserDefinedAttributes = JSON.parse(
      userDefinedAttributesStr,
    );

    // add the user defined attributes to the global attributes
    Object.keys(userDefinedAttributesObj.attributes).forEach((key) => {
      sampleAttributes[key] = userDefinedAttributesObj.attributes[key];
    });

    // set the state
    setUserDefinedAttributes(userDefinedAttributesObj);
  }, [localUserDefinedSamplesInitialized, setUserDefinedAttributes]);

  // Saves the url layers to browser storage everytime they change
  React.useEffect(() => {
    if (!localUserDefinedSamplesInitialized) return;
    writeToStorage(key, userDefinedAttributes, setOptions);
  }, [userDefinedAttributes, localUserDefinedSamplesInitialized, setOptions]);
}

// Uses browser storage for holding the size and expand status of the bottom table.
function useTablePanelStorage() {
  const key = 'tots_table_panel';

  const { setOptions } = React.useContext(DialogContext);
  const {
    tablePanelExpanded,
    setTablePanelExpanded,
    tablePanelHeight,
    setTablePanelHeight,
  } = React.useContext(NavigationContext);

  // Retreives table info data from browser storage when the app loads
  const [tablePanelInitialized, setTablePanelInitialized] = React.useState(
    false,
  );
  React.useEffect(() => {
    if (tablePanelInitialized) return;

    setTablePanelInitialized(true);

    const tablePanelStr = readFromStorage(key);
    if (!tablePanelStr) {
      // if no key in browser storage, leave as default and say initialized
      setTablePanelExpanded(false);
      setTablePanelHeight(200);
      return;
    }

    const tablePanel = JSON.parse(tablePanelStr);

    // save table panel info
    setTablePanelExpanded(tablePanel.expanded);
    setTablePanelHeight(tablePanel.height);
  }, [tablePanelInitialized, setTablePanelExpanded, setTablePanelHeight]);

  React.useEffect(() => {
    if (!tablePanelInitialized) return;

    const tablePanel: object = {
      expanded: tablePanelExpanded,
      height: tablePanelHeight,
    };
    writeToStorage(key, tablePanel, setOptions);
  }, [tablePanelExpanded, tablePanelHeight, tablePanelInitialized, setOptions]);
}

// Saves/Retrieves data to browser storage
export function useSessionStorage() {
  useTrainingModeStorage();
  useGraphicColor();
  useEditsLayerStorage();
  useReferenceLayerStorage();
  useUrlLayerStorage();
  usePortalLayerStorage();
  useMapPositionStorage();
  useHomeWidgetStorage();
  useSamplesLayerStorage();
  useContaminationMapStorage();
  useGenerateRandomMaskStorage();
  useCalculateSettingsStorage();
  useCurrentTabSettings();
  useBasemapStorage();
  useUserDefinedSampleOptionsStorage();
  useUserDefinedSampleAttributesStorage();
  useTablePanelStorage();
}
