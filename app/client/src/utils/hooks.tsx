/** @jsxImportSource @emotion/react */

import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import Collection from '@arcgis/core/core/Collection';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import FillSymbol3DLayer from '@arcgis/core/symbols/FillSymbol3DLayer';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import LineStylePattern3D from '@arcgis/core/symbols/patterns/LineStylePattern3D';
import LineSymbol3D from '@arcgis/core/symbols/LineSymbol3D';
import LineSymbol3DLayer from '@arcgis/core/symbols/LineSymbol3DLayer';
import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';
import PolygonSymbol3D from '@arcgis/core/symbols/PolygonSymbol3D';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import * as query from '@arcgis/core/rest/query';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
// components
import MapPopup, {
  buildingMapPopup,
  contaminationMapPopup,
  imageryAnalysisMapPopup,
} from 'components/MapPopup';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { CalculateContext } from 'contexts/Calculate';
import { DialogContext } from 'contexts/Dialog';
import { SampleTypesS3, useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { PublishContext, Selections } from 'contexts/Publish';
import {
  AoiCharacterizationData,
  JsonDownloadType,
  PlanGraphics,
  SketchContext,
  SketchViewModelType,
} from 'contexts/Sketch';
// types
import {
  CalculateResultsType,
  CalculateResultsDataType,
  CalculateResultsDeconDataType,
} from 'types/CalculateResults';
import {
  EditsType,
  LayerAoiAnalysisEditsType,
  LayerDeconEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import { FieldInfos, LayerType, LayerTypeName } from 'types/Layer';
import { AppType } from 'types/Navigation';
import { ReferenceLayerSelections } from 'types/Publish';
// utils
import { appendEnvironmentObjectParam } from 'utils/arcGisRestUtils';
import { writeToStorage } from 'utils/browserStorage';
import {
  fetchPost,
  fetchPostFile,
  geoprocessorFetch,
  retryCall,
} from 'utils/fetchUtils';
import {
  calculateArea,
  convertToPoint,
  createBuffer,
  deactivateButtons,
  findLayerInEdits,
  generateUUID,
  getCurrentDateTime,
  getDefaultWebMapSceneSelections,
  handlePopupClick,
  removeZValues,
  setZValues,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { parseSmallFloat } from 'utils/utils';
// config
import { isDecon } from 'config/navigation';

export type GsgParam = { itemID: string };

let view: __esri.MapView | __esri.SceneView | null = null;

export const buildingColors: { [key: string]: number[] } = {
  Residential: [255, 222, 62, 191],
  Commercial: [255, 127, 127, 191],
  Government: [20, 158, 206, 191],
  Education: [252, 146, 31, 191],
  Industrial: [133, 133, 133, 191],
  Other: [255, 222, 62, 191],
};

export const mediaToBeepEnum = {
  'Streets - Asphalt': 'asphalt',
  'Streets/Sidewalks - Concrete': 'concrete',
  'Soil/Vegetation': 'soil',
};

export const summarizedBuildingSurfaceTypes = [
  'Buildings (Interior and Exterior)',
  'Building Interiors',
  'Building Exteriors',
];

export const outsideMedia = [
  'Soil',
  'Soil/Vegetation',
  'Streets - Asphalt',
  'Streets/Sidewalks - Concrete',
];
const mediaLookup: { [key: string]: string[] } = {
  Basic: [...outsideMedia, 'Buildings (Interior and Exterior)'],
  'Advanced - Building Structural Component': [
    ...outsideMedia,
    'Building Exteriors',
    'Building Interiors',
  ],
  'Advanced - Building Primary Material Composition': [
    ...outsideMedia,
    'Brick Buildings',
    'Concrete Buildings',
    'Steel Buildings',
    'Wood Buildings',
    'Other Buildings',
  ],
};

function performBasicDeconCalculations(
  deconTech: string,
  sel: any,
  deconAttributes: any,
  limitOfDetection: number,
  jsonDownload: any[],
  parentMedia?: string,
  removeBuildingContentsOverride?: boolean,
) {
  const {
    APPLICATION_METHOD,
    FIXED_COSTS,
    SIZE_BASED_COSTS,
    SETUP_TIME,
    BREAKDOWN_TIME,
    APPLICATION_TIME,
    RESIDENCE_TIME,
    MATERIAL_SPECIFIC_PARAMS,
    SURFACE_SPECIFIC_PARAMS,
  } = deconAttributes;

  const {
    CONTAM_REMOVAL_FACTOR,
    SOLID_WASTE_VOLUME,
    AQUEOUS_WASTE_VOLUME,
    SOLID_WASTE_MASS,
    AQUEOUS_WASTE_MASS,
  } = SURFACE_SPECIFIC_PARAMS[sel.media];

  // calculate final contamination
  const contamRemovalFactor = parentMedia
    ? MATERIAL_SPECIFIC_PARAMS[parentMedia.replace(' Buildings', '')]
        .CONTAM_REMOVAL_FACTOR
    : CONTAM_REMOVAL_FACTOR;
  const contamLeftFactor = 1 - contamRemovalFactor;
  const avgFinalContam =
    sel.avgCfu * Math.pow(contamLeftFactor, sel.numIterativeApplications);
  sel.avgFinalContamination = avgFinalContam;
  sel.aboveDetectionLimit = avgFinalContam >= limitOfDetection;

  const removeBldgContents =
    removeBuildingContentsOverride !== undefined
      ? removeBuildingContentsOverride
      : sel.removeContents;

  const areaDeconApplied = sel.surfaceArea * (sel.pctDeconed * 0.01);
  const areaDeconAppliedSqFt =
    convertSqMtoSqFt(sel.surfaceArea) * (sel.pctDeconed * 0.01);
  const volumeDeconAppliedCubFt = convertCubMtoCubFt(sel.volume);

  const liquidWasteM3 =
    areaDeconApplied * AQUEOUS_WASTE_VOLUME * sel.numIterativeApplications;
  let solidWasteM3 = areaDeconApplied * SOLID_WASTE_VOLUME;
  const liquidWasteMass =
    areaDeconApplied * AQUEOUS_WASTE_MASS * sel.numIterativeApplications;
  let solidWasteMass = areaDeconApplied * SOLID_WASTE_MASS;
  if (sel.media === 'Building Interiors') {
    const pctVolumeDeconed = sel.pctDeconed * 0.01 * sel.volumeContents;
    if (APPLICATION_METHOD === 'Surface' && !removeBldgContents) {
      solidWasteM3 -= pctVolumeDeconed;
      solidWasteMass -= pctVolumeDeconed * SOLID_WASTE_MASS;
    }
    if (APPLICATION_METHOD === 'Volumetric' && removeBldgContents) {
      solidWasteM3 += pctVolumeDeconed;
      solidWasteMass += pctVolumeDeconed * SOLID_WASTE_MASS;
    }
  }

  const deconCost =
    APPLICATION_METHOD === 'Surface'
      ? FIXED_COSTS +
        areaDeconAppliedSqFt * SIZE_BASED_COSTS * sel.numIterativeApplications
      : FIXED_COSTS +
        volumeDeconAppliedCubFt *
          SIZE_BASED_COSTS *
          sel.numIterativeApplications;
  const deconTime =
    SETUP_TIME / 24 +
    BREAKDOWN_TIME / 24 +
    (areaDeconApplied *
      (APPLICATION_TIME / sel.numTeams) *
      sel.numIterativeApplications) /
      24 +
    (RESIDENCE_TIME * sel.numIterativeApplications) / 24;

  jsonDownload.push({
    contaminationScenario: parentMedia
      ? `${parentMedia} - ${sel.media}`
      : sel.media,
    decontaminationTechnology: deconTech,
    solidWasteVolumeM3: solidWasteM3,
    liquidWasteVolumeM3: liquidWasteM3,
    solidWasteMassKg: solidWasteMass,
    liquidWasteMassKg: liquidWasteMass,
    decontaminationCost: deconCost,
    decontaminationTimeDays: deconTime,
    averageInitialContamination: sel.avgCfu,
    averageFinalContamination: sel.avgFinalContamination,
    aboveDetectionLimit: sel.aboveDetectionLimit,
    pctAoi: outsideMedia.includes(sel.media) ? sel.pctAoi : null,
    surfaceArea: sel.surfaceArea,
    volume: sel.volume,
    volumeContents:
      sel.media === 'Building Interiors' ? sel.volumeContents : null,
    numIterativeApplications: sel.numIterativeApplications,
    numTeams: sel.numTeams,
    removeContents:
      sel.media === 'Building Interiors' ? sel.removeContents : null,
  });

  return {
    deconCost,
    deconTime,
    solidWasteM3,
    liquidWasteM3,
    solidWasteMass,
    liquidWasteMass,
  };
}

export const backupImagerySymbol = new SimpleFillSymbol({
  color: [0, 0, 0, 0],
  outline: {
    color: [0, 0, 0, 0],
    width: 0,
    style: 'solid',
  },
});
export const imageAnalysisSymbols: { [key: string]: __esri.SimpleFillSymbol } =
  {
    Asphalt: new SimpleFillSymbol({
      color: [0, 0, 0, 0.5],
      outline: {
        color: [0, 0, 0, 1],
        width: 1,
        style: 'solid',
      },
    }),
    Concrete: new SimpleFillSymbol({
      color: [156, 156, 156, 0.5],
      outline: {
        color: [156, 156, 156, 1],
        width: 1,
        style: 'solid',
      },
    }),
    // Soil: new SimpleFillSymbol({
    //   color: [181, 53, 53, 0.5],
    //   outline: {
    //     color: [181, 53, 53, 1],
    //     width: 1,
    //     style: 'solid',
    //   },
    // }),
    Soil: new SimpleFillSymbol({
      color: [191, 217, 153, 0.5],
      outline: {
        color: [191, 217, 153, 1],
        width: 1,
        style: 'solid',
      },
    }),
    Vegetation: new SimpleFillSymbol({
      color: [191, 217, 153, 0.5],
      outline: {
        color: [191, 217, 153, 1],
        width: 1,
        style: 'solid',
      },
    }),
    Water: new SimpleFillSymbol({
      color: [191, 217, 242, 0.5],
      outline: {
        color: [191, 217, 242, 1],
        width: 1,
        style: 'solid',
      },
    }),
  };

type ContaminationPercentages = {
  [planId: string]: { [key: number]: number };
};
type PlanBuildingCfu = { [planId: string]: number };

export function processScenario(
  layer: LayerAoiAnalysisEditsType | string,
  aoiCharacterizationData: AoiCharacterizationData,
  contaminationPercentages: ContaminationPercentages,
  planBuildingCfu: PlanBuildingCfu,
  defaultDeconSelections: any[],
) {
  const isScenario = typeof layer !== 'string';
  const scenarioId = isScenario ? layer.layerId : layer;
  const deconTechSelections = isScenario ? layer.deconTechSelections : [];

  const planGraphics = aoiCharacterizationData.planGraphics[scenarioId];
  if (!planGraphics) return [];

  const { totalAoiSqM, totalBuildingFootprintSqM } = planGraphics.summary;

  if (isScenario && layer.aoiSummary) {
    layer.aoiSummary.totalAoiSqM = planGraphics.aoiArea;
    layer.aoiSummary.totalBuildingFootprintSqM = totalBuildingFootprintSqM;
  }

  let curDeconTechSelections =
    deconTechSelections && deconTechSelections.length > 0
      ? deconTechSelections
      : defaultDeconSelections;
  curDeconTechSelections = curDeconTechSelections.filter(
    (d) => !d.media.includes('Building'),
  );
  planGraphics.summary.areaByMedia.forEach((category) => {
    curDeconTechSelections.push({
      aboveDetectionLimit: 0,
      avgCfu: 0,
      avgFinalContamination: null,
      deconTech: null,
      isHazardous: { label: 'Non-Hazardous', value: 'non-hazardous' },
      numIterativeApplications: 1,
      numTeams: 1,
      pctDeconed: 100,
      removeContents: false,
      id: category.id,
      media: category.media,
      pctAoi: category.pctAoi,
      surfaceArea: category.surfaceArea,
      volume: category.volume,
      volumeContents: category.volumeContents,
      subRows: category.subMedia.map((sub) => ({
        aboveDetectionLimit: 0,
        avgCfu: 0,
        avgFinalContamination: null,
        deconTech: null,
        isHazardous: { label: 'Non-Hazardous', value: 'non-hazardous' },
        numIterativeApplications: 1,
        numTeams: 1,
        pctDeconed: 100,
        removeContents: false,
        id: sub.id ?? generateUUID(),
        media: sub.media,
        pctAoi: sub.pctAoi,
        surfaceArea: sub.surfaceArea,
        volume: sub.volume,
        volumeContents: sub.volumeContents,
      })),
    });
  });

  const newDeconTechSelections: any[] = [];
  curDeconTechSelections.forEach((sel) => {
    // find decon settings
    const media = sel.media;

    let surfaceArea = 0;
    // let volume = 0;
    let avgCfu = 0;
    let pctAoi = 0;
    if (media.includes('Building')) {
      // avgCfu =
      //   (planBuildingCfu[scenarioId] ?? 0) * (partitionFactors[media] ?? 1);
      // if (media === 'Building Exteriors') surfaceArea = totalBuildingExtSqM;
      // if (media === 'Building Interiors') {
      //   surfaceArea = totalBuildingIntSqM;
      //   volume = totalBuildingVolumeCubM;
      // }
      newDeconTechSelections.push(sel);
    } else {
      pctAoi = (planGraphics.aoiPercentages as any)[
        (mediaToBeepEnum as any)[sel.media]
      ] as number;
      const pctFactor = pctAoi * 0.01;

      // get surface area of soil, asphalt or concrete
      //             60 =             100 * 0.6 surface area of concrete
      surfaceArea = totalAoiSqM * pctFactor;

      // get total CFU for media
      let totalArea = 0;
      let totalCfu = 0;
      if (
        Object.prototype.hasOwnProperty.call(
          contaminationPercentages,
          scenarioId,
        )
      ) {
        Object.keys(contaminationPercentages[scenarioId]).forEach(
          (key: any) => {
            // area of media and cfu level
            const pctCfu = contaminationPercentages[scenarioId][key];
            //                34.2 =   0.57 * 60
            const surfaceAreaSfCfu = pctCfu * surfaceArea;
            totalArea += surfaceAreaSfCfu;

            // 34.2M  =             34.2 * 1M;
            // SUM    = 35.916M CFU
            totalCfu += surfaceAreaSfCfu * key;
          },
        );
      }

      avgCfu = !totalCfu && !totalArea ? 0 : totalCfu / totalArea;

      newDeconTechSelections.push({
        ...sel,
        pctAoi,
        surfaceArea,
        volume: surfaceArea,
        avgCfu,
      });
    }
  });

  return newDeconTechSelections;
}

function convertMtoFt(meters: number) {
  return meters / 0.3048;
}

function convertSqMtoSqFt(sqMeters: number) {
  return sqMeters / 0.092903;
}

function convertCubMtoCubFt(sqMeters: number) {
  return sqMeters / 0.0283168;
}

export async function fetchBuildingData(
  aoiGraphics: __esri.Graphic[],
  services: any,
  planGraphics: PlanGraphics,
  responseIndexes: string[],
  gsgFile: File | undefined,
  sceneViewForArea: __esri.SceneView | null,
  cutFootprintsMethod: 'cut' | 'math' | 'raw' = 'math',
  technologyTypes: SampleTypesS3,
  _buildingFilter: string[] = [],
) {
  const countRequests: any[] = [];
  aoiGraphics.forEach((graphic) => {
    countRequests.push(
      retryCall<number>(() =>
        query.executeForCount(services.structures, {
          geometry: graphic.geometry,
          returnGeometry: false,
        }),
      ),
    );
  });

  const countResponses = await Promise.all(countRequests);
  let buildingCount = 0;
  countResponses.forEach((count) => (buildingCount += count));

  const buildingLimit = cutFootprintsMethod === 'cut' ? 500 : 2000;
  if (buildingCount > buildingLimit) {
    return {
      thresholdExceeded: true,
      buildingCount,
      buildingLimit,
    };
  }

  const requests: any[] = [];
  aoiGraphics.forEach((graphic) => {
    requests.push(
      retryCall(() =>
        query.executeQueryJSON(services.structures, {
          geometry: graphic.geometry,
          returnGeometry: true,
          outFields: ['*'],
        }),
      ),
    );
  });

  const responses = await Promise.all(requests);
  responses.forEach((results, index) => {
    const planId = responseIndexes[index];
    results.features.forEach((feature: any) => {
      const { HEIGHT, OCC_CLS, PRIM_OCC, SQMETERS } = feature.attributes;

      // if (buildingFilter.includes(bid)) return;

      // defaults
      const defaultStoryHeightM = 3.6576; // default to 12 feet if no height is provided
      const interiorMaterialFactor = 0.0740456514;

      // meters
      const heightM = HEIGHT ?? defaultStoryHeightM;
      const numStory = Math.max(Math.ceil(heightM / defaultStoryHeightM), 1);
      const roofSqM = SQMETERS;
      const footprintSqM = SQMETERS;
      const floorsSqM = numStory * footprintSqM;
      const ceilingsSqM = floorsSqM;
      const extWallsSqM = Math.sqrt(footprintSqM) * heightM * 4;
      const intWallsSqM = extWallsSqM;
      const extSqM = extWallsSqM + roofSqM;
      const intSqM = intWallsSqM + floorsSqM + ceilingsSqM;
      const totalSqM = extSqM + intSqM;
      const extVolumeCubM = extSqM;
      const intVolumeCubM = heightM * footprintSqM;
      const intVolumeContentsCubM = intSqM * interiorMaterialFactor;

      // feet
      const heightFt = convertMtoFt(heightM);
      const roofSqFt = convertSqMtoSqFt(roofSqM);
      const footprintSqFt = convertSqMtoSqFt(footprintSqM);
      const floorsSqFt = convertSqMtoSqFt(floorsSqM);
      const ceilingsSqFt = convertSqMtoSqFt(ceilingsSqM);
      const extWallsSqFt = convertSqMtoSqFt(extWallsSqM);
      const intWallsSqFt = convertSqMtoSqFt(intWallsSqM);
      const extSqFt = convertSqMtoSqFt(extSqM);
      const intSqFt = convertSqMtoSqFt(intSqM);
      const totalSqFt = convertSqMtoSqFt(totalSqM);
      const extVolumeCubFt = convertCubMtoCubFt(extVolumeCubM);
      const intVolumeCubFt = convertCubMtoCubFt(intVolumeCubM);
      const intVolumeContentsCubFt = convertCubMtoCubFt(intVolumeContentsCubM);

      // get building material type factors
      const factorKey =
        PRIM_OCC === 'Unclassified' ? `${PRIM_OCC}-${OCC_CLS}` : PRIM_OCC;
      const buildingFactors = technologyTypes.deconBuildingFactors[factorKey];
      if (!buildingFactors) {
        console.log('No definition for ', factorKey);
        return;
      }
      const { SOC, Brick, Concrete, Steel, Wood, Other } = buildingFactors;

      // get surface area per material type sq meters
      const intBrickSqM = intSqM * (Brick / 100);
      const extBrickSqM = extSqM * (Brick / 100);
      const extVolumeBrickCubM = extSqM * (Brick / 100);
      const intVolumeBrickCubM = intVolumeCubM * (Brick / 100);
      const intVolumeBrickContentsCubM =
        intVolumeBrickCubM * interiorMaterialFactor;
      const intConcreteSqM = intSqM * (Concrete / 100);
      const extConcreteSqM = extSqM * (Concrete / 100);
      const extVolumeConcreteCubM = extSqM * (Concrete / 100);
      const intVolumeConcreteCubM = intVolumeCubM * (Concrete / 100);
      const intVolumeConcreteContentsCubM =
        intVolumeConcreteCubM * interiorMaterialFactor;
      const intSteelSqM = intSqM * (Steel / 100);
      const extSteelSqM = extSqM * (Steel / 100);
      const extVolumeSteelCubM = extSqM * (Steel / 100);
      const intVolumeSteelCubM = intVolumeCubM * (Steel / 100);
      const intVolumeSteelContentsCubM =
        intVolumeSteelCubM * interiorMaterialFactor;
      const intWoodSqM = intSqM * (Wood / 100);
      const extWoodSqM = extSqM * (Wood / 100);
      const extVolumeWoodCubM = extSqM * (Wood / 100);
      const intVolumeWoodCubM = intVolumeCubM * (Wood / 100);
      const intVolumeWoodContentsCubM =
        intVolumeWoodCubM * interiorMaterialFactor;
      const intOtherSqM = intSqM * (Other / 100);
      const extOtherSqM = extSqM * (Other / 100);
      const extVolumeOtherCubM = extSqM * (Other / 100);
      const intVolumeOtherCubM = intVolumeCubM * (Other / 100);
      const intVolumeOtherContentsCubM =
        intVolumeOtherCubM * interiorMaterialFactor;

      // get surface area per material type sq feet
      const intBrickSqFt = convertSqMtoSqFt(intBrickSqM);
      const extBrickSqFt = convertSqMtoSqFt(extBrickSqM);
      const extVolumeBrickCubFt = convertCubMtoCubFt(extVolumeBrickCubM);
      const intVolumeBrickCubFt = convertCubMtoCubFt(intVolumeBrickCubM);
      const intVolumeBrickContentsCubFt = convertCubMtoCubFt(
        intVolumeBrickContentsCubM,
      );
      const intConcreteSqFt = convertSqMtoSqFt(intConcreteSqM);
      const extConcreteSqFt = convertSqMtoSqFt(extConcreteSqM);
      const extVolumeConcreteCubFt = convertCubMtoCubFt(extVolumeConcreteCubM);
      const intVolumeConcreteCubFt = convertCubMtoCubFt(intVolumeConcreteCubM);
      const intVolumeConcreteContentsCubFt = convertCubMtoCubFt(
        intVolumeConcreteContentsCubM,
      );
      const intSteelSqFt = convertSqMtoSqFt(intSteelSqM);
      const extSteelSqFt = convertSqMtoSqFt(extSteelSqM);
      const extVolumeSteelCubFt = convertCubMtoCubFt(extVolumeSteelCubM);
      const intVolumeSteelCubFt = convertCubMtoCubFt(intVolumeSteelCubM);
      const intVolumeSteelContentsCubFt = convertCubMtoCubFt(
        intVolumeSteelContentsCubM,
      );
      const intWoodSqFt = convertSqMtoSqFt(intWoodSqM);
      const extWoodSqFt = convertSqMtoSqFt(extWoodSqM);
      const extVolumeWoodCubFt = convertCubMtoCubFt(extVolumeWoodCubM);
      const intVolumeWoodCubFt = convertCubMtoCubFt(intVolumeWoodCubM);
      const intVolumeWoodContentsCubFt = convertCubMtoCubFt(
        intVolumeWoodContentsCubM,
      );
      const intOtherSqFt = convertSqMtoSqFt(intOtherSqM);
      const extOtherSqFt = convertSqMtoSqFt(extOtherSqM);
      const extVolumeOtherCubFt = convertCubMtoCubFt(extVolumeOtherCubM);
      const intVolumeOtherCubFt = convertCubMtoCubFt(intVolumeOtherCubM);
      const intVolumeOtherContentsCubFt = convertCubMtoCubFt(
        intVolumeOtherContentsCubM,
      );

      const actions = new Collection<any>();
      actions.add({
        title: 'View In Table',
        id: 'table',
        className: 'esri-icon-table',
      });

      const permId = generateUUID();
      const occCls = feature.attributes.OCC_CLS;
      const prodDate = feature.attributes.PROD_DATE;
      const imageDate = feature.attributes.IMAGE_DATE;
      planGraphics[planId].graphics.push(
        new Graphic({
          attributes: {
            ...feature.attributes,
            GlobalID: undefined,
            PERMANENT_IDENTIFIER: permId,
            PROD_DATE: prodDate ? new Date(prodDate).toLocaleString() : '',
            IMAGE_DATE: imageDate ? new Date(imageDate).toLocaleString() : '',
            soc: SOC,
            CONTAMTYPE: '',
            CONTAMUNIT: '',
            CONTAMVALPLUME: 0,
            CONTAMVALINITIAL: 0,
            CONTAMVAL: 0,
            numStory,
            HEIGHT: heightM,
            roofSqM,
            footprintSqM,
            floorsSqM,
            ceilingsSqM,
            extWallsSqM,
            intWallsSqM,
            extSqM,
            intSqM,
            totalSqM,
            extVolumeCubM,
            intVolumeCubM,
            intVolumeContentsCubM,
            heightFt,
            roofSqFt,
            footprintSqFt,
            floorsSqFt,
            ceilingsSqFt,
            extWallsSqFt,
            intWallsSqFt,
            extSqFt,
            intSqFt,
            totalSqFt,
            extVolumeCubFt,
            intVolumeCubFt,
            intVolumeContentsCubFt,
            intBrickSqM,
            extBrickSqM,
            extVolumeBrickCubM,
            intVolumeBrickCubM,
            intVolumeBrickContentsCubM,
            intConcreteSqM,
            extConcreteSqM,
            extVolumeConcreteCubM,
            intVolumeConcreteCubM,
            intVolumeConcreteContentsCubM,
            intSteelSqM,
            extSteelSqM,
            extVolumeSteelCubM,
            intVolumeSteelCubM,
            intVolumeSteelContentsCubM,
            intWoodSqM,
            extWoodSqM,
            extVolumeWoodCubM,
            intVolumeWoodCubM,
            intVolumeWoodContentsCubM,
            intOtherSqM,
            extOtherSqM,
            extVolumeOtherCubM,
            intVolumeOtherCubM,
            intVolumeOtherContentsCubM,
            intBrickSqFt,
            extBrickSqFt,
            extVolumeBrickCubFt,
            intVolumeBrickCubFt,
            intVolumeBrickContentsCubFt,
            intConcreteSqFt,
            extConcreteSqFt,
            extVolumeConcreteCubFt,
            intVolumeConcreteCubFt,
            intVolumeConcreteContentsCubFt,
            intSteelSqFt,
            extSteelSqFt,
            extVolumeSteelCubFt,
            intVolumeSteelCubFt,
            intVolumeSteelContentsCubFt,
            intWoodSqFt,
            extWoodSqFt,
            extVolumeWoodCubFt,
            intVolumeWoodCubFt,
            intVolumeWoodContentsCubFt,
            intOtherSqFt,
            extOtherSqFt,
            extVolumeOtherCubFt,
            intVolumeOtherCubFt,
            intVolumeOtherContentsCubFt,
          },
          geometry: feature.geometry,
          symbol: new SimpleFillSymbol({
            color: Object.prototype.hasOwnProperty.call(buildingColors, occCls)
              ? buildingColors[occCls]
              : buildingColors['Other'],
            outline: {
              color: [153, 153, 153, 64],
              width: 0.84,
            },
          }),
          popupTemplate: {
            title: '',
            content: buildingMapPopup,
            actions,
          },
        }),
      );

      planGraphics[planId].summary.totalBuildingRoofSqM += roofSqM;
      planGraphics[planId].summary.totalBuildingFootprintSqM += footprintSqM;
      planGraphics[planId].summary.totalBuildingFloorsSqM += floorsSqM;
      planGraphics[planId].summary.totalBuildingCeilingsSqM += ceilingsSqM;
      planGraphics[planId].summary.totalBuildingExtWallsSqM += extWallsSqM;
      planGraphics[planId].summary.totalBuildingIntWallsSqM += intWallsSqM;
      planGraphics[planId].summary.totalBuildingExtSqM += extSqM;
      planGraphics[planId].summary.totalBuildingIntSqM += intSqM;
      planGraphics[planId].summary.totalBuildingSqM += totalSqM;
      planGraphics[planId].summary.totalBuildingVolumeCubM +=
        intVolumeCubM + extVolumeCubM;
      planGraphics[planId].summary.totalBuildingVolumeContentsCubM +=
        intVolumeContentsCubM;
    });
  });

  buildingCalculations(planGraphics);

  let gsgParam: GsgParam | undefined = undefined;
  if (gsgFile) {
    const gsgFileUploaded: any = await retryCall(() =>
      fetchPostFile(
        `${services.totsGPServer}/uploads/upload`,
        {
          f: 'json',
        },
        gsgFile,
      ),
    );
    gsgParam = {
      itemID: gsgFileUploaded.item.itemID,
    };
  }

  let iaResponses: any[] = [];
  let errorToRethrow = null;
  try {
    const iaRequests: Promise<any>[] = [];
    for (const graphic of aoiGraphics) {
      removeZValues(graphic);

      const featureSet = new FeatureSet({
        displayFieldName: '',
        geometryType: 'polygon',
        spatialReference: {
          wkid: 3857,
        },
        fields: [
          {
            name: 'OBJECTID',
            type: 'oid',
            alias: 'OBJECTID',
          },
          {
            name: 'PERMANENT_IDENTIFIER',
            type: 'guid',
            alias: 'PERMANENT_IDENTIFIER',
          },
        ],
        features: [graphic],
      });

      // call gp service
      const props = {
        f: 'json',
        Area_of_Interest_Mask: featureSet.toJSON(),
        GSGFile: gsgParam,
        ImageryLayer:
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
      };

      appendEnvironmentObjectParam(props);

      iaRequests.push(
        retryCall(() =>
          geoprocessorFetch({
            url: `${services.totsGPServer}/Classify%20AOI`,
            inputParameters: props,
          }),
        ),
      );
    }

    iaResponses = await Promise.all(iaRequests);
  } catch (err) {
    errorToRethrow = err;
  } finally {
    if (gsgParam) {
      await retryCall(() =>
        fetchPost(
          `${services.totsGPServer}/uploads/${gsgParam.itemID}/delete`,
          {
            f: 'json',
          },
        ),
      );
    }
  }

  if (errorToRethrow) throw errorToRethrow;

  iaResponses.forEach((response, index) => {
    const summaryOutput = response.results.find(
      (r: any) => r.paramName === 'Output_Classification_Summary',
    );
    if (summaryOutput) {
      const planId = responseIndexes[index];
      planGraphics[planId].aoiPercentages.numAois +=
        summaryOutput.value.features.length;

      summaryOutput.value.features.forEach((f: any) => {
        planGraphics[planId].aoiPercentages.asphalt += f.attributes.ASPHALT;
        planGraphics[planId].aoiPercentages.concrete += f.attributes.CONCRETE;
        planGraphics[planId].aoiPercentages.soil += f.attributes.SOIL;
      });
    }

    // Figure out what to add graphics to
    const featuresOutput = response.results.find(
      (r: any) => r.paramName === 'Output_Classification_Features',
    );
    if (featuresOutput) {
      featuresOutput.value.features.forEach((f: any) => {
        const category = f.attributes.category;
        const symbol = Object.prototype.hasOwnProperty.call(
          imageAnalysisSymbols,
          category,
        )
          ? (imageAnalysisSymbols as any)[category]
          : backupImagerySymbol;

        const planId = responseIndexes[index];
        const permId = generateUUID();

        const startPolygon = new Polygon({
          rings: f.geometry.rings,
          spatialReference: {
            wkid: 3857,
          },
        });
        let polygons: __esri.Geometry[] = [startPolygon];
        if (cutFootprintsMethod === 'cut') {
          for (const buildingGraphic of planGraphics[planId].graphics) {
            if (geometryEngine.contains(buildingGraphic.geometry, startPolygon))
              return;
          }

          planGraphics[planId].graphics.forEach((buildingGraphic) => {
            const difference = geometryEngine.difference(
              polygons,
              buildingGraphic.geometry,
            );
            if (!difference) return;

            const newPolygons: __esri.Geometry[] = [];
            if (!Array.isArray(difference)) newPolygons.push(difference);
            else {
              difference.forEach((diff) => {
                if (!diff) return;
                newPolygons.push(diff);
              });
            }
            if (newPolygons.length > 0) polygons = newPolygons;
          });
        }

        polygons.forEach((polygon) => {
          planGraphics[planId].imageGraphics.push(
            new Graphic({
              attributes: {
                ...f.attributes,
                PERMANENT_IDENTIFIER: permId,
              },
              geometry: polygon,
              symbol,
              popupTemplate: {
                title: '',
                content: imageryAnalysisMapPopup,
              },
            }),
          );
        });
      });
    }
  });

  for (const planId of Object.keys(planGraphics)) {
    if (cutFootprintsMethod === 'cut') {
      const imageAreas: { [key: string]: number } = {};
      for (const graphic of planGraphics[planId].imageGraphics) {
        const key = graphic.attributes.category.toLowerCase();

        const areaSM = await calculateArea(graphic, sceneViewForArea);
        if (typeof areaSM === 'number') {
          if (Object.prototype.hasOwnProperty.call(imageAreas, key))
            imageAreas[key] += areaSM;
          else imageAreas[key] = areaSM;
        }
      }

      const totalArea = planGraphics[planId].aoiArea;
      const { numAois } = planGraphics[planId].aoiPercentages;
      planGraphics[planId].aoiPercentages = {
        numAois,
        asphalt: (imageAreas['asphalt'] / totalArea) * 100,
        asphaltSqM: imageAreas['asphalt'],
        concrete: (imageAreas['concrete'] / totalArea) * 100,
        concreteSqM: imageAreas['concrete'],
        soil:
          ((imageAreas['soil'] + imageAreas['vegetation']) / totalArea) * 100,
        soilSqM: imageAreas['soil'] + imageAreas['vegetation'],
      };
    } else if (cutFootprintsMethod === 'math') {
      // trim building footprints to AOI
      let buildingFootprintArea = 0;
      for (const buildingGraphic of planGraphics[planId].graphics) {
        const intersection = geometryEngine.intersect(
          aoiGraphics.map((g) => g.geometry),
          buildingGraphic.geometry,
        );

        const intersectionArray = Array.isArray(intersection)
          ? intersection
          : [intersection];
        for (const geometry of intersectionArray) {
          if (!geometry) continue;
          const areaSM = await calculateArea(
            new Graphic({ geometry }),
            sceneViewForArea,
          );
          if (typeof areaSM === 'number') {
            buildingFootprintArea += areaSM;
          }
        }
      }

      // generate new areas and percentages based on non building area
      const totalArea = planGraphics[planId].aoiArea;
      const nonBuildingArea = totalArea - buildingFootprintArea;
      const { numAois, asphalt, concrete, soil } =
        planGraphics[planId].aoiPercentages;
      const asphaltSqM = (asphalt / 100) * nonBuildingArea;
      const concreteSqM = (concrete / 100) * nonBuildingArea;
      const soilSqM = (soil / 100) * nonBuildingArea;

      planGraphics[planId].aoiPercentages = {
        numAois,
        asphalt: (asphaltSqM / totalArea) * 100,
        asphaltSqM,
        concrete: (concreteSqM / totalArea) * 100,
        concreteSqM,
        soil: (soilSqM / totalArea) * 100,
        soilSqM,
      };
    } else if (cutFootprintsMethod === 'raw') {
      const totalArea = planGraphics[planId].aoiArea;
      const { numAois, asphalt, concrete, soil } =
        planGraphics[planId].aoiPercentages;
      planGraphics[planId].aoiPercentages = {
        numAois,
        asphalt: asphalt / numAois,
        asphaltSqM: totalArea * (asphalt / 100),
        concrete: concrete / numAois,
        concreteSqM: totalArea * (concrete / 100),
        soil: soil / numAois,
        soilSqM: totalArea * (soil / 100),
      };
    }

    console.log('planGraphics: ', planGraphics);
  }

  return {
    thresholdExceeded: false,
    buildingCount,
    buildingLimit,
  };
}

export function buildingCalculations(planGraphics: PlanGraphics) {
  const buildingMaterialOptions: {
    [planId: string]: {
      [key: string]: any;
    };
  } = {};
  Object.entries(planGraphics).forEach(([planId, value]) => {
    if (
      !Object.prototype.hasOwnProperty.call(buildingMaterialOptions, planId)
    ) {
      buildingMaterialOptions[planId] = {
        'Buildings (Interior and Exterior)': {
          surfaceArea: 0,
          volume: 0,
          extVolume: 0,
          intVolume: 0,
          intVolumeContents: 0,
          extSurfaceArea: 0,
          intSurfaceArea: 0,
        },
        'Building Exteriors': {
          surfaceArea: 0,
          volume: 0,
          extVolume: 0,
          intVolume: 0,
          intVolumeContents: 0,
          extSurfaceArea: 0,
          intSurfaceArea: 0,
        },
        'Building Interiors': {
          surfaceArea: 0,
          volume: 0,
          extVolume: 0,
          intVolume: 0,
          intVolumeContents: 0,
          extSurfaceArea: 0,
          intSurfaceArea: 0,
        },
        'Brick Buildings': {
          surfaceArea: 0,
          volume: 0,
          extVolume: 0,
          intVolume: 0,
          intVolumeContents: 0,
          extSurfaceArea: 0,
          intSurfaceArea: 0,
        },
        'Concrete Buildings': {
          surfaceArea: 0,
          volume: 0,
          extVolume: 0,
          intVolume: 0,
          intVolumeContents: 0,
          extSurfaceArea: 0,
          intSurfaceArea: 0,
        },
        'Steel Buildings': {
          surfaceArea: 0,
          volume: 0,
          extVolume: 0,
          intVolume: 0,
          intVolumeContents: 0,
          extSurfaceArea: 0,
          intSurfaceArea: 0,
        },
        'Wood Buildings': {
          surfaceArea: 0,
          volume: 0,
          extVolume: 0,
          intVolume: 0,
          intVolumeContents: 0,
          extSurfaceArea: 0,
          intSurfaceArea: 0,
        },
        'Other Buildings': {
          surfaceArea: 0,
          volume: 0,
          extVolume: 0,
          intVolume: 0,
          intVolumeContents: 0,
          extSurfaceArea: 0,
          intSurfaceArea: 0,
        },
      };
    }

    value.graphics.forEach((graphic) => {
      const {
        intSqM,
        extSqM,
        extVolumeCubM,
        intVolumeCubM,
        intVolumeContentsCubM,
        intBrickSqM,
        extBrickSqM,
        intVolumeBrickCubM,
        extVolumeBrickCubM,
        intVolumeBrickContentsCubM,
        intConcreteSqM,
        extConcreteSqM,
        extVolumeConcreteCubM,
        intVolumeConcreteCubM,
        intVolumeConcreteContentsCubM,
        intSteelSqM,
        extSteelSqM,
        extVolumeSteelCubM,
        intVolumeSteelCubM,
        intVolumeSteelContentsCubM,
        intWoodSqM,
        extWoodSqM,
        extVolumeWoodCubM,
        intVolumeWoodCubM,
        intVolumeWoodContentsCubM,
        intOtherSqM,
        extOtherSqM,
        extVolumeOtherCubM,
        intVolumeOtherCubM,
        intVolumeOtherContentsCubM,
      } = graphic.attributes;

      // add up surface area for summary building
      buildingMaterialOptions[planId][
        'Buildings (Interior and Exterior)'
      ].surfaceArea += intSqM + extSqM;
      buildingMaterialOptions[planId][
        'Buildings (Interior and Exterior)'
      ].volume += extVolumeCubM + intVolumeCubM;

      buildingMaterialOptions[planId]['Building Exteriors'].surfaceArea +=
        extSqM;
      buildingMaterialOptions[planId]['Building Exteriors'].extSurfaceArea +=
        extSqM;
      buildingMaterialOptions[planId]['Building Exteriors'].volume +=
        extVolumeCubM;
      buildingMaterialOptions[planId]['Building Exteriors'].extVolume +=
        extVolumeCubM;
      buildingMaterialOptions[planId]['Building Interiors'].surfaceArea +=
        intSqM;
      buildingMaterialOptions[planId]['Building Interiors'].intSurfaceArea +=
        intSqM;
      buildingMaterialOptions[planId]['Building Interiors'].volume +=
        intVolumeCubM;
      buildingMaterialOptions[planId]['Building Interiors'].intVolume +=
        intVolumeCubM;
      buildingMaterialOptions[planId]['Building Interiors'].intVolumeContents +=
        intVolumeContentsCubM;

      // add up surface area per building type
      buildingMaterialOptions[planId]['Brick Buildings'].surfaceArea +=
        intBrickSqM + extBrickSqM;
      buildingMaterialOptions[planId]['Brick Buildings'].intSurfaceArea +=
        intBrickSqM;
      buildingMaterialOptions[planId]['Brick Buildings'].extSurfaceArea +=
        extBrickSqM;
      buildingMaterialOptions[planId]['Brick Buildings'].volume +=
        intVolumeBrickCubM + extVolumeBrickCubM;
      buildingMaterialOptions[planId]['Brick Buildings'].extVolume +=
        extVolumeBrickCubM;
      buildingMaterialOptions[planId]['Brick Buildings'].intVolume +=
        intVolumeBrickCubM;
      buildingMaterialOptions[planId]['Brick Buildings'].intVolumeContents +=
        intVolumeBrickContentsCubM;

      buildingMaterialOptions[planId]['Concrete Buildings'].surfaceArea +=
        intConcreteSqM + extConcreteSqM;
      buildingMaterialOptions[planId]['Concrete Buildings'].intSurfaceArea +=
        intConcreteSqM;
      buildingMaterialOptions[planId]['Concrete Buildings'].extSurfaceArea +=
        extConcreteSqM;
      buildingMaterialOptions[planId]['Concrete Buildings'].extVolume +=
        extVolumeConcreteCubM;
      buildingMaterialOptions[planId]['Concrete Buildings'].intVolume +=
        intVolumeConcreteCubM;
      buildingMaterialOptions[planId]['Concrete Buildings'].intVolumeContents +=
        intVolumeConcreteContentsCubM;

      buildingMaterialOptions[planId]['Steel Buildings'].surfaceArea +=
        intSteelSqM + extSteelSqM;
      buildingMaterialOptions[planId]['Steel Buildings'].intSurfaceArea +=
        intSteelSqM;
      buildingMaterialOptions[planId]['Steel Buildings'].extSurfaceArea +=
        extSteelSqM;
      buildingMaterialOptions[planId]['Steel Buildings'].volume +=
        extVolumeSteelCubM + intVolumeSteelCubM;
      buildingMaterialOptions[planId]['Steel Buildings'].extVolume +=
        extVolumeSteelCubM;
      buildingMaterialOptions[planId]['Steel Buildings'].intVolume +=
        intVolumeSteelCubM;
      buildingMaterialOptions[planId]['Steel Buildings'].intVolumeContents +=
        intVolumeSteelContentsCubM;

      buildingMaterialOptions[planId]['Wood Buildings'].surfaceArea +=
        intWoodSqM + extWoodSqM;
      buildingMaterialOptions[planId]['Wood Buildings'].intSurfaceArea +=
        intWoodSqM;
      buildingMaterialOptions[planId]['Wood Buildings'].extSurfaceArea +=
        extWoodSqM;
      buildingMaterialOptions[planId]['Wood Buildings'].volume +=
        extVolumeWoodCubM + intVolumeWoodCubM;
      buildingMaterialOptions[planId]['Wood Buildings'].extVolume +=
        extVolumeWoodCubM;
      buildingMaterialOptions[planId]['Wood Buildings'].intVolume +=
        intVolumeWoodCubM;
      buildingMaterialOptions[planId]['Wood Buildings'].intVolumeContents +=
        intVolumeWoodContentsCubM;

      buildingMaterialOptions[planId]['Other Buildings'].surfaceArea +=
        intOtherSqM + extOtherSqM;
      buildingMaterialOptions[planId]['Other Buildings'].intSurfaceArea +=
        intOtherSqM;
      buildingMaterialOptions[planId]['Other Buildings'].extSurfaceArea +=
        extOtherSqM;
      buildingMaterialOptions[planId]['Other Buildings'].volume +=
        extVolumeOtherCubM + intVolumeOtherCubM;
      buildingMaterialOptions[planId]['Other Buildings'].extVolume +=
        extVolumeOtherCubM;
      buildingMaterialOptions[planId]['Other Buildings'].intVolume +=
        intVolumeOtherCubM;
      buildingMaterialOptions[planId]['Other Buildings'].intVolumeContents +=
        intVolumeOtherContentsCubM;
    });
  });

  Object.entries(buildingMaterialOptions).forEach(([planId, options]) => {
    Object.entries(options).forEach(([key, value]) => {
      if (!planGraphics[planId].summary.areaByMedia)
        planGraphics[planId].summary.areaByMedia = [];
      planGraphics[planId].summary.areaByMedia.push({
        id: generateUUID(),
        media: key,
        pctAoi: 0,
        surfaceArea: value.surfaceArea,
        volume: value.intVolume,
        volumeContents: value.intVolumeContents,
        subMedia: summarizedBuildingSurfaceTypes.includes(key)
          ? []
          : [
              {
                id: generateUUID(),
                media: 'Building Exteriors',
                pctAoi: 0,
                surfaceArea: value.extSurfaceArea,
                volume: 0,
                volumeContents: 0,
                subMedia: [],
              },
              {
                id: generateUUID(),
                media: 'Building Interiors',
                pctAoi: 0,
                surfaceArea: value.intSurfaceArea,
                volume: value.intVolume,
                volumeContents: value.intVolumeContents,
                subMedia: [],
              },
            ],
      });
    });
  });
}

// Hook that allows the user to easily start over without
// having to manually start a new session.
export function useStartOver() {
  const { resetCalculateContext } = useContext(CalculateContext);
  const { setOptions } = useContext(DialogContext);
  const {
    setCurrentPanel,
    setGettingStartedOpen,
    setGoTo,
    setGoToOptions,
    setLatestStepIndex,
    setTrainingMode,
  } = useContext(NavigationContext);
  const {
    setManualConfigureOutput,
    setPublishSamplesMode,
    setPublishSampleTableMetaData,
    setSampleTableDescription,
    setSampleTableName,
    setSampleTableNameAvailable,
    setSampleTypeSelections,
    setSelectedService,
  } = useContext(PublishContext);
  const {
    basemapWidget,
    homeWidget,
    map,
    mapView,
    resetDefaultSymbols,
    sceneView,
    setAoiSketchLayer,
    setDeconSketchLayer,
    setDisplayDimensions,
    setDisplayGeometryType,
    setEdits,
    setLayers,
    setPortalLayers,
    setReferenceLayers,
    setSelectedScenario,
    setSketchLayer,
    setStagingAreaLayer,
    setTerrain3dUseElevation,
    setTerrain3dVisible,
    setUrlLayers,
    setUserDefinedAttributes,
    setUserDefinedOptions,
    setViewUnderground3d,
  } = useContext(SketchContext);

  function startOver() {
    try {
      if (sketchVMG) {
        sketchVMG['2d'].cancel();
        sketchVMG['3d'].cancel();
      }
      if (clickEvent) clickEvent.remove();
      if (doubleClickEvent) doubleClickEvent.remove();
      if (moveEvent) moveEvent.remove();
      if (popupEvent) popupEvent.remove();
    } catch (ex) {
      console.error(ex);
    }

    setAoiSketchLayer(null);
    setDeconSketchLayer(null);
    setSelectedScenario(null);
    setSketchLayer(null);
    setStagingAreaLayer(null);

    // clear the map
    const layersToRemove =
      map?.layers
        .filter(
          (l) => !['contaminationMapUpdated', 'deconResults'].includes(l.id),
        )
        .toArray() ?? [];
    if (layersToRemove.length > 0) map?.removeMany(layersToRemove);

    // set the layers to just the defaults
    setLayers([]);
    resetDefaultSymbols();
    setEdits({ count: 0, edits: [] });
    setUrlLayers([]);
    setReferenceLayers([]);
    setPortalLayers([]);
    setUserDefinedAttributes({ editCount: 0, sampleTypes: {} });
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
    setDisplayDimensions('2d');
    setDisplayGeometryType('points');
    setTerrain3dUseElevation(true);
    setTerrain3dVisible(true);
    setViewUnderground3d(false);

    // set the calculate settings back to defaults
    resetCalculateContext();

    // clear publish
    setManualConfigureOutput(null);
    setPublishSamplesMode('');
    setPublishSampleTableMetaData(null);
    setSampleTableDescription('');
    setSampleTableName('');
    setSampleTableNameAvailable('unknown');
    setSampleTypeSelections([]);
    setSelectedService(null);

    memoryState = {};

    // reset the zoom
    if (mapView) {
      mapView.center = new Point({ longitude: -95, latitude: 37 });
      mapView.zoom = 3;
      mapView.rotation = 0;
      if (mapView) mapView.closePopup();
    }
    if (sceneView) {
      if (sceneView.camera) {
        sceneView.camera.fov = 55;
        sceneView.camera.heading = 0;
        sceneView.camera.tilt = 0.171544;
        sceneView.camera.position = new Point({
          longitude: -95,
          latitude: 36.6715,
        });
      }
      sceneView.zoom = 4;
      if (sceneView) sceneView.closePopup();
    }

    if (homeWidget && mapView && sceneView) {
      homeWidget['2d'].viewpoint = mapView.viewpoint;
      homeWidget['3d'].viewpoint = sceneView.viewpoint;
    }

    if (basemapWidget) {
      Object.values(basemapWidget).forEach((widget) => {
        // Search for the basemap with the matching basemap
        let selectedBasemap: __esri.Basemap | null = null;
        widget.source.basemaps.forEach((basemap) => {
          if (basemap.title === 'Streets') selectedBasemap = basemap;
        });

        // Set the activeBasemap to the basemap that was found
        if (selectedBasemap) widget.activeBasemap = selectedBasemap;
      });
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

// Runs sampling plan calculations whenever the
// samples change or the variables on the calculate tab
// change.
export function useCalculatePlan(appType: AppType) {
  const {
    edits,
    layers,
    sceneViewForArea,
    selectedScenario,
    setEdits,
    setSelectedScenario,
  } = useContext(SketchContext);
  const {
    calculateResults,
    inputNumLabs,
    inputNumLabHours,
    inputNumSamplingHours,
    inputNumSamplingPersonnel,
    inputNumSamplingShifts,
    inputNumSamplingTeams,
    inputSamplingLaborCost,
    inputSurfaceArea,
    setCalculateResults,
    setUpdateContextValues,
    updateContextValues,
  } = useContext(CalculateContext);

  useEffect(() => {
    console.log('calculateResults: ', calculateResults);
  }, [calculateResults]);

  // Reset the calculateResults context variable, whenever anything
  // changes that will cause a re-calculation.
  const [calcGraphics, setCalcGraphics] = useState<__esri.Graphic[]>([]);
  useEffect(() => {
    if (appType !== 'sampling') return;

    // Get the number of graphics for the selected scenario
    let numGraphics = 0;
    if (
      selectedScenario &&
      selectedScenario.type === 'scenario' &&
      selectedScenario.layers.length > 0
    ) {
      layers.forEach((layer) => {
        if (layer.parentLayer?.id !== selectedScenario.layerId) return;
        if (layer.sketchLayer?.type !== 'graphics') return;

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
  }, [appType, edits, layers, selectedScenario, setCalculateResults]);

  const [totals, setTotals] = useState({
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
  const [totalArea, setTotalArea] = useState(0);

  // perform geospatial calculatations
  useEffect(() => {
    if (appType !== 'sampling') return;

    // exit early checks
    if (
      !selectedScenario ||
      selectedScenario.type !== 'scenario' ||
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

    async function processFeatures() {
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
      for (const layer of layers) {
        if (
          !selectedScenario ||
          layer.parentLayer?.id !== selectedScenario.layerId ||
          layer.sketchLayer?.type !== 'graphics'
        ) {
          continue;
        }

        for (const graphic of layer.sketchLayer.graphics.toArray()) {
          const calcGraphic = graphic.clone();

          // calculate the area using the custom hook
          const areaSI = await calculateArea(
            graphic,
            sceneViewForArea,
            'sqinches',
          );
          if (typeof areaSI !== 'number') {
            continue;
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
        }
      }

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
    }

    processFeatures();
  }, [appType, edits, layers, sceneViewForArea, selectedScenario]);

  // perform non-geospatial calculations
  useEffect(() => {
    if (appType !== 'sampling') return;

    // exit early checks
    if (selectedScenario?.type !== 'scenario') return;
    if (calcGraphics.length === 0 || totalArea === 0) {
      setCalculateResults({ status: 'none', panelOpen: false, data: null });
      return;
    }

    const {
      NUM_LABS: numLabs,
      NUM_LAB_HOURS: numLabHours,
      NUM_SAMPLING_HOURS: numSamplingHours,
      NUM_SAMPLING_PERSONNEL: numSamplingPersonnel,
      NUM_SAMPLING_SHIFTS: numSamplingShifts,
      NUM_SAMPLING_TEAMS: numSamplingTeams,
      SAMPLING_LABOR_COST: samplingLaborCost,
      SURFACE_AREA: surfaceArea,
    } = selectedScenario.calculateSettings.current;

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
    const totalSamplingCost = totalSamplingLaborCost + totals.mcps;
    const totalAnalysisCost = totals.alc + totals.amc;
    const totalCost = totalSamplingCost + totalAnalysisCost;

    // Calculate total time. Note: Total Time is the greater of sample collection time or Analysis Total Time.
    // If Analysis Time is equal to or greater than Sampling Total Time then the value reported is total Analysis Time Plus one day.
    // The one day accounts for the time samples get collected and shipped to the lab on day one of the sampling response.
    let totalTime = 0;
    if (labThroughput + 1 < timeCompleteSampling) {
      totalTime = timeCompleteSampling;
    } else {
      labThroughput += 1;
      totalTime = labThroughput;
    }

    // Get limiting time factor (will be undefined if they are equal)
    let limitingFactor: CalculateResultsDataType['LIMITING_TIME_FACTOR'] = '';
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
      NUM_USER_SAMPLES: calcGraphics.length,

      // assign counts
      NUM_SAMPLES: totals.ac,
      TOTAL_SAMPLED_AREA: totalArea,
      TTPK: totals.ttpk,
      TTC: totals.ttc,
      SAMPLING_MATERIAL_COST: totals.mcps,
      TTA: totals.tta,
      ALC: totals.alc,
      AMC: totals.amc,
      WASTE_VOLUME_SOLID: totals.wvps / 1000, // convert liters to m3
      WASTE_VOLUME_SOLID_LITERS: totals.wvps,
      WASTE_WEIGHT_SOLID: totals.wwps / 2.2046226218, // convert lbs to kg
      WASTE_WEIGHT_SOLID_POUNDS: totals.wwps,

      // spatial items
      'User Specified Total AOI': userSpecifiedAOI,
      PCT_AREA_SAMPLED: percentAreaSampled,

      // sampling
      TOTAL_SAMPLING_TIME: samplingTimeHours,
      SAMPLING_HOURS: samplingHours,
      NUM_SAMPLING_HOURS: samplingPersonnelHoursPerDay,
      SAMPLING_LABOR_COST: samplingPersonnelLaborCost,
      SAMPLING_TIME: timeCompleteSampling,
      TOTAL_SAMPLING_LABOR_COST: totalSamplingLaborCost,
      TOTAL_SAMPLING_COST: totalSamplingCost,
      TOTAL_LAB_COST: totalAnalysisCost,

      // analysis
      LAB_ANALYSIS_TIME: labThroughput,

      //totals
      TOTAL_COST: totalCost,
      TOTAL_TIME: Math.round(totalTime * 10) / 10,
      LIMITING_TIME_FACTOR: limitingFactor,
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
    appType,
    calcGraphics,
    selectedScenario,
    setCalculateResults,
    totals,
    totalArea,
  ]);

  // Updates the calculation context values with the inputs.
  // The intention is to update these values whenever the user navigates away from
  // the calculate resources tab or when they click the View Detailed Results button.
  useEffect(() => {
    if (appType !== 'sampling') return;

    if (!selectedScenario || !updateContextValues) return;
    setUpdateContextValues(false);

    const newSettings = {
      NUM_LABS: inputNumLabs,
      NUM_LAB_HOURS: inputNumLabHours,
      NUM_SAMPLING_HOURS: inputNumSamplingHours,
      NUM_SAMPLING_PERSONNEL: inputNumSamplingPersonnel,
      NUM_SAMPLING_SHIFTS: inputNumSamplingShifts,
      NUM_SAMPLING_TEAMS: inputNumSamplingTeams,
      SAMPLING_LABOR_COST: inputSamplingLaborCost,
      SURFACE_AREA: inputSurfaceArea,
    };

    setSelectedScenario((selectedScenario) => {
      if (selectedScenario?.type === 'scenario') {
        selectedScenario.calculateSettings.current = {
          ...selectedScenario.calculateSettings.current,
          ...newSettings,
        };
      }

      return selectedScenario;
    });

    setEdits((edits) => {
      const selScenario = edits.edits.find(
        (e) => e.type === 'scenario' && e.value === selectedScenario.value,
      );
      if (!selScenario || selScenario.type !== 'scenario') return edits;

      selScenario.calculateSettings.current = {
        ...selScenario.calculateSettings.current,
        ...newSettings,
      };

      return {
        count: edits.count + 1,
        edits: edits.edits,
      };
    });
  }, [
    appType,
    inputNumLabs,
    inputNumLabHours,
    inputNumSamplingHours,
    inputNumSamplingPersonnel,
    inputNumSamplingShifts,
    inputNumSamplingTeams,
    inputSamplingLaborCost,
    inputSurfaceArea,
    selectedScenario,
    setEdits,
    setSelectedScenario,
    setUpdateContextValues,
    updateContextValues,
  ]);
}

// Runs sampling plan calculations whenever the
// samples change or the variables on the calculate tab
// change.
export function useCalculateDeconPlan() {
  const { calculateResultsDecon, contaminationMap, setCalculateResultsDecon } =
    useContext(CalculateContext);
  const { trainingMode } = useContext(NavigationContext);
  const {
    defaultDeconSelections,
    displayDimensions,
    edits,
    layers,
    mapView,
    resultsOpen,
    sampleAttributesDecon,
    sceneView,
    sceneViewForArea,
    selectedScenario,
    setEdits,
    setEfficacyResults,
    setJsonDownload,
  } = useContext(SketchContext);
  const lookupFiles = useLookupFiles().data;
  const technologyTypes = lookupFiles.technologyTypes;

  useEffect(() => {
    view = displayDimensions === '2d' ? mapView : sceneView;
  }, [displayDimensions, mapView, sceneView]);

  const [lastScenarioId, setLastScenarioId] = useState('');
  useEffect(() => {
    if (!selectedScenario || selectedScenario?.layerId === lastScenarioId)
      return;
    setLastScenarioId(selectedScenario.layerId);
    setCalculateResultsDecon((calculateResultsDecon) => {
      return {
        status: selectedScenario ? 'fetching' : 'none',
        panelOpen: calculateResultsDecon.panelOpen,
        data: null,
      };
    });
  }, [lastScenarioId, selectedScenario, setCalculateResultsDecon]);

  type ContaminatedAoiAreas = { [planId: string]: { [key: number]: number } };
  const [aoiContamIntersect, setAoiContamIntersect] = useState<{
    contaminatedAoiAreas: ContaminatedAoiAreas;
    graphics: __esri.Graphic[];
  }>({
    contaminatedAoiAreas: {},
    graphics: [],
  });

  useEffect(() => {
    if (
      ['none', 'success'].includes(calculateResultsDecon.status) ||
      !selectedScenario ||
      selectedScenario.type !== 'scenario-decon'
    )
      return;

    // reset the contamination map
    const contamMapUpdated = view?.map.layers.find(
      (l) => l.id === 'contaminationMapUpdated',
    ) as __esri.GraphicsLayer;
    if (contamMapUpdated) contamMapUpdated.removeAll();

    async function performCalculations() {
      if (selectedScenario?.type !== 'scenario-decon' || !mapView) return;

      const linkedDeconOperations: LayerDeconEditsType[] = [];
      const linkedAoiCharacterizationIds: string[] = [];
      const linkedAoiCharacterizations: LayerAoiAnalysisEditsType[] = [];
      const editsCopy: EditsType = edits;
      editsCopy.edits.forEach((edit) => {
        if (
          edit.type !== 'layer-decon' ||
          !selectedScenario.linkedLayerIds.includes(edit.layerId)
        )
          return;

        linkedDeconOperations.push(edit);

        const aoi = editsCopy.edits.find(
          (e) =>
            e.type === 'layer-aoi-analysis' &&
            e.layerId === edit.analysisLayerId,
        ) as LayerAoiAnalysisEditsType | undefined;
        if (aoi) {
          linkedAoiCharacterizations.push(aoi);
          linkedAoiCharacterizationIds.push(edit.analysisLayerId);
        }
      });

      const contaminatedAoiAreas: ContaminatedAoiAreas = {};
      const contaminationPercentages: ContaminationPercentages = {};
      const planBuildingCfu: PlanBuildingCfu = {};
      if (
        contaminationMap &&
        contaminationMap?.sketchLayer?.type === 'graphics'
      ) {
        // loop through structures
        linkedAoiCharacterizations.forEach((characterizationLayer) => {
          const buildingLayerEdits = characterizationLayer.layers.find(
            (l) => l.layerType === 'AOI Assessed',
          );
          const buildingLayer = layers.find(
            (l) => l.layerId === buildingLayerEdits?.layerId,
          );
          if (!buildingLayer || buildingLayer.sketchLayer?.type !== 'graphics')
            return;

          buildingLayer.sketchLayer.graphics.forEach((graphic) => {
            // loop through contamination map features
            (
              contaminationMap.sketchLayer as __esri.GraphicsLayer
            ).graphics.forEach((contamGraphic) => {
              // call intersect to see if decon app intersects contamination map
              if (
                !graphic.geometry ||
                !contamGraphic.geometry ||
                !geometryEngine.intersects(
                  graphic.geometry,
                  contamGraphic.geometry,
                )
              ) {
                return;
              }

              const {
                CONTAMVAL,
                INTERIOR,
                EXTERIOR,
                BRICK,
                CONCRETE,
                STEEL,
                WOOD,
                OTHER,
              } = contamGraphic.attributes;

              const plumeCfu = CONTAMVAL;

              // lookup decon selection
              let originalCfu = 0;
              let newCfu = 0;
              const deconOp = linkedDeconOperations.find(
                (op) => op.analysisLayerId === characterizationLayer.layerId,
              ) as LayerDeconEditsType | undefined;
              if (deconOp) {
                const approach = deconOp.approach;
                const buildingApproach = deconOp.buildingApproach;
                const mediaKey =
                  approach === 'Basic'
                    ? 'Advanced - Building Structural Component'
                    : `${approach}${approach === 'Advanced' ? ` - ${buildingApproach}` : ''}`;

                // find decon tech selections
                const basicBuildingDeconTech =
                  deconOp.deconTechSelections?.find(
                    (t) => t.media === 'Buildings (Interior and Exterior)',
                  );
                const buildingTech = deconOp.deconTechSelections?.filter(
                  (t) =>
                    mediaLookup[mediaKey].includes(t.media) &&
                    !outsideMedia.includes(t.media),
                );
                buildingTech?.forEach((tech) => {
                  let mediaCfu = plumeCfu;

                  if (tech.media === 'Building Exteriors' && EXTERIOR)
                    mediaCfu = EXTERIOR;
                  if (tech.media === 'Building Interiors' && INTERIOR)
                    mediaCfu = INTERIOR;
                  if (tech.media === 'Brick Buildings' && BRICK)
                    mediaCfu = BRICK;
                  if (tech.media === 'Concrete Buildings' && CONCRETE)
                    mediaCfu = CONCRETE;
                  if (tech.media === 'Steel Buildings' && STEEL)
                    mediaCfu = STEEL;
                  if (tech.media === 'Wood Buildings' && WOOD) mediaCfu = WOOD;
                  if (tech.media === 'Other Buildings' && OTHER)
                    mediaCfu = OTHER;

                  originalCfu += mediaCfu;

                  const deconTech =
                    sampleAttributesDecon[
                      approach === 'Basic'
                        ? basicBuildingDeconTech?.deconTech?.value
                        : tech.deconTech?.value
                    ];
                  if (!deconTech) {
                    newCfu += mediaCfu;
                    return;
                  }

                  const bldgApproachKey =
                    buildingApproach === 'Building Structural Component' ||
                    approach === 'Basic'
                      ? 'SURFACE_SPECIFIC_PARAMS'
                      : 'MATERIAL_SPECIFIC_PARAMS';

                  const { CONTAM_REMOVAL_FACTOR } =
                    deconTech[bldgApproachKey][
                      tech.media.replace(' Buildings', '')
                    ];

                  const reductionFactor = parseSmallFloat(
                    1 - CONTAM_REMOVAL_FACTOR,
                  );
                  const newMediaCfu = mediaCfu * reductionFactor;
                  newCfu += newMediaCfu;
                });
              }
              graphic.attributes.CONTAMVALPLUME = plumeCfu;
              graphic.attributes.CONTAMVALINITIAL = originalCfu;
              graphic.attributes.CONTAMVAL = newCfu;
              graphic.attributes.CONTAMUNIT =
                contamGraphic.attributes.CONTAMUNIT;
              graphic.attributes.CONTAMTYPE =
                contamGraphic.attributes.CONTAMTYPE;

              const opId =
                linkedDeconOperations.find(
                  (op) => op.analysisLayerId === characterizationLayer.layerId,
                )?.layerId ?? '';
              if (Object.prototype.hasOwnProperty.call(planBuildingCfu, opId)) {
                planBuildingCfu[opId] += plumeCfu;
              } else {
                planBuildingCfu[opId] = plumeCfu;
              }
            });
          });
        });

        // loop through aoi mask layers
        const aoiContamIntersectGraphics: __esri.Graphic[] = [];
        for (const characterization of linkedAoiCharacterizations) {
          const aoiEdits = characterization.layers.find(
            (l) => l.layerType === 'AOI Assessed',
          );
          const aoiLayer = layers.find((l) => l.layerId === aoiEdits?.layerId);
          if (!aoiLayer || aoiLayer.sketchLayer?.type !== 'graphics') return;

          for (const graphic of aoiLayer.sketchLayer.graphics) {
            for (const contamGraphic of (
              contaminationMap.sketchLayer as __esri.GraphicsLayer
            ).graphics) {
              const contamValue = contamGraphic.attributes.CONTAMVAL as number;
              const outGeometry = geometryEngine.intersect(
                graphic.geometry,
                contamGraphic.geometry,
              ) as __esri.Geometry;
              if (!outGeometry) continue;

              const outGraphic = new Graphic({ geometry: outGeometry });
              const originalZ = removeZValues(outGraphic);
              setZValues({
                map: mapView?.map,
                graphic: outGraphic,
                zRefParam: null,
                elevationSampler: null,
                zOverride: originalZ,
              });

              const clippedAreaM2 = await calculateArea(
                outGraphic,
                sceneViewForArea,
              );

              const currArea =
                contaminatedAoiAreas?.[characterization.layerId]?.[contamValue];
              if (typeof clippedAreaM2 === 'number') {
                if (
                  !Object.prototype.hasOwnProperty.call(
                    contaminatedAoiAreas,
                    characterization.layerId,
                  )
                ) {
                  contaminatedAoiAreas[characterization.layerId] = {};
                }
                contaminatedAoiAreas[characterization.layerId][contamValue] =
                  currArea ? currArea + clippedAreaM2 : clippedAreaM2;
              }

              aoiContamIntersectGraphics.push(
                new Graphic({
                  attributes: contamGraphic.attributes,
                  geometry: outGeometry,
                }),
              );
            }
          }
        }

        setAoiContamIntersect({
          contaminatedAoiAreas,
          graphics: aoiContamIntersectGraphics,
        });

        Object.keys(contaminatedAoiAreas).forEach((characterizationId: any) => {
          const characterization = linkedAoiCharacterizations.find(
            (c) => c.layerId === characterizationId,
          );
          if (!characterization) return;

          const totalAoiSqM = characterization.aoiSummary.totalAoiSqM;
          Object.keys(contaminatedAoiAreas[characterizationId]).forEach(
            (key: any) => {
              if (
                !Object.prototype.hasOwnProperty.call(
                  contaminationPercentages,
                  characterizationId,
                )
              ) {
                contaminationPercentages[characterizationId] = {};
              }
              contaminationPercentages[characterizationId][key] =
                contaminatedAoiAreas[characterizationId][key] / totalAoiSqM;
            },
          );
        });
      }

      let atLeastOneDeconTechSelection = false;
      linkedDeconOperations.forEach((deconOp) => {
        deconOp.deconTechSelections?.forEach((tech) => {
          if (tech.deconTech && tech.deconTech.value !== 'none')
            atLeastOneDeconTechSelection = true;
        });
      });
      if (!atLeastOneDeconTechSelection) {
        setCalculateResultsDecon({
          status: 'none',
          panelOpen: false,
          data: null,
        });
        return;
      }

      const jsonDownload: JsonDownloadType[] = [];

      // perform calculations off percentAOI stuff
      let totalSolidWasteM3 = 0;
      let totalLiquidWasteM3 = 0;
      let totalSolidWasteMass = 0;
      let totalLiquidWasteMass = 0;
      let totalDeconCost = 0;
      let totalDeconTime = 0;
      linkedDeconOperations.forEach((deconOp) => {
        if (!deconOp.deconLayerResults) return;

        const approach = deconOp.approach;
        const buildingApproach = deconOp.buildingApproach;
        const jsonDownloadOpLevel: JsonDownloadType[] = [];
        deconOp.deconLayerResults.resultsTable = [];
        deconOp.deconLayerResults.cost = 0;
        deconOp.deconLayerResults.time = 0;
        deconOp.deconLayerResults.wasteMass = 0;
        deconOp.deconLayerResults.wasteVolume = 0;
        const curDeconTechSelections =
          deconOp.deconTechSelections && deconOp.deconTechSelections?.length > 0
            ? deconOp.deconTechSelections
            : defaultDeconSelections;
        curDeconTechSelections.forEach((sel) => {
          // find decon settings
          const deconTech = sel.deconTech?.value;

          const media = sel.media;
          if (!deconTech || deconTech === 'none') {
            sel.avgFinalContamination = sel.avgCfu;
            sel.aboveDetectionLimit =
              sel.avgCfu >= technologyTypes.limitOfDetection;
            return;
          }

          const mediaKey = `${approach}${approach === 'Advanced' ? ` - ${buildingApproach}` : ''}`;
          if (!mediaLookup[mediaKey].includes(media)) return;

          let deconCost = 0;
          let deconTime = 0;
          let solidWasteM3 = 0;
          let liquidWasteM3 = 0;
          let solidWasteMass = 0;
          let liquidWasteMass = 0;
          if (
            deconOp.approach === 'Basic' &&
            media === 'Buildings (Interior and Exterior)'
          ) {
            const filteredMedia = curDeconTechSelections.filter((media) =>
              ['Building Exteriors', 'Building Interiors'].includes(
                media.media,
              ),
            );
            filteredMedia.forEach((mediaSel) => {
              const calcOutput = performBasicDeconCalculations(
                deconTech,
                mediaSel,
                sampleAttributesDecon[deconTech as any],
                technologyTypes.limitOfDetection,
                jsonDownloadOpLevel,
                undefined,
                false,
              );
              deconCost += calcOutput.deconCost;
              deconTime = Math.max(calcOutput.deconTime, deconTime);
              solidWasteM3 += calcOutput.solidWasteM3;
              liquidWasteM3 += calcOutput.liquidWasteM3;
              solidWasteMass += calcOutput.solidWasteMass;
              liquidWasteMass += calcOutput.liquidWasteMass;
            });
          } else if (
            deconOp.approach === 'Advanced' &&
            buildingApproach === 'Building Primary Material Composition' &&
            !outsideMedia.includes(media)
          ) {
            sel.subRows.forEach((mediaSel: any) => {
              const deconTech = mediaSel.deconTech?.value;
              if (!deconTech || ['none', 'multiple'].includes(deconTech))
                return;

              const calcOutput = performBasicDeconCalculations(
                deconTech,
                mediaSel,
                sampleAttributesDecon[deconTech as any],
                technologyTypes.limitOfDetection,
                jsonDownloadOpLevel,
                media,
              );
              deconCost += calcOutput.deconCost;
              deconTime = Math.max(calcOutput.deconTime, deconTime);
              solidWasteM3 += calcOutput.solidWasteM3;
              liquidWasteM3 += calcOutput.liquidWasteM3;
              solidWasteMass += calcOutput.solidWasteMass;
              liquidWasteMass += calcOutput.liquidWasteMass;
            });
          } else {
            ({
              deconCost,
              deconTime,
              solidWasteM3,
              liquidWasteM3,
              solidWasteMass,
              liquidWasteMass,
            } = performBasicDeconCalculations(
              deconTech,
              sel,
              sampleAttributesDecon[deconTech as any],
              technologyTypes.limitOfDetection,
              jsonDownloadOpLevel,
            ));
          }

          if (deconOp.deconLayerResults) {
            deconOp.deconLayerResults.cost += deconCost;
            deconOp.deconLayerResults.time = Math.max(
              deconTime,
              deconOp.deconLayerResults.time,
            );
            deconOp.deconLayerResults.wasteVolume +=
              solidWasteM3 + liquidWasteM3;
            deconOp.deconLayerResults.wasteMass +=
              solidWasteMass + liquidWasteMass;
          }

          totalSolidWasteM3 += solidWasteM3;
          totalLiquidWasteM3 += liquidWasteM3;
          totalSolidWasteMass += solidWasteMass;
          totalLiquidWasteMass += liquidWasteMass;
          totalDeconCost += deconCost;
          totalDeconTime = Math.max(deconTime, totalDeconTime);
        });

        deconOp.deconLayerResults.resultsTable = jsonDownloadOpLevel;
        jsonDownload.push(...jsonDownloadOpLevel);
      });

      const jsonDownloadSummarized: JsonDownloadType[] = [];
      const scenariosIncluded: string[] = [];
      jsonDownload.forEach((item) => {
        if (scenariosIncluded.includes(item.contaminationScenario)) return;
        scenariosIncluded.push(item.contaminationScenario);
      });
      scenariosIncluded.forEach((scenario) => {
        const scenarioItems = jsonDownload.filter(
          (j) => j.contaminationScenario === scenario,
        );

        const tech: { [deconTech: string]: JsonDownloadType } = {};
        scenarioItems.forEach((item) => {
          const deconTech = item.decontaminationTechnology;
          if (Object.prototype.hasOwnProperty.call(tech, deconTech)) {
            tech[deconTech].decontaminationCost += item.decontaminationCost;
            tech[deconTech].decontaminationTimeDays +=
              item.decontaminationTimeDays;
            tech[deconTech].solidWasteVolumeM3 += item.solidWasteVolumeM3;
            tech[deconTech].liquidWasteVolumeM3 += item.liquidWasteVolumeM3;
            tech[deconTech].solidWasteMassKg += item.solidWasteMassKg;
            tech[deconTech].liquidWasteMassKg += item.liquidWasteMassKg;
          } else {
            tech[deconTech] = {
              ...item,
            };
          }
        });

        Object.values(tech).forEach((deconTech) => {
          jsonDownloadSummarized.push(deconTech);
        });
      });

      const resultObject: CalculateResultsDeconDataType = {
        // assign counts
        'Solid Waste Volume': totalSolidWasteM3,
        'Liquid Waste Volume': totalLiquidWasteM3,
        'Solid Waste Mass': totalSolidWasteMass,
        'Liquid Waste Mass': totalLiquidWasteMass,
        WASTE_VOLUME_TOTAL: totalSolidWasteM3 + totalLiquidWasteM3,
        WASTE_WEIGHT_TOTAL: totalSolidWasteMass + totalLiquidWasteMass,

        //totals
        TOTAL_COST: totalDeconCost,
        TOTAL_TIME: Math.round(totalDeconTime * 10) / 10,
        'Contamination Type': '',
        resultsTable: jsonDownloadSummarized,
      };

      linkedDeconOperations.forEach((deconOp) => {
        deconOp.deconSummaryResults = {
          ...deconOp.deconSummaryResults,
          calculateResults: resultObject,
        };
      });

      setEdits(editsCopy);

      setJsonDownload(jsonDownloadSummarized);

      // display loading spinner for 1 second
      setCalculateResultsDecon((calculateResultsDecon) => {
        return {
          status: 'success',
          panelOpen: calculateResultsDecon.panelOpen,
          data: resultObject,
        };
      });
    }
    performCalculations();
  }, [
    calculateResultsDecon,
    contaminationMap,
    defaultDeconSelections,
    edits,
    layers,
    mapView,
    sampleAttributesDecon,
    sceneViewForArea,
    selectedScenario,
    setCalculateResultsDecon,
    setEdits,
    setJsonDownload,
    technologyTypes,
  ]);

  useEffect(() => {
    if (calculateResultsDecon.status === 'failure') return;
    if (!selectedScenario || selectedScenario.type !== 'scenario-decon') return;

    async function performCalculations() {
      if (!selectedScenario || selectedScenario.type !== 'scenario-decon')
        return;

      const contaminationGraphicsClone: __esri.Graphic[] = [];
      let contamMap: LayerType | null = null;
      if (trainingMode) contamMap = contaminationMap;
      if (!trainingMode && selectedScenario.portalId) {
        const editLayer = edits.edits.find(
          (e) =>
            e.type === 'layer' &&
            e.layerType === 'Contamination Map' &&
            e.portalId === selectedScenario.portalId,
        );
        const layer = layers.find((l) => l.layerId === editLayer?.layerId);
        if (layer) contamMap = layer;
      }

      if (contamMap?.sketchLayer?.type === 'graphics') {
        contaminationGraphicsClone.push(
          ...contamMap.sketchLayer.graphics.clone().toArray(),
        );
      }

      const linkedDeconOperations: LayerDeconEditsType[] = [];
      const linkedAoiCharacterizationIds: string[] = [];
      const linkedAoiCharacterizations: LayerAoiAnalysisEditsType[] = [];
      edits.edits.forEach((edit) => {
        if (
          edit.type !== 'layer-decon' ||
          !selectedScenario.linkedLayerIds.includes(edit.layerId)
        )
          return;

        linkedDeconOperations.push(edit);

        const aoi = edits.edits.find(
          (e) =>
            e.type === 'layer-aoi-analysis' &&
            e.layerId === edit.analysisLayerId,
        ) as LayerAoiAnalysisEditsType | undefined;
        if (aoi) {
          linkedAoiCharacterizations.push(aoi);
          linkedAoiCharacterizationIds.push(edit.analysisLayerId);
        }
      });

      let newContamGraphics: __esri.Graphic[] = [];
      for (const deconOp of linkedDeconOperations) {
        // tie graphics and imageryGraphics to a scenario
        const aoiLayerEdits = linkedAoiCharacterizations.find(
          (c) => c.layerId === deconOp.analysisLayerId,
        );
        const deconMaskEdits = aoiLayerEdits?.layers.find(
          (l) => l.layerType === 'Decon Mask',
        );
        const aoiAssessedEdits = aoiLayerEdits?.layers.find(
          (l) => l.layerType === 'AOI Assessed',
        );
        const deconAoiLayer =
          layers.find(
            (l) =>
              l.layerType === 'Decon Mask' &&
              l.layerId === deconMaskEdits?.layerId,
          ) ?? null;
        const buildingLayer =
          layers.find(
            (l) =>
              l.layerType === 'AOI Assessed' &&
              l.layerId === aoiAssessedEdits?.layerId,
          ) ?? null;

        const curDeconTechSelections =
          deconOp.deconTechSelections && deconOp.deconTechSelections?.length > 0
            ? deconOp.deconTechSelections
            : defaultDeconSelections;
        let hasDeconTech = false;

        const aoiLayerGraphics =
          deconAoiLayer && deconAoiLayer.sketchLayer?.type === 'graphics'
            ? deconAoiLayer.sketchLayer.graphics.toArray()
            : [];
        for (const graphic of aoiLayerGraphics) {
          const currContamGraphics =
            newContamGraphics.length > 0
              ? [...newContamGraphics]
              : contaminationGraphicsClone;
          newContamGraphics = [];
          for (const contamGraphic of currContamGraphics) {
            // call intersect to see if decon app intersects contamination map
            if (
              !graphic.geometry ||
              !contamGraphic.geometry ||
              !geometryEngine.intersects(
                graphic.geometry,
                contamGraphic.geometry,
              )
            ) {
              contamGraphic.attributes.EXTERIOR = null;
              contamGraphic.attributes.INTERIOR = null;
              contamGraphic.attributes.BRICK = null;
              contamGraphic.attributes.CONCRETE = null;
              contamGraphic.attributes.STEEL = null;
              contamGraphic.attributes.WOOD = null;
              contamGraphic.attributes.OTHER = null;
              newContamGraphics.push(contamGraphic);
              continue;
            }

            const deconContainsContam = geometryEngine.contains(
              graphic.geometry,
              contamGraphic.geometry,
            );

            // cut a hole in contamination map using result geometry from above step
            const newOuterContamGeometry = deconContainsContam
              ? null
              : geometryEngine.difference(
                  contamGraphic.geometry,
                  graphic.geometry,
                );

            // create new geometry to fill in the hole
            const newInnerContamGeometry = geometryEngine.intersect(
              graphic.geometry,
              contamGraphic.geometry,
            );
            const innerGeometry = Array.isArray(newInnerContamGeometry)
              ? newInnerContamGeometry
              : [newInnerContamGeometry];

            const approach = deconOp.approach;
            const buildingApproach = deconOp.buildingApproach;
            const mediaKey =
              approach === 'Basic'
                ? 'Advanced - Building Structural Component'
                : `${approach}${approach === 'Advanced' ? ` - ${buildingApproach}` : ''}`;
            const basicBuildingDeconTech = curDeconTechSelections.find(
              (t) => t.media === 'Buildings (Interior and Exterior)',
            );
            const buildingTech = curDeconTechSelections.filter((t) =>
              mediaLookup[mediaKey].includes(t.media),
            );

            let CONTAMVALEXTERIOR = contamGraphic.attributes.EXTERIOR;
            let CONTAMVALINTERIOR = contamGraphic.attributes.INTERIOR;
            let CONTAMVALBRICK = contamGraphic.attributes.BRICK;
            let CONTAMVALCONCRETE = contamGraphic.attributes.CONCRETE;
            let CONTAMVALSTEEL = contamGraphic.attributes.STEEL;
            let CONTAMVALWOOD = contamGraphic.attributes.WOOD;
            let CONTAMVALOTHER = contamGraphic.attributes.OTHER;
            let totalSurfaceRemovalFactor = 0;
            let surfaceRemovalCount = 0;
            for (const sel of buildingTech) {
              if (sel.deconTech && sel.deconTech.value !== 'none')
                hasDeconTech = true;

              if (
                sel.media.includes('Building') &&
                buildingLayer?.sketchLayer?.type === 'graphics'
              ) {
                for (const graphic of buildingLayer.sketchLayer.graphics) {
                  if (!graphic.attributes.CONTAMTYPE) continue;
                  if (
                    !graphic.geometry ||
                    !contamGraphic.geometry ||
                    !geometryEngine.intersects(
                      graphic.geometry,
                      contamGraphic.geometry,
                    )
                  ) {
                    continue;
                  }

                  const {
                    INTERIOR,
                    EXTERIOR,
                    BRICK,
                    CONCRETE,
                    STEEL,
                    WOOD,
                    OTHER,
                  } = contamGraphic.attributes;
                  let mediaCfu = graphic.attributes.CONTAMVALPLUME;

                  if (sel.media === 'Building Exteriors' && EXTERIOR)
                    mediaCfu = EXTERIOR;
                  if (sel.media === 'Building Interiors' && INTERIOR)
                    mediaCfu = INTERIOR;
                  if (sel.media === 'Brick Buildings' && BRICK)
                    mediaCfu = BRICK;
                  if (sel.media === 'Concrete Buildings' && CONCRETE)
                    mediaCfu = CONCRETE;
                  if (sel.media === 'Steel Buildings' && STEEL)
                    mediaCfu = STEEL;
                  if (sel.media === 'Wood Buildings' && WOOD) mediaCfu = WOOD;
                  if (sel.media === 'Other Buildings' && OTHER)
                    mediaCfu = OTHER;

                  const deconTech =
                    sampleAttributesDecon[
                      approach === 'Basic'
                        ? basicBuildingDeconTech?.deconTech?.value
                        : sel.deconTech?.value
                    ];
                  if (!deconTech) continue;

                  const bldgApproachKey =
                    buildingApproach === 'Building Structural Component' ||
                    approach === 'Basic'
                      ? 'SURFACE_SPECIFIC_PARAMS'
                      : 'MATERIAL_SPECIFIC_PARAMS';

                  const { CONTAM_REMOVAL_FACTOR } =
                    deconTech[bldgApproachKey][
                      sel.media.replace(' Buildings', '')
                    ];

                  const contamReductionFactor = parseSmallFloat(
                    1 - CONTAM_REMOVAL_FACTOR,
                  );
                  const avgCfu = mediaCfu * contamReductionFactor;

                  if (sel.media === 'Building Exteriors')
                    CONTAMVALEXTERIOR = avgCfu;
                  if (sel.media === 'Building Interiors')
                    CONTAMVALINTERIOR = avgCfu;
                  if (sel.media === 'Brick Buildings') CONTAMVALBRICK = avgCfu;
                  if (sel.media === 'Concrete Buildings')
                    CONTAMVALCONCRETE = avgCfu;
                  if (sel.media === 'Steel Buildings') CONTAMVALSTEEL = avgCfu;
                  if (sel.media === 'Wood Buildings') CONTAMVALWOOD = avgCfu;
                  if (sel.media === 'Other Buildings') CONTAMVALOTHER = avgCfu;
                }
              } else {
                surfaceRemovalCount += 1;
                if (
                  !sel.pctAoi ||
                  !sel.deconTech ||
                  sel.deconTech.value === 'none'
                )
                  continue;

                const { CONTAM_REMOVAL_FACTOR } =
                  sampleAttributesDecon[sel.deconTech.value][
                    'SURFACE_SPECIFIC_PARAMS'
                  ][sel.media];
                totalSurfaceRemovalFactor += CONTAM_REMOVAL_FACTOR;
              }
            }

            const avgSurfaceRemovalFactor =
              totalSurfaceRemovalFactor / surfaceRemovalCount;
            const avgSurfaceReductionFactor = parseSmallFloat(
              1 - avgSurfaceRemovalFactor,
            );
            const CONTAMVAL =
              contamGraphic.attributes.CONTAMVAL * avgSurfaceReductionFactor;

            if (newOuterContamGeometry) {
              const geometry = Array.isArray(newOuterContamGeometry)
                ? newOuterContamGeometry
                : [newOuterContamGeometry];
              for (const geom of geometry) {
                newContamGraphics.push(
                  new Graphic({
                    attributes: {
                      ...contamGraphic.attributes,
                      EXTERIOR: null,
                      INTERIOR: null,
                      BRICK: null,
                      CONCRETE: null,
                      STEEL: null,
                      WOOD: null,
                      OTHER: null,
                    },
                    geometry: geom,
                    symbol: contamGraphic.symbol,
                    popupTemplate: {
                      title: '',
                      content: contaminationMapPopup,
                    },
                  }),
                );
              }
            }

            for (const geom of innerGeometry) {
              let newCfu = CONTAMVAL;
              if (CONTAMVALEXTERIOR > newCfu) newCfu = CONTAMVALEXTERIOR;
              if (CONTAMVALINTERIOR > newCfu) newCfu = CONTAMVALINTERIOR;
              if (CONTAMVALBRICK > newCfu) newCfu = CONTAMVALBRICK;
              if (CONTAMVALCONCRETE > newCfu) newCfu = CONTAMVALCONCRETE;
              if (CONTAMVALSTEEL > newCfu) newCfu = CONTAMVALSTEEL;
              if (CONTAMVALWOOD > newCfu) newCfu = CONTAMVALWOOD;
              if (CONTAMVALOTHER > newCfu) newCfu = CONTAMVALOTHER;

              newContamGraphics.push(
                new Graphic({
                  attributes: {
                    ...contamGraphic.attributes,
                    CONTAMVAL, // plume reductions
                    EXTERIOR: CONTAMVALEXTERIOR,
                    INTERIOR: CONTAMVALINTERIOR,
                    BRICK: CONTAMVALBRICK,
                    CONCRETE: CONTAMVALCONCRETE,
                    STEEL: CONTAMVALSTEEL,
                    WOOD: CONTAMVALWOOD,
                    OTHER: CONTAMVALOTHER,
                  },
                  geometry: geom,
                  symbol: !window.location.search.includes('devMode=true')
                    ? contamGraphic.symbol
                    : newCfu < technologyTypes.limitOfDetection
                      ? ({
                          type: 'simple-fill',
                          color: [0, 255, 0],
                          outline: {
                            color: [0, 0, 0],
                          },
                        } as any)
                      : ({
                          type: 'simple-fill',
                          color: [255, 255, 255],
                          outline: {
                            color: [255, 0, 0],
                          },
                        } as any),
                  popupTemplate: {
                    title: '',
                    content: contaminationMapPopup,
                  },
                }),
              );
            }
          }
        }

        const aoiAssessed =
          layers.find(
            (l) =>
              l.layerType === 'AOI Assessed' &&
              l.layerId === aoiLayerEdits?.layerId,
          ) ?? null;
        if (aoiAssessed) {
          const aoiAssessedLayer = layers.find(
            (l) => l.layerId === aoiAssessed.layerId,
          );

          if (
            aoiAssessedLayer?.sketchLayer?.type === 'graphics' &&
            buildingLayer?.sketchLayer?.type === 'graphics'
          ) {
            aoiAssessedLayer?.sketchLayer.graphics.removeAll();
            aoiAssessedLayer?.sketchLayer.graphics.addMany(
              buildingLayer.sketchLayer.graphics.map((g) => {
                if (!g.attributes.CONTAMTYPE || !hasDeconTech) return g;

                const newG = g.clone();
                if (window.location.search.includes('devMode=true')) {
                  (newG.symbol as any).outline.color =
                    g.attributes.CONTAMVAL < technologyTypes.limitOfDetection
                      ? 'green'
                      : 'red';
                  (newG.symbol as any).outline.width = 2;
                }

                return newG;
              }),
            );
          }
        }
      }

      const contamMapUpdated = view?.map.layers.find(
        (l) => l.id === 'contaminationMapUpdated',
      ) as __esri.GraphicsLayer;
      if (contamMapUpdated) {
        contamMapUpdated.removeAll();
        newContamGraphics.forEach((g, index) => {
          const uuid = generateUUID();
          g.attributes.GLOBALID = uuid;
          g.attributes.PERMANENT_IDENTIFIER = uuid;
          g.attributes.OBJECTID = index;
          g.attributes.ID = index;
          g.attributes.FID = index;
        });
        contamMapUpdated.addMany(newContamGraphics);
      }
    }

    performCalculations();
  }, [
    aoiContamIntersect,
    calculateResultsDecon,
    contaminationMap,
    defaultDeconSelections,
    edits,
    layers,
    sampleAttributesDecon,
    sceneViewForArea,
    selectedScenario,
    setEfficacyResults,
    technologyTypes,
    trainingMode,
  ]);

  useEffect(() => {
    if (!resultsOpen || !contaminationMap || !contaminationMap.sketchLayer)
      return;
    if (window.location.search.includes('devMode=true'))
      contaminationMap.sketchLayer.listMode = 'show';

    const contamMapUpdated = mapView?.map.layers.find(
      (l) => l.id === 'contaminationMapUpdated',
    ) as __esri.GraphicsLayer;
    if (contamMapUpdated) {
      if (window.location.search.includes('devMode=true'))
        contamMapUpdated.listMode = 'show';
    }
  }, [contaminationMap, mapView, resultsOpen]);

  useEffect(() => {
    console.log('calculateResultsDecon: ', calculateResultsDecon);
  }, [calculateResultsDecon]);
}

// Allows using a dynamicPopup that has access to react state/context.
// This is primarily needed for sample popups.
export function useDynamicPopup(appType: AppType) {
  const { edits, setEdits, layers } = useContext(SketchContext);
  const layerProps = useLookupFiles().data.layerProps;

  const getSampleTemplate = (
    feature: any,
    fieldInfos: FieldInfos,
    includeControls: boolean,
  ) => {
    const content = (
      <MapPopup
        appType={appType}
        features={[feature]}
        edits={edits}
        setEdits={setEdits}
        layers={layers}
        fieldInfos={fieldInfos}
        layerProps={layerProps}
        includeControls={includeControls}
        onClick={handlePopupClick}
      />
    );

    // wrap the content for esri
    const contentContainer = document.createElement('div');
    createRoot(contentContainer).render(content);

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
    includeControls: boolean = true,
  ) {
    const numberFormat = { digitSeparator: true, places: 2 };

    if (type === 'Sampling Mask') {
      const actions = new Collection<any>();
      if (includeControls) {
        actions.addMany([
          {
            title: 'Delete Sample',
            id: 'delete',
            className: 'esri-icon-trash',
          },
        ]);
      }

      return {
        title: '',
        content: [
          {
            type: 'fields',
            fieldInfos: [{ fieldName: 'TYPE', label: 'Type' }],
          },
        ],
        actions,
      };
    }
    if (type === 'Decon Mask') {
      const actions = new Collection<any>();
      if (includeControls) {
        actions.addMany([
          {
            title: 'Delete Decon Technology',
            id: 'delete',
            className: 'esri-icon-trash',
          },
        ]);
      }

      return {
        title: '',
        content: [
          {
            type: 'fields',
            fieldInfos: [{ fieldName: 'TYPE', label: 'Type' }],
          },
        ],
        actions,
      };
    }
    if (type === 'Staging Area Mask') {
      const actions = new Collection<any>();
      if (includeControls) {
        actions.addMany([
          {
            title: 'Delete Staging Area',
            id: 'delete',
            className: 'esri-icon-trash',
          },
        ]);
      }

      return {
        title: 'Staging Area',
        content: [
          {
            type: 'fields',
            fieldInfos: [
              { fieldName: 'TYPE', label: 'Type' },
              { fieldName: 'AREA', label: 'Area (m²)', format: numberFormat },
              {
                fieldName: 'SOLID_WASTE_CAPACITY',
                label: 'Solid Waste Capacity (m³)',
                format: numberFormat,
              },
              {
                fieldName: 'LIQUID_WASTE_CAPACITY',
                label: 'Liquid Waste Capacity (m³)',
                format: numberFormat,
              },
            ],
          },
        ],
        actions,
      };
    }
    if (type === 'Area of Interest' || (type === 'Samples' && isDecon())) {
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
    if ((type === 'Samples' || type === 'VSP') && !isDecon()) {
      const fieldInfos = [
        { fieldName: 'DECISIONUNIT', label: 'Layer' },
        { fieldName: 'TYPE', label: 'Sample Type' },
        { fieldName: 'SA', label: 'Reference Surface Area (sq inch)' },
        { fieldName: 'AA', label: 'Actual Surface Area (sq inch)' },
        { fieldName: 'AC', label: 'Equivalent TOTS Samples' },
        // {
        //   fieldName: 'TCPS',
        //   label: 'Total Cost Per Sample (Labor + Material + Waste)',
        // },
        { fieldName: 'Notes', label: 'Notes' },
        { fieldName: 'ALC', label: 'Analysis Labor Cost ($)' },
        { fieldName: 'AMC', label: 'Analysis Material Cost ($)' },
        { fieldName: 'MCPS', label: 'Sampling Material Cost ($/sample)' },
        {
          fieldName: 'TTPK',
          label: 'Time to Prepare Kits (person hrs/sample)',
        },
        { fieldName: 'TTC', label: 'Time to Collect (person hrs/sample)' },
        { fieldName: 'TTA', label: 'Time to Analyze (person hrs/sample)' },
        // {
        //   fieldName: 'TTPS',
        //   label: 'Total Time per Sample (person hrs/sample)',
        // },
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
      if (includeControls) {
        actions.addMany([
          {
            title: isDecon() ? 'Delete Decon' : 'Delete Sample',
            id: 'delete',
            className: 'esri-icon-trash',
          },
          {
            title: 'View In Table',
            id: 'table',
            className: 'esri-icon-table',
          },
        ]);
      }

      return {
        title: '',
        content: (feature: any) =>
          getSampleTemplate(feature, fieldInfos, includeControls),
        actions,
      };
    }
    if (type === 'AOI Assessed') {
      const actions = new Collection<any>();
      if (includeControls) {
        actions.addMany([
          {
            title: 'View In Table',
            id: 'table',
            className: 'esri-icon-table',
          },
        ]);
      }

      return {
        title: '',
        content: buildingMapPopup,
        actions,
      };
    }
    if (type === 'Image Analysis') {
      return {
        title: '',
        content: imageryAnalysisMapPopup,
      };
    }

    return {};
  };
}

// Custom utility for sketching in 3D scene view. Currently, the ArcGIS JS
// sketch utilities don't support recording Z axis values.
let clickEvent: IHandle | null = null;
let doubleClickEvent: IHandle | null = null;
let moveEvent: IHandle | null = null;
let popupEvent: IHandle | null = null;
let sketchVMG: SketchViewModelType | null = null;
let tempSketchLayer: __esri.GraphicsLayer | null = null;
export function use3dSketch(appType: AppType) {
  const { userInfo } = useContext(AuthenticationContext);
  const { getTrainingMode } = useContext(NavigationContext);
  const {
    displayDimensions,
    edits,
    layers,
    map,
    sceneView,
    selectedScenario,
    setEdits,
    setLayers,
    setSelectedScenario,
    setSketchLayer,
    sketchLayer,
    sketchVM,
  } = useContext(SketchContext);
  const getPopupTemplate = useDynamicPopup(appType);

  const [geometry, setGeometry] = useState<
    __esri.Point | __esri.Polygon | null
  >(null);

  // syncs the sketchVMG variable with the sketchVM context value
  useEffect(() => {
    sketchVMG = sketchVM;
  }, [displayDimensions, sketchVM]);

  // turns off the 3D sketch tools
  const endSketch = useCallback(() => {
    try {
      if (sketchVMG) sketchVMG[displayDimensions].cancel();
      if (clickEvent) clickEvent.remove();
      if (doubleClickEvent) doubleClickEvent.remove();
      if (moveEvent) moveEvent.remove();
      if (popupEvent) popupEvent.remove();
    } catch (ex) {
      console.error(ex);
    }

    if (map && tempSketchLayer) {
      tempSketchLayer?.removeAll();
      map.remove(tempSketchLayer);
    }
  }, [displayDimensions, map]);

  // turns on the 3D sketch tools
  const startSketch = useCallback(
    (tool: 'point' | 'polygon') => {
      if (!map || !sceneView || !sketchVMG) return;

      endSketch();

      if (displayDimensions === '2d') {
        sketchVMG[displayDimensions].create(tool);
        return;
      }

      // turn the popups off while the 3D sketch tools are active
      const popupEvt = reactiveUtils.watch(
        () => sceneView.popup.visible,
        () => {
          if (sceneView.popup.visible) {
            sceneView.popup.visible = false;
          }
        },
      );
      popupEvent = popupEvt;

      const tmpSketchLayer = new GraphicsLayer({
        listMode: 'hide',
      });
      map.add(tmpSketchLayer);
      tempSketchLayer = tmpSketchLayer;

      // clean out temp sketch graphics
      function removeTempGraphics() {
        // delete last mouse position graphic
        const graphicsToRemove: __esri.Graphic[] = [];
        tmpSketchLayer.graphics.forEach((graphic) => {
          if (
            ['addVertex', 'addVertexLine', 'addPolygon'].includes(
              graphic.attributes.type,
            )
          ) {
            graphicsToRemove.push(graphic);
          }
        });
        tmpSketchLayer.removeMany(graphicsToRemove);
      }

      // Get the clicked location including 3D sceneview graphics
      function getClickedPoint(hitRes: __esri.SceneViewHitTestResult) {
        if (hitRes.results.length === 0) return hitRes.ground.mapPoint;

        // filter out temp sketch graphics
        const filteredResults = hitRes.results.filter(
          (result: any) =>
            !['addVertex', 'addVertexLine', 'addPolygon'].includes(
              result?.graphic?.attributes?.type,
            ),
        );

        if (filteredResults.length === 0) return hitRes.ground.mapPoint;
        return filteredResults[0].mapPoint;
      }

      // creates a partial polygon from temp vertices
      function createPolygon(hitRes: __esri.SceneViewHitTestResult) {
        const clickPoint = getClickedPoint(hitRes);

        const vertices = tmpSketchLayer.graphics.filter((graphic) => {
          return graphic.attributes.type === 'vertex';
        });

        const poly = new Polygon({
          spatialReference: clickPoint.spatialReference,
          hasZ: true,
        });

        const clockwiseRing = [
          ...vertices
            .map((graphic) => {
              const vertex: __esri.Point = graphic.geometry as __esri.Point;
              return [vertex.x, vertex.y, vertex.z];
            })
            .toArray(),
          [clickPoint.x, clickPoint.y, clickPoint.z],
        ];
        clockwiseRing.push(clockwiseRing[0]);

        const counterClockwiseRing = [
          [clickPoint.x, clickPoint.y, clickPoint.z],
          ...vertices
            .reverse()
            .map((graphic) => {
              const vertex: __esri.Point = graphic.geometry as __esri.Point;
              return [vertex.x, vertex.y, vertex.z];
            })
            .toArray(),
          [clickPoint.x, clickPoint.y, clickPoint.z],
        ];

        if (poly.isClockwise(clockwiseRing)) {
          poly.rings = [clockwiseRing];
        } else {
          poly.rings = [counterClockwiseRing];
        }

        if (!poly.isClockwise(poly.rings[0]))
          poly.rings = [poly.rings[0].reverse()];

        return poly;
      }

      // creates the line portion of the temp polygon/polyline
      function create3dFillLineGraphic() {
        return [
          new FillSymbol3DLayer({
            outline: {
              color: [30, 30, 30],
              size: '3.5px',
              pattern: new LineStylePattern3D({
                style: 'dash',
              }),
            },
          }),

          new FillSymbol3DLayer({
            outline: {
              color: [240, 240, 240],
              size: '3.5px',
            },
          }),

          new FillSymbol3DLayer({
            outline: {
              color: [30, 30, 30],
              size: '3.7px',
            },
          }),
        ];
      }

      // creates the line portion of the temp polygon/polyline
      function create3dLineGraphic() {
        return [
          new LineSymbol3DLayer({
            pattern: new LineStylePattern3D({
              style: 'dash',
            }),
            material: { color: [30, 30, 30] },
            size: '3.5px',
          }),
          new LineSymbol3DLayer({
            material: { color: [240, 240, 240] },
            size: '3.5px',
          }),
          new LineSymbol3DLayer({
            material: { color: [30, 30, 30] },
            size: '3.7px',
          }),
        ];
      }

      // creates a partial polygon graphic from temp vertices
      function createPolygonGraphic(hitRes: __esri.SceneViewHitTestResult) {
        const polySymbol = sketchVMG?.[displayDimensions].polygonSymbol as any;
        return new Graphic({
          attributes: { type: 'addPolygon' },
          geometry: createPolygon(hitRes),
          symbol: new PolygonSymbol3D({
            symbolLayers: [
              ...create3dFillLineGraphic(),
              new FillSymbol3DLayer({
                material: { color: polySymbol.color },
              }),
            ],
          }),
        });
      }

      // click event used for dropping single vertex for graphic
      const clickEvt = sceneView.on('click', (event) => {
        sceneView.hitTest(event).then((hitRes) => {
          const clickPoint = getClickedPoint(hitRes);

          removeTempGraphics();

          if (tool === 'point') {
            setGeometry(clickPoint);
            return;
          }

          // add the permanent vertex
          tmpSketchLayer.add(
            new Graphic({
              attributes: { type: 'vertex' },
              geometry: {
                type: 'point',
                spatialReference: clickPoint.spatialReference,
                x: clickPoint.x,
                y: clickPoint.y,
                z: clickPoint.z,
              } as any,
              symbol: {
                type: 'simple-marker',
                color: [255, 255, 255],
                size: 6,
                outline: {
                  color: [0, 0, 0],
                  width: 1,
                },
              } as any,
            }),
          );

          // add the permanent line if more than one point
          const vertices = tmpSketchLayer.graphics.filter(
            (graphic) => graphic.attributes.type === 'vertex',
          );
          if (vertices.length > 2) {
            tmpSketchLayer.add(createPolygonGraphic(hitRes));
          }
        });
      });
      clickEvent = clickEvt;

      // double click event used for finishing drawing of graphic
      if (tool === 'polygon') {
        const doubleClickEvt = sceneView.on('double-click', (event) => {
          sceneView.hitTest(event).then((hitRes) => {
            removeTempGraphics();

            const poly = createPolygon(hitRes);

            setGeometry(poly);

            tmpSketchLayer.removeAll();
          });
        });
        doubleClickEvent = doubleClickEvt;
      }

      // pointer move event used for displaying what graphic will look like
      // when user drops the vertex
      const moveEvt = sceneView.on('pointer-move', (event) => {
        sceneView
          .hitTest(event)
          .then((hitRes) => {
            const clickPoint = getClickedPoint(hitRes);

            removeTempGraphics();

            // add in current mouse position graphic
            tmpSketchLayer.add(
              new Graphic({
                attributes: { type: 'addVertex' },
                geometry: {
                  type: 'point',
                  spatialReference: clickPoint.spatialReference,
                  x: clickPoint.x,
                  y: clickPoint.y,
                  z: clickPoint.z,
                } as any,
                symbol: {
                  type: 'simple-marker',
                  color: [255, 127, 0],
                  size: 6,
                  outline: {
                    color: [0, 0, 0],
                    width: 1,
                  },
                } as any,
              }),
            );

            // add in line graphic if more than one point
            const vertices = tmpSketchLayer.graphics.filter((graphic) => {
              return graphic.attributes.type === 'vertex';
            });
            if (vertices.length === 1) {
              const lastGraphic: __esri.Graphic = vertices.getItemAt(
                vertices.length - 1,
              );
              const lastVertex: __esri.Point =
                lastGraphic.geometry as __esri.Point;

              tmpSketchLayer.add(
                new Graphic({
                  attributes: { type: 'addVertexLine' },
                  geometry: {
                    type: 'polyline',
                    spatialReference: clickPoint.spatialReference,
                    paths: [
                      [lastVertex.x, lastVertex.y, lastVertex.z],
                      [clickPoint.x, clickPoint.y, clickPoint.z],
                    ],
                  } as any,
                  symbol: new LineSymbol3D({
                    symbolLayers: create3dLineGraphic(),
                  }),
                }),
              );
            }
            if (vertices.length > 1) {
              const poly = createPolygonGraphic(hitRes);
              tmpSketchLayer.add(poly);
            }
          })
          .catch((error) => {
            console.error(error);
          });
      });
      moveEvent = moveEvt;
    },
    [displayDimensions, endSketch, map, sceneView],
  );

  // save sketched 3d graphic
  useEffect(() => {
    async function processItem() {
      if (!geometry || !tempSketchLayer || !sketchLayer) return;
      if (sketchLayer.sketchLayer?.type === 'feature') return;

      // get the button and it's id
      const button = document.querySelector('.sketch-button-selected');
      const id = (button && button.id)?.replace('draw-sample-', '');
      if (id?.includes('-sampling-mask') || id?.includes('decon-mask')) {
        deactivateButtons();
      }

      if (!id) return;

      // get the predefined attributes using the id of the clicked button
      let attributes: any = {};
      const uuid = generateUUID();
      let layerType: LayerTypeName = 'Samples';
      if (id.includes('-sampling-mask')) {
        layerType = 'Sampling Mask';
        attributes = {
          DECISIONUNITUUID: sketchLayer.sketchLayer?.id ?? '',
          DECISIONUNIT: sketchLayer.sketchLayer?.title ?? '',
          DECISIONUNITSORT: 0,
          PERMANENT_IDENTIFIER: uuid,
          GLOBALID: uuid,
          OBJECTID: -1,
          TYPE: layerType,
        };
      } else if (id.includes('decon-mask')) {
        layerType = 'Decon Mask';
        attributes = {
          DECISIONUNITUUID: sketchLayer.sketchLayer?.id ?? '',
          DECISIONUNIT: sketchLayer.sketchLayer?.title ?? '',
          DECISIONUNITSORT: 0,
          PERMANENT_IDENTIFIER: uuid,
          GLOBALID: uuid,
          OBJECTID: -1,
          TYPE: layerType,
        };
      } else {
        attributes = {
          ...window.totsSampleAttributes[id],
          DECISIONUNITUUID: sketchLayer.sketchLayer?.id ?? '',
          DECISIONUNIT: sketchLayer.sketchLayer?.title ?? '',
          DECISIONUNITSORT: 0,
          PERMANENT_IDENTIFIER: uuid,
          GLOBALID: uuid,
          OBJECTID: -1,
          Notes: '',
          CREATEDDATE: getCurrentDateTime(),
          UPDATEDDATE: getCurrentDateTime(),
          USERNAME: userInfo?.username || '',
          ORGANIZATION: userInfo?.orgId || '',
        };
      }

      const graphic = new Graphic({
        attributes,
        geometry,
        popupTemplate: new PopupTemplate(
          getPopupTemplate(layerType, getTrainingMode()),
        ),
        symbol: sketchVM?.[displayDimensions].polygonSymbol,
      });

      if (sketchLayer.sketchLayer?.type === 'graphics')
        sketchLayer.sketchLayer.graphics.add(graphic);

      // predefined boxes (sponge, micro vac and swab) need to be
      // converted to a box of a specific size.
      if (attributes.ShapeType === 'point') {
        await createBuffer(graphic);
      }

      if (!id.includes('-sampling-mask') && !id.includes('decon-mask')) {
        // find the points version of the layer
        const layerId = graphic.layer.id;
        const pointLayer = (graphic.layer as any).parent.layers.find(
          (layer: any) => `${layerId}-points` === layer.id,
        );
        if (pointLayer) pointLayer.add(convertToPoint(graphic));

        const hybridLayer = (graphic.layer as any).parent.layers.find(
          (layer: any) => `${layerId}-hybrid` === layer.id,
        );
        if (hybridLayer) {
          hybridLayer.add(
            graphic.attributes.ShapeType === 'point'
              ? convertToPoint(graphic)
              : graphic.clone(),
          );
        }
      }

      // look up the layer for this event
      let updateLayer: LayerType | null = null;
      let updateLayerIndex = -1;
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (
          (sketchLayer && layer.layerId === sketchLayer.sketchLayer?.id) ||
          (!sketchLayer &&
            layer.layerId === graphic.attributes?.DECISIONUNITUUID)
        ) {
          updateLayer = layer;
          updateLayerIndex = i;
          break;
        }
      }
      if (!updateLayer) return;

      const changes = new Collection<__esri.Graphic>();
      changes.add(graphic);

      // save the layer changes
      // make a copy of the edits context variable
      const editsCopy = updateLayerEdits({
        appType,
        edits,
        layer: sketchLayer,
        type: 'add',
        changes,
      });

      // update the edits state
      setEdits(editsCopy);

      const newScenario = editsCopy.edits.find(
        (e) =>
          ['scenario', 'scenario-decon'].includes(e.type) &&
          e.layerId === selectedScenario?.layerId,
      ) as ScenarioEditsType;
      if (newScenario) setSelectedScenario(newScenario);

      // updated the edited layer
      setLayers([
        ...layers.slice(0, updateLayerIndex),
        updateLayer,
        ...layers.slice(updateLayerIndex + 1),
      ]);

      // update sketchVM event
      setSketchLayer((layer) => {
        return layer ? { ...layer, editType: 'add' } : null;
      });

      // clear out sketched stuff
      setGeometry(null);
      tempSketchLayer.removeAll();
    }

    processItem();
  }, [
    appType,
    displayDimensions,
    edits,
    geometry,
    getPopupTemplate,
    getTrainingMode,
    layers,
    selectedScenario,
    setEdits,
    setLayers,
    setSelectedScenario,
    setSketchLayer,
    sketchLayer,
    sketchVM,
    userInfo,
  ]);

  return { endSketch, startSketch };
}

// Automatically makes selections for the Configure Output tab
// based on what items users have added.
export function useAutoConfigureOutput() {
  const {
    setDefaultConfigureOutput,
    setWebMapRefOptions,
    setWebSceneRefOptions,
    webMapRefOptions,
    webSceneRefOptions,
  } = useContext(PublishContext);
  const {
    edits,
    layers,
    map,
    portalLayers,
    referenceLayers,
    selectedScenario,
    urlLayers,
  } = useContext(SketchContext);

  // store default configure output
  useEffect(() => {
    let includeAoiCharacterization = false;
    let includePlan = false;
    let includePlanWebMap = isDecon() ? false : true;
    let includePlanWebScene = isDecon() ? false : true;
    let includeStagingAreas = false;
    const selectedAoiCharacterizations: Selections = [];
    const selectedStagingAreas: Selections = [];
    let webMapReferenceLayerSelections: ReferenceLayerSelections[] = [];
    let webSceneReferenceLayerSelections: ReferenceLayerSelections[] = [];

    edits.edits.forEach((edit) => {
      if (['scenario', 'scenario-decon'].includes(edit.type)) {
        includePlan = true;
      }

      if (edit.type === 'layer-aoi-analysis') {
        includeAoiCharacterization = true;
        selectedAoiCharacterizations.push({
          label: edit.name,
          value: edit.layerId,
        });
      }

      if (edit.type === 'layer' && edit.layerType === 'Staging Area Mask') {
        includeStagingAreas = true;
        selectedStagingAreas.push({
          label: edit.name,
          value: edit.layerId,
        });
      }
    });

    if (includePlan && map) {
      const output = getDefaultWebMapSceneSelections(
        map,
        selectedScenario,
        webMapRefOptions,
        webSceneRefOptions,
      );
      webMapReferenceLayerSelections = output.webMapReferenceLayerSelections;
      webSceneReferenceLayerSelections =
        output.webSceneReferenceLayerSelections;
    }

    if (webMapReferenceLayerSelections.length > 0) includePlanWebMap = true;
    if (webSceneReferenceLayerSelections.length > 0) includePlanWebScene = true;

    selectedAoiCharacterizations.sort((a, b) => a.label.localeCompare(b.label));
    selectedStagingAreas.sort((a, b) => a.label.localeCompare(b.label));

    setDefaultConfigureOutput({
      includeAoiCharacterization,
      includeCustomSampleTypes: false,
      includePlan,
      includePlanWebMap,
      includePlanWebScene,
      includeStagingAreas,
      selectedAoiCharacterizations,
      selectedStagingAreas,
      webMapReferenceLayerSelections,
      webSceneReferenceLayerSelections,
    });
  }, [
    edits,
    layers,
    map,
    selectedScenario,
    setDefaultConfigureOutput,
    webMapRefOptions,
    webSceneRefOptions,
  ]);

  useEffect(() => {
    const webMapRefLayers: ReferenceLayerSelections[] = [];
    const webSceneRefLayers: ReferenceLayerSelections[] = [];

    const applicableLayerTypesAgoWebMap = [
      'Feature Service',
      'Image Service',
      'KML',
      'Map Service',
      'Vector Tile Service',
      'WMS',
    ];
    const applicableLayerTypesAgoWebScene = [
      'Feature Service',
      'Image Service',
      'Map Service',
      'Scene Service',
      'Vector Tile Service',
    ];
    portalLayers.forEach((l) => {
      if (l.type === 'tots') return;

      const item: ReferenceLayerSelections = {
        label: l.label,
        id: l.id,
        value: l.url,
        layerType: l.layerType,
        type: 'arcgis',
        onWebMap: 0,
        onWebScene: 0,
      };

      if (applicableLayerTypesAgoWebMap.includes(l.layerType)) {
        item.onWebMap = 1;
        webMapRefLayers.push(item);
      }

      if (applicableLayerTypesAgoWebScene.includes(l.layerType)) {
        item.onWebScene = 1;
        webSceneRefLayers.push(item);
      }
    });

    const applicableLayerTypesUrlWebMap = [
      'feature',
      'imagery',
      'imagery-tile',
      'map-image',
      'tile',
    ];
    const applicableUrlTypesUrlWebMap = ['CSV', 'GeoRSS', 'KML', 'WMS'];
    const applicableLayerTypesUrlWebScene = [
      'building-scene',
      'feature',
      'imagery',
      'imagery-tile',
      'integrated-mesh',
      'map-image',
      'point-cloud',
      'scene',
      'tile',
    ];
    const applicableUrlTypesUrlWebScene = ['CSV'];
    urlLayers.forEach((l) => {
      if (l.layerType === 'stream') return;

      const item: ReferenceLayerSelections = {
        label: l.label,
        id: l.layerId,
        value: l.url,
        layerType: l.layerType,
        urlType: l.type,
        type: 'url',
        onWebMap: 0,
        onWebScene: 0,
      };

      if (
        applicableUrlTypesUrlWebMap.includes(l.type) ||
        (l.type === 'ArcGIS' &&
          applicableLayerTypesUrlWebMap.includes(l.layerType))
      ) {
        item.onWebMap = 1;
        webMapRefLayers.push(item);
      }

      if (
        applicableUrlTypesUrlWebScene.includes(l.type) ||
        (l.type === 'ArcGIS' &&
          applicableLayerTypesUrlWebScene.includes(l.layerType))
      ) {
        item.onWebScene = 1;
        webSceneRefLayers.push(item);
      }
    });

    // add in file reference layers
    referenceLayers.forEach((l) => {
      const item: ReferenceLayerSelections = {
        label: l.title,
        id: l.layerId,
        value: l.layerId,
        layer: l,
        type: 'file',
        onWebMap: 1,
        onWebScene: 1,
      };
      webMapRefLayers.push(item);
      webSceneRefLayers.push(item);
    });

    webMapRefLayers.sort((a, b) => a.label.localeCompare(b.label));
    webSceneRefLayers.sort((a, b) => a.label.localeCompare(b.label));

    setWebMapRefOptions(webMapRefLayers);
    setWebSceneRefOptions(webSceneRefLayers);
  }, [
    portalLayers,
    referenceLayers,
    setWebMapRefOptions,
    setWebSceneRefOptions,
    urlLayers,
  ]);
}

// A generic state management helper. Used for preserving
// state locally to the component.
type MemoryStateType<T> = { [key: string]: T };
let memoryState: MemoryStateType<unknown> = {};
export function useMemoryState<T>(
  key: string,
  initialState: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const hasMemoryValue = Object.prototype.hasOwnProperty.call(
      memoryState,
      key,
    );
    if (hasMemoryValue) {
      return memoryState[key];
    } else {
      return typeof initialState === 'function' ? initialState() : initialState;
    }
  });

  function onChange(nextState: T) {
    memoryState[key] = nextState;
    setState(nextState);
  }

  return [state, onChange as Dispatch<SetStateAction<T>>];
}

// Used to abort fetch requests
export function useAbort() {
  const abortController = useRef(new AbortController());
  const getAbortController = useCallback(() => {
    if (abortController.current.signal.aborted) {
      abortController.current = new AbortController();
    }
    return abortController.current;
  }, []);

  const abort = useCallback(() => {
    getAbortController().abort();
  }, [getAbortController]);

  useEffect(() => {
    return function cleanup() {
      abortController.current.abort();
    };
  }, [getAbortController]);

  const getSignal = useCallback(
    () => getAbortController().signal,
    [getAbortController],
  );

  return { abort, getSignal };
}
