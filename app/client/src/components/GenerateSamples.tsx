/** @jsxImportSource @emotion/react */

import React, {
  FormEvent,
  Fragment,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from '@emotion/react';
import Collection from '@arcgis/core/core/Collection';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
import Polyline from '@arcgis/core/geometry/Polyline';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
// components
import InfoIcon from 'components/InfoIcon';
import MessageBox from 'components/MessageBox';
import Select from 'components/Select';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { LookupFilesContext, useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
import { ErrorType } from 'types/Misc';
// config
import {
  cantUseWith3dMessage,
  cantUseWithVspMessage,
  generateRandomExceededTransferLimitMessage,
  generateRandomSuccessMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
import { PolygonSymbol, SampleSelectType } from 'config/sampleAttributes';
// utils
import { appendEnvironmentObjectParam } from 'utils/arcGisRestUtils';
import { geoprocessorFetch, retryCall } from 'utils/fetchUtils';
import { useDynamicPopup, useMemoryState } from 'utils/hooks';
import {
  activateSketchButton,
  calculateArea,
  convertToPoint,
  getCurrentDateTime,
  getSimplePopupTemplate,
  generateUUID,
  removeZValues,
  setZValues,
  updateLayerEdits,
  getZValue,
} from 'utils/sketchUtils';
import { createErrorObject, toScale } from 'utils/utils';
// styles
import { reactSelectStyles } from 'styles';

// --- styles (GenerateSamples) ---
const addButtonStyles = css`
  margin: 0;
  height: 38px; /* same height as ReactSelect */
`;

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
  margin-bottom: 10px;
`;

const infoIconStyles = css`
  color: #19a3dd;
  margin-left: 10px;
`;

const inlineMenuStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const inlineSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const radioLabelStyles = css`
  padding-left: 0.375rem;
`;

const sketchAoiButtonStyles = css`
  background-color: white;
  color: black;

  &:hover,
  &:focus {
    background-color: #e7f6f8;
    cursor: pointer;
  }
`;

const sketchAoiTextStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;

  i {
    font-size: 20px;
    margin-right: 5px;
  }
`;

const submitButtonStyles = css`
  margin-top: 10px;
`;

// --- components (LocateSamples) ---
type GenerateRandomType = {
  status: 'none' | 'fetching' | 'success' | 'failure' | 'exceededTransferLimit';
  error?: ErrorType;
  data: __esri.Graphic[];
  targetSampleCount?: number;
};

type GenerateSamplesProps = {
  id: string;
  type: 'random' | 'statistic';
};

function GenerateSamples({ id, type }: GenerateSamplesProps) {
  const { userInfo } = useContext(AuthenticationContext);
  const { sampleTypes } = useContext(LookupFilesContext);
  const { setGoTo, setGoToOptions, trainingMode } =
    useContext(NavigationContext);
  const {
    allSampleOptions,
    aoiSketchLayer,
    aoiSketchVM,
    defaultSymbols,
    displayDimensions,
    displayGeometryType,
    edits,
    getGpMaxRecordCount,
    layers,
    map,
    mapView,
    sampleAttributes,
    sceneView,
    setEdits,
    setSketchLayer,
    sketchLayer,
    sketchVM,
  } = useContext(SketchContext);
  const getPopupTemplate = useDynamicPopup('sampling');
  const lookupFiles = useLookupFiles();
  const layerProps = lookupFiles.data.layerProps;
  const services = lookupFiles.data.services;

  const [numberRandomSamples, setNumberRandomSamples] = useMemoryState<string>(
    `${id}-numberRandomSamples`,
    '33',
  );
  const [percentConfidence, setPercentConfidence] = useMemoryState<string>(
    `${id}-percentConfidence`,
    '95',
  );
  const [percentComplient, setPercentComplient] = useMemoryState<string>(
    `${id}-percentComplient`,
    '99',
  );
  const [percentX, setPercentX] = useState<number | null>(null);
  const [percentY, setPercentY] = useState<number | null>(null);
  const [
    sampleType,
    setSampleType, //
  ] = useMemoryState<SampleSelectType | null>(`${id}-sampleType`, null);

  // Initialize the selected sample type to the first option
  useEffect(() => {
    if (sampleType || !sampleTypes) return;

    setSampleType(sampleTypes.sampleSelectOptions[0]);
  }, [sampleTypes, sampleType, setSampleType]);

  const [maxRecordCount, setMaxRecordCount] = useState(0);
  useEffect(() => {
    if (!getGpMaxRecordCount || maxRecordCount) return;
    getGpMaxRecordCount()
      .then((res) => {
        setMaxRecordCount(res);
      })
      .catch((err) => {
        console.error(err);

        setGenerateRandomResponse({
          status: 'failure',
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          data: [],
        });

        window.logErrorToGa(err);
      });
  }, [getGpMaxRecordCount, maxRecordCount]);

  // Handle a user clicking the sketch AOI button. If an AOI is not selected from the
  // dropdown this will create an AOI layer. This also sets the sketchVM to use the
  // selected AOI and triggers a React useEffect to allow the user to sketch on the map.
  const [generateRandomResponse, setGenerateRandomResponse] =
    useState<GenerateRandomType>({
      status: 'none',
      data: [],
    });
  function sketchAoiButtonClick() {
    if (!map || !aoiSketchVM || !aoiSketchLayer) return;

    setGenerateRandomResponse({
      status: 'none',
      data: [],
    });
    setPercentX(null);
    setPercentY(null);

    // put the sketch layer on the map, if it isn't there already
    const layerIndex = map.layers.findIndex(
      (layer) => layer.id === aoiSketchLayer.layerId,
    );
    if (layerIndex === -1 && aoiSketchLayer.sketchLayer)
      map.add(aoiSketchLayer.sketchLayer);

    // save changes from other sketchVM and disable to prevent
    // interference
    if (sketchVM) {
      sketchVM[displayDimensions].cancel();
    }

    // make the style of the button active
    const wasSet = activateSketchButton(`${id}-sampling-mask`);

    if (wasSet) {
      // let the user draw/place the shape
      aoiSketchVM.create('polygon');
    } else {
      aoiSketchVM.cancel();
    }
  }

  // Fires of requests to Generate Random gp service and updates
  // the passed in requests array.
  function randomSamplesSendRequests(
    aoiGraphics: Collection<__esri.Graphic>,
    numberOfSamples: number,
    maxRecordCount: number,
    requests: {
      inputParameters: any;
      originalValuesZ: number[];
      graphics: __esri.GraphicProperties[];
    }[],
  ) {
    if (!maxRecordCount || !map || !sampleType || !sketchLayer) return;

    let graphics: __esri.GraphicProperties[] = [];
    const originalValuesZ: number[] = [];
    const fullGraphics = aoiGraphics.clone();
    fullGraphics.forEach((graphic) => {
      const z = removeZValues(graphic);
      originalValuesZ.push(z);

      graphic.attributes = {
        FID: 0,
        Id: 0,
        TYPE: 'Area of Interest',
        PERMANENT_IDENTIFIER: generateUUID(),
        GLOBALID: generateUUID(),
        OBJECTID: -1,
      };
    });

    graphics = fullGraphics.toArray();

    // create a feature set for communicating with the GPServer
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
      features: graphics,
    });

    // get the sample type definition (can be established or custom)
    const typeuuid = sampleType.value;
    const attributes = sampleAttributes[typeuuid as any];
    const sampleTypeFeatureSet = {
      displayFieldName: '',
      geometryType: 'esriGeometryPolygon',
      spatialReference: {
        wkid: 3857,
      },
      fields: layerProps.defaultFields,
      features: [
        {
          attributes: {
            ...attributes,
            GLOBALID: generateUUID(),
            PERMANENT_IDENTIFIER: generateUUID(),
          },
        },
      ],
    };

    const surfaceArea = attributes.SA;
    const sampleWidth = Math.sqrt(surfaceArea);
    const minDistance = sampleWidth;

    // determine the number of service calls needed to satisfy the request
    const samplesPerCall = Math.floor(maxRecordCount / graphics.length);
    const iterations = Math.ceil(numberOfSamples / samplesPerCall);

    // fire off the generateRandom requests
    let numSamples = 0;
    let numSamplesLeft = numberOfSamples;
    for (let i = 0; i < iterations; i++) {
      // determine the number of samples for this request
      numSamples =
        numSamplesLeft > samplesPerCall ? samplesPerCall : numSamplesLeft;

      const props = {
        f: 'json',
        Number_of_Samples: numSamples,
        Sample_Type: sampleType.label,
        Area_of_Interest_Mask: featureSet.toJSON(),
        Sample_Type_Parameters: sampleTypeFeatureSet,
        Minimum_Allowed_Distance_inches: minDistance,
      };
      appendEnvironmentObjectParam(props);

      requests.push({
        inputParameters: props,
        originalValuesZ,
        graphics,
      });

      // keep track of the number of remaining samples
      numSamplesLeft = numSamplesLeft - numSamples;
    }
  }

  // Throttles GP server requests to 3 requests at one time.
  // Any more than 6 and the GP server cancels remaining requests.
  // Setting it to 3 allows two separate users to use this feature
  // at the same time.
  async function fireRequestsThrottled(
    parameters: {
      inputParameters: any;
      originalValuesZ: number[];
      graphics: __esri.GraphicProperties[];
    }[],
  ) {
    const requests: {
      request: Promise<any>;
      originalValuesZ: number[];
      graphics: __esri.GraphicProperties[];
    }[] = [];

    let i = 0;
    for (const params of parameters) {
      const request = retryCall(() =>
        geoprocessorFetch({
          url: `${services.totsGPServer}/Generate%20Random`,
          inputParameters: params.inputParameters,
        }),
      );
      requests.push({
        request,
        originalValuesZ: params.originalValuesZ,
        graphics: params.graphics,
      });

      i += 1;
      if (i % 3 === 0) await Promise.all(requests.map((r) => r.request));
    }

    return requests;
  }

  async function getSplitAoiAreas(aois: AoiType[]) {
    if (!sampleType || !sceneView) return [];

    if (window.location.search.includes('devMode=true'))
      mapView?.graphics.removeAll();

    const tempLayer = new GraphicsLayer({
      title: 'Test AOI Trimming',
    });
    const tempGraphics: __esri.Graphic[] = [];

    const aoisFull: AoiType[] = [];
    let aoiIndex = 0;
    for (const aoi of aois) {
      const aoisToProcess = [
        {
          area: aoi.area,
          graphic: aoi.graphic,
          cut: 'vertical',
        },
      ];

      // get number of splits
      const numSubAois = (aoi.numSamples / maxRecordCount) * 2;

      const tempAois: {
        area: number;
        graphic: __esri.Graphic;
        percentAoi: number;
      }[] = [];
      while (aoisToProcess.length > 0 && tempAois.length < numSubAois) {
        aoisToProcess.sort((a, b) => a.area - b.area);
        const currentAoi = aoisToProcess.pop();
        if (!currentAoi) continue;

        if (tempAois.length + aoisToProcess.length + 1 < numSubAois) {
          const extent = currentAoi.graphic.geometry.extent;

          const z = getZValue(currentAoi.graphic);
          const cutLine = new Polyline({
            paths:
              currentAoi.cut === 'vertical'
                ? [
                    [
                      [extent.center.x, extent.ymin, z],
                      [extent.center.x, extent.ymax, z],
                    ],
                  ]
                : [
                    [
                      [extent.xmin, extent.center.y, z],
                      [extent.xmax, extent.center.y, z],
                    ],
                  ],
            spatialReference: currentAoi.graphic.geometry.spatialReference,
          });

          const cutResult = geometryEngine.cut(
            currentAoi.graphic.geometry,
            cutLine,
          );

          if (cutResult && cutResult.length > 0) {
            // add the new parts to the list of AOIs to process
            for (const part of cutResult) {
              const graphic = new Graphic({
                attributes: {
                  ...currentAoi.graphic.attributes,
                  GLOBALID: generateUUID(),
                  PERMANENT_IDENTIFIER: generateUUID(),
                },
                geometry: part,
              });

              // calculate area of aoi
              const areaOut = await calculateArea(
                graphic,
                sceneView,
                'sqinches',
              );
              const area = typeof areaOut === 'number' ? areaOut : 0;

              aoisToProcess.push({
                area,
                graphic,
                cut: currentAoi.cut === 'vertical' ? 'horizontal' : 'vertical',
              });
            }
          }
        } else {
          // calculate area of aoi
          const areaOut = await calculateArea(
            currentAoi.graphic,
            sceneView,
            'sqinches',
          );
          const area = typeof areaOut === 'number' ? areaOut : 0;

          tempAois.push({
            area,
            graphic: currentAoi.graphic,
            percentAoi: area / aoi.area,
          });

          if (window.location.search.includes('devMode=true')) {
            tempGraphics.push(
              new Graphic({
                ...currentAoi,
                geometry: currentAoi.graphic.geometry,
                symbol: aoi.graphic.symbol,
              }),
            );
          }
        }
      }

      let samplesLeft = aoi.numSamples;
      tempAois.sort((a, b) => b.area - a.area);
      let index = 0;
      for (const subAoi of tempAois) {
        const samplesToGenerate =
          tempAois.length === index + 1
            ? samplesLeft
            : Math.floor(aoi.numSamples * subAoi.percentAoi);
        samplesLeft -= samplesToGenerate;
        aoisFull.push({
          area: subAoi.area,
          graphic: subAoi.graphic,
          gridDefinition: 0,
          numSamples: samplesToGenerate,
          originalAoiIndex: aoiIndex,
        });
        index += 1;
      }

      aoiIndex += 1;
    }

    if (map && window.location.search.includes('devMode=true')) {
      tempLayer.addMany(tempGraphics);
      map.layers.add(tempLayer);
    }

    return aoisFull;
  }

  // Handle a user generating random or statistical samples
  async function randomSamples(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!maxRecordCount || !map || !sampleType || !sketchLayer) return;

    activateSketchButton('disable-all-buttons');
    sketchVM?.[displayDimensions].cancel();
    aoiSketchVM?.cancel();

    const aoiMaskLayer: LayerType | null =
      generateRandomMode === 'draw'
        ? aoiSketchLayer
        : generateRandomMode === 'file'
          ? selectedAoiFile
          : null;
    if (!aoiMaskLayer) return;

    setGenerateRandomResponse({ status: 'fetching', data: [] });

    if (aoiMaskLayer.sketchLayer?.type !== 'graphics') return;

    try {
      const numSamplesToGenerate = parseInt(numberRandomSamples);

      const parameters: {
        inputParameters: any;
        originalValuesZ: number[];
        graphics: __esri.GraphicProperties[];
      }[] = [];
      if (type === 'random') {
        randomSamplesSendRequests(
          aoiMaskLayer.sketchLayer.graphics,
          numSamplesToGenerate,
          maxRecordCount,
          parameters,
        );
      }

      let aoisFullSplit: AoiType[] = [];
      const aoisIndex: number[] = [];
      if (type === 'statistic') {
        aoisFullSplit = await getSplitAoiAreas(aoisFull);
        aoisFullSplit.forEach((aoi) => {
          aoisIndex.push();
          randomSamplesSendRequests(
            new Collection([aoi.graphic]),
            aoi.numSamples,
            maxRecordCount,
            parameters,
          );
        });
      }

      const requests = await fireRequestsThrottled(parameters);

      const typeuuid = sampleType.value;
      const responses = await Promise.all(requests.map((r) => r.request));

      let res;
      const timestamp = getCurrentDateTime();
      const popupTemplate = getPopupTemplate('Samples', trainingMode);
      const graphicsToAdd: __esri.Graphic[] = [];
      const hybridGraphicsToAdd: __esri.Graphic[] = [];
      const pointsToAdd: __esri.Graphic[] = [];
      const geometryTrimmed: __esri.Geometry[] = [];
      for (let i = 0; i < responses.length; i++) {
        res = responses[i];
        const numberOfAois = requests[i].graphics.length;
        if (!res?.results?.[0]?.value) {
          setGenerateRandomResponse({
            status: 'failure',
            error: {
              error: createErrorObject(res),
              message: 'No data',
            },
            data: [],
          });
          return;
        }

        if (res.results[0].value.exceededTransferLimit) {
          setGenerateRandomResponse({
            status: 'exceededTransferLimit',
            data: [],
          });
          return;
        }

        // get the results from the response
        const results = res.results[0].value;

        // set the sample styles
        let symbol: PolygonSymbol = defaultSymbols.symbols['Samples'];
        if (
          Object.prototype.hasOwnProperty.call(
            defaultSymbols.symbols,
            sampleType.value,
          )
        ) {
          symbol = defaultSymbols.symbols[sampleType.value];
        }

        let originalZIndex = 0;
        const graphicsPerAoi = results.features.length / numberOfAois;

        // build an array of graphics to draw on the map
        let index = 0;
        for (const feature of results.features) {
          if (index !== 0 && index % graphicsPerAoi === 0) originalZIndex += 1;

          const originalZ = requests[i].originalValuesZ[originalZIndex];
          const poly = new Graphic({
            attributes: {
              ...window.totsSampleAttributes[typeuuid],
              CREATEDDATE: timestamp,
              DECISIONUNITUUID: sketchLayer.uuid,
              DECISIONUNIT: sketchLayer.label,
              DECISIONUNITSORT: 0,
              OBJECTID: feature.attributes.OBJECTID,
              GLOBALID: feature.attributes.GLOBALID,
              PERMANENT_IDENTIFIER: feature.attributes.PERMANENT_IDENTIFIER,
              UPDATEDDATE: timestamp,
              USERNAME: userInfo?.username || '',
              ORGANIZATION: userInfo?.orgId || '',
            },
            symbol,
            geometry: new Polygon({
              rings: feature.geometry.rings,
              spatialReference: results.spatialReference,
            }),
            popupTemplate,
          });

          await setZValues({
            map,
            graphic: poly,
            zOverride:
              generateRandomElevationMode === 'aoiElevation' ? originalZ : null,
          });

          if (type === 'statistic') {
            let intersectionGeometry = geometryEngine.intersect(
              poly.geometry,
              aoisFull[aoisFullSplit[i].originalAoiIndex].graphic.geometry,
            );
            geometryTrimmed.forEach((geom) => {
              const tempGeometry = geometryEngine.difference(
                intersectionGeometry,
                geom,
              );
              if (tempGeometry) intersectionGeometry = tempGeometry;
            });
            geometryTrimmed.push(
              ...(Array.isArray(intersectionGeometry)
                ? intersectionGeometry
                : [intersectionGeometry]),
            );
          }

          graphicsToAdd.push(poly);
          pointsToAdd.push(convertToPoint(poly));
          hybridGraphicsToAdd.push(
            poly.attributes.ShapeType === 'point'
              ? convertToPoint(poly)
              : poly.clone(),
          );

          index += 1;
        }
      }

      if (type === 'statistic') {
        const tempLayer = new GraphicsLayer({
          title: 'Test Layer Trimming',
        });
        const tempGraphics: __esri.Graphic[] = [];

        // get non-overlapping area in sample zone
        let totalSampleAreaInAoi = 0;
        for (const geometry of geometryTrimmed) {
          // set the sample styles
          let symbol: PolygonSymbol = defaultSymbols.symbols['Samples'];
          if (
            Object.prototype.hasOwnProperty.call(
              defaultSymbols.symbols,
              sampleType.value,
            )
          ) {
            symbol = defaultSymbols.symbols[sampleType.value];
          }

          const graphic = new Graphic({
            geometry,
            symbol,
            popupTemplate: getSimplePopupTemplate({
              test1: 'test1',
              test2: 'test2',
              test3: 'test3',
            }),
          });
          tempGraphics.push(graphic);

          const area = await calculateArea(graphic, sceneView, 'sqinches');
          if (typeof area === 'number') totalSampleAreaInAoi += area;

          if (window.location.search.includes('devMode=true')) {
            tempLayer.addMany(tempGraphics);
            map.layers.add(tempLayer);
          }
        }

        // calculate percentX
        const totalAoiArea = aoisFull.reduce((acc, cur) => acc + cur.area, 0);
        setPercentX(toScale((totalSampleAreaInAoi / totalAoiArea) * 100, 2));
      }

      // put the graphics on the map
      if (sketchLayer?.sketchLayer?.type === 'graphics') {
        // add the graphics to a collection so it can added to browser storage
        const collection = new Collection<__esri.Graphic>();
        collection.addMany(graphicsToAdd);
        sketchLayer.sketchLayer.graphics.addMany(collection);

        sketchLayer.pointsLayer?.addMany(pointsToAdd);
        sketchLayer.hybridLayer?.addMany(hybridGraphicsToAdd);

        let editsCopy = updateLayerEdits({
          appType: 'sampling',
          edits,
          layer: sketchLayer,
          type: 'add',
          changes: collection,
        });

        if (generateRandomMode === 'draw') {
          // remove the graphics from the generate random mask
          if (
            aoiSketchLayer &&
            aoiSketchLayer.sketchLayer?.type === 'graphics'
          ) {
            editsCopy = updateLayerEdits({
              appType: 'sampling',
              edits: editsCopy,
              layer: aoiSketchLayer,
              type: 'delete',
              changes: aoiSketchLayer.sketchLayer.graphics,
            });

            aoiSketchLayer.sketchLayer.removeAll();
          }
        }

        // update the edits state
        setEdits(editsCopy);

        // update the editType of the sketchLayer
        setSketchLayer((sketchLayer: LayerType | null) => {
          if (!sketchLayer) return sketchLayer;
          return {
            ...sketchLayer,
            editType: 'add',
          };
        });
      }

      setGenerateRandomResponse({
        status: 'success',
        data: graphicsToAdd,
        targetSampleCount: numSamplesToGenerate,
      });

      if (generateRandomMode === 'draw') {
        if (aoiSketchLayer && aoiSketchLayer.sketchLayer?.type === 'graphics') {
          aoiSketchLayer.sketchLayer.removeAll();
        }
      }
    } catch (err: any) {
      console.error(err);
      setGenerateRandomResponse({
        status: 'failure',
        error: {
          error: createErrorObject(err),
          message: err.message,
        },
        data: [],
      });

      window.logErrorToGa(err);
    }
  }

  // scenario and layer edit UI visibility controls
  const [generateRandomMode, setGenerateRandomMode] = useMemoryState<
    'draw' | 'file' | ''
  >(`${id}-generateRandomMode`, '');
  const [generateRandomElevationMode, setGenerateRandomElevationMode] =
    useMemoryState<'ground' | 'aoiElevation'>(
      `${id}-generateRandomElevationMode`,
      'aoiElevation',
    );
  const [selectedAoiFile, setSelectedAoiFile] =
    useMemoryState<LayerType | null>(`${id}-selectedAoiFile`, null);

  // get drawn aois
  const [watcher, setWatcher] = useState<IHandle | null>(null);
  const [aoisDrawn, setAoisDrawn] = useState<__esri.Graphic[]>([]);
  useEffect(() => {
    if (!aoiSketchLayer || watcher) return;

    if (aoiSketchLayer.sketchLayer?.type === 'graphics') {
      setAoisDrawn(aoiSketchLayer.sketchLayer.graphics.toArray());
    }

    setWatcher(
      reactiveUtils.watch(
        () =>
          (aoiSketchLayer.sketchLayer as __esri.GraphicsLayer).graphics.length,
        () => {
          if (aoiSketchLayer.sketchLayer?.type !== 'graphics') return;
          setAoisDrawn(aoiSketchLayer.sketchLayer.graphics.toArray());
        },
      ),
    );
  }, [aoiSketchLayer, watcher]);

  // get aois from file
  const [aoisSelected, setAoisSelected] = useState<__esri.Graphic[]>([]);
  useEffect(() => {
    if (!selectedAoiFile) {
      setAoisSelected([]);
      return;
    }

    if (selectedAoiFile.sketchLayer?.type !== 'graphics') return;
    setAoisSelected(selectedAoiFile.sketchLayer.graphics.toArray());
  }, [selectedAoiFile]);

  // get aois from selections
  const [aois, setAois] = useState<__esri.Graphic[]>([]);
  useEffect(() => {
    if (generateRandomMode === 'draw') setAois(aoisDrawn);
    if (generateRandomMode === 'file') setAois(aoisSelected);
  }, [aoisDrawn, aoisSelected, generateRandomMode]);

  // get area of aois and num samples per aoi if in statistic mode
  type AoiType = {
    area: number;
    graphic: __esri.Graphic;
    gridDefinition: number;
    numSamples: number;
    originalAoiIndex: number;
  };
  const [aoisFull, setAoisFull] = useState<AoiType[]>([]);
  useEffect(() => {
    async function getAoiAreas(aois: __esri.Graphic[]) {
      if (!sampleType) return;

      const aoisFull: AoiType[] = [];
      const complientFloat = parseFloat(percentComplient);
      const confidenceFloat = parseFloat(percentConfidence);
      const sampleArea = sampleAttributes[sampleType.value as any].SA;
      let totalAoiArea = 0;
      let totalNumSamples = 0;
      let index = 0;
      for (const aoi of aois) {
        // calculate area of aoi
        const areaOut = await calculateArea(aoi, sceneView, 'sqinches');
        const area = typeof areaOut === 'number' ? areaOut : 0;

        // calculate statistical number of samples for aoi
        // n ~= [0.5(1 - a^(1/V))(2N - V + 1)]
        const N = Math.floor(area / sampleArea); // grid definition
        const a = 1 - confidenceFloat / 100;
        const b = 1 - complientFloat / 100;
        const V = Math.max(1, b * N);
        const numSamples = Math.ceil(
          0.5 * (1 - Math.pow(a, 1 / V)) * (2 * N - V + 1),
        );

        totalAoiArea += area;
        totalNumSamples += numSamples;

        aoisFull.push({
          area,
          numSamples,
          graphic: aoi,
          gridDefinition: N,
          originalAoiIndex: index,
        });
        index += 1;
      }

      if (totalNumSamples && type === 'statistic')
        setPercentY(
          toScale(((sampleArea * totalNumSamples) / totalAoiArea) * 100, 2),
        );

      setAoisFull(aoisFull);
    }

    if (type === 'random') {
      setAoisFull(
        aois.map((graphic, index) => ({
          area: 0,
          numSamples: 0,
          graphic,
          gridDefinition: 0,
          originalAoiIndex: index,
        })),
      );
    }
    if (type === 'statistic') getAoiAreas(aois);
  }, [
    aois,
    percentComplient,
    percentConfidence,
    sampleAttributes,
    sampleType,
    sceneView,
    type,
  ]);

  // get total number of samples across all aois
  useEffect(() => {
    if (type === 'random') return;
    let totalNumSamples = 0;
    aoisFull.forEach((aoi) => {
      totalNumSamples += aoi.numSamples;
    });
    setNumberRandomSamples(
      (totalNumSamples && !isNaN(totalNumSamples)
        ? totalNumSamples
        : 0
      ).toString(),
    );
  }, [aoisFull, setNumberRandomSamples, type]);

  useEffect(() => {
    if (!window.location.search.includes('devMode=true')) return;
    console.log('aois (post calculations): ', aoisFull);
  }, [aoisFull]);

  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  useEffect(() => {
    const messages: string[] = [];
    validateDecimalInput(messages, percentConfidence, 'Percent Confidence');
    validateDecimalInput(messages, percentComplient, 'Percent Complient');
    setValidationMessages(messages);

    setPercentX(null);
    setPercentY(null);
  }, [percentComplient, percentConfidence]);

  function validateDecimalInput(
    messages: string[],
    value: string,
    label: string,
    topEnd = 99.999,
  ) {
    const float = parseFloat(value);
    if (isNaN(float) || float < 50 || float > topEnd) {
      messages.push(`"${label}" must be a number between 50 and ${topEnd}.`);
    }
  }

  return (
    <Fragment>
      {sketchLayer?.layerType === 'VSP' && cantUseWithVspMessage}
      {sketchLayer?.layerType !== 'VSP' &&
        displayDimensions === '3d' &&
        cantUseWith3dMessage(
          type === 'statistic'
            ? 'Statistical Sampling Approach'
            : 'Multiple Random Samples',
        )}
      {sketchLayer?.layerType !== 'VSP' && displayDimensions === '2d' && (
        <form onSubmit={randomSamples}>
          {type === 'random' && (
            <p>
              Select "Draw Sampling Mask" to draw a boundary on your map for
              placing samples or select "Use Imported Area of Interest" to use
              an Area of Interest file to place samples. Select a Sample Type
              from the menu and specify the number of samples to add. Click
              Submit to add samples.
            </p>
          )}
          {type === 'statistic' && (
            <p>
              Select "Draw Sampling Mask" to draw a boundary on your map for
              placing samples or select "Use Imported Area of Interest" to use
              an Area of Interest file to place samples. Select a Sample Type
              from the menu and specify the "Percent Confidence and "Percent
              Area Clear/Complient". Click Submit to add samples.
            </p>
          )}

          <div>
            <input
              id={`${id}-draw-aoi`}
              type="radio"
              name={`${id}-mode`}
              value="Draw area of Interest"
              disabled={generateRandomResponse.status === 'fetching'}
              checked={generateRandomMode === 'draw'}
              onChange={(_ev) => {
                setGenerateRandomMode('draw');
              }}
            />
            <label htmlFor={`${id}-draw-aoi`} css={radioLabelStyles}>
              Draw Sampling Mask
            </label>
          </div>

          {generateRandomMode === 'draw' && (
            <button
              id={`${id}-sampling-mask`}
              title="Draw Sampling Mask"
              className="sketch-button"
              disabled={generateRandomResponse.status === 'fetching'}
              type="button"
              onClick={() => {
                if (!aoiSketchLayer) return;

                sketchAoiButtonClick();
              }}
              css={sketchAoiButtonStyles}
            >
              <span css={sketchAoiTextStyles}>
                <i className="fas fa-draw-polygon" />{' '}
                <span>Draw Sampling Mask</span>
              </span>
            </button>
          )}

          <div>
            <input
              id={`${id}-use-aoi-file`}
              type="radio"
              name={`${id}-mode`}
              value="Use Imported Area of Interest"
              disabled={generateRandomResponse.status === 'fetching'}
              checked={generateRandomMode === 'file'}
              onChange={(_ev) => {
                setGenerateRandomMode('file');

                if (!selectedAoiFile) {
                  const aoiLayers = layers.filter(
                    (layer) => layer.layerType === 'Area of Interest',
                  );
                  setSelectedAoiFile(aoiLayers[0]);
                }
              }}
            />
            <label htmlFor={`${id}-use-aoi-file`} css={radioLabelStyles}>
              Use Imported Area of Interest
            </label>
          </div>

          {generateRandomMode === 'file' && (
            <Fragment>
              <label htmlFor={`${id}-aoi-mask-select-input`}>
                Area of Interest Mask
              </label>
              <div css={inlineMenuStyles}>
                <Select
                  id={`${id}-aoi-mask-select`}
                  inputId={`${id}-aoi-mask-select-input`}
                  css={inlineSelectStyles}
                  styles={reactSelectStyles as any}
                  isClearable={true}
                  value={selectedAoiFile}
                  onChange={(ev) => setSelectedAoiFile(ev as LayerType)}
                  options={layers.filter(
                    (layer) => layer.layerType === 'Area of Interest',
                  )}
                />
                <button
                  css={addButtonStyles}
                  disabled={generateRandomResponse.status === 'fetching'}
                  onClick={(_ev) => {
                    setGoTo('addData');
                    setGoToOptions({
                      from: 'file',
                      layerType: 'Area of Interest',
                    });
                  }}
                >
                  Add
                </button>
              </div>
            </Fragment>
          )}
          {generateRandomMode && (
            <Fragment>
              <br />
              {type === 'statistic' && displayGeometryType !== 'polygons' && (
                <MessageBox
                  severity="warning"
                  title=""
                  message="For an accurate representation of samples, please use Polygons for the Shape in Settings."
                />
              )}
              <label htmlFor={`${id}-sample-type-select-input`}>
                Sample Type
              </label>
              <Select
                id={`${id}-sample-type-select`}
                inputId={`${id}-sample-type-select-input`}
                css={fullWidthSelectStyles}
                styles={reactSelectStyles as any}
                value={sampleType}
                onChange={(ev) => setSampleType(ev as SampleSelectType)}
                options={allSampleOptions}
              />

              {type === 'random' && (
                <label>
                  <span>Number of Samples</span>
                  <input
                    css={inputStyles}
                    min={1}
                    required
                    type="number"
                    value={numberRandomSamples}
                    onChange={(ev) => setNumberRandomSamples(ev.target.value)}
                  />
                </label>
              )}

              {type === 'statistic' && (
                <Fragment>
                  <label>
                    <span>
                      Percent Confidence
                      <InfoIcon
                        cssStyles={infoIconStyles}
                        id="percent-confidence-tooltip"
                        tooltip={
                          'This definition of percent confidence is the complement of Type 1 error (e.g., when 95% is chosen, there is a 5% chance of making a Type 1 error).'
                        }
                        place="bottom"
                      />
                    </span>
                    <input
                      css={inputStyles}
                      required
                      type="text"
                      value={percentConfidence}
                      onChange={(ev) => setPercentConfidence(ev.target.value)}
                    />
                  </label>
                  <label>
                    <span>Percent Area Clear/Compliant</span>
                    <input
                      css={inputStyles}
                      required
                      type="text"
                      value={percentComplient}
                      onChange={(ev) => setPercentComplient(ev.target.value)}
                    />
                  </label>

                  {numberRandomSamples && (
                    <Fragment>
                      {validationMessages.length > 0 && (
                        <MessageBox
                          severity="warning"
                          title=""
                          message={
                            validationMessages.length > 1 ? (
                              <ul>
                                {validationMessages.map((m) => (
                                  <li>{m}</li>
                                ))}
                              </ul>
                            ) : (
                              validationMessages[0]
                            )
                          }
                        />
                      )}
                      <span>
                        Number of resulting samples:{' '}
                        <strong>
                          {parseInt(numberRandomSamples).toLocaleString()}
                        </strong>
                      </span>
                      <br />
                    </Fragment>
                  )}
                </Fragment>
              )}

              <div>
                <input
                  id={`${id}-use-aoi-elevation`}
                  type="radio"
                  name={`${id}-elevation-mode`}
                  value="Use AOI Elevation"
                  disabled={generateRandomResponse.status === 'fetching'}
                  checked={generateRandomElevationMode === 'aoiElevation'}
                  onChange={(_ev) => {
                    setGenerateRandomElevationMode('aoiElevation');
                  }}
                />
                <label
                  htmlFor={`${id}-use-aoi-elevation`}
                  css={radioLabelStyles}
                >
                  Use AOI Elevation
                </label>
              </div>
              <div>
                <input
                  id={`${id}-snap-to-ground`}
                  type="radio"
                  name={`${id}-elevation-mode`}
                  value="Snap to Ground"
                  disabled={generateRandomResponse.status === 'fetching'}
                  checked={generateRandomElevationMode === 'ground'}
                  onChange={(_ev) => {
                    setGenerateRandomElevationMode('ground');
                  }}
                />
                <label htmlFor={`${id}-snap-to-ground`} css={radioLabelStyles}>
                  Snap to Ground
                </label>
              </div>

              {generateRandomResponse.status === 'success' &&
                sketchLayer &&
                generateRandomSuccessMessage(
                  generateRandomResponse.data.length,
                  sketchLayer.label,
                  generateRandomResponse.targetSampleCount,
                )}
              {type === 'statistic' &&
                Boolean(percentX) &&
                Boolean(percentY) &&
                percentX !== percentY && (
                  <MessageBox
                    severity="warning"
                    title=""
                    message={`Due to limited sample overlap and/or sample areas partially outside of the specified AOI, the current sampling plan reflects ${percentX?.toLocaleString()}% rather than the goal of ${percentY?.toLocaleString()}% of the AOI sampled.`}
                  />
                )}
              {generateRandomResponse.status === 'failure' &&
                webServiceErrorMessage(generateRandomResponse.error)}
              {generateRandomResponse.status === 'exceededTransferLimit' &&
                generateRandomExceededTransferLimitMessage}

              {((generateRandomMode === 'draw' &&
                numberRandomSamples &&
                aoiSketchLayer?.sketchLayer?.type === 'graphics' &&
                aoiSketchLayer.sketchLayer.graphics.length > 0) ||
                (generateRandomMode === 'file' &&
                  selectedAoiFile?.sketchLayer?.type === 'graphics' &&
                  selectedAoiFile.sketchLayer.graphics.length > 0)) && (
                <button
                  css={submitButtonStyles}
                  disabled={
                    generateRandomResponse.status === 'fetching' ||
                    validationMessages.length > 0
                  }
                  type="submit"
                >
                  {generateRandomResponse.status !== 'fetching' && 'Submit'}
                  {generateRandomResponse.status === 'fetching' && (
                    <Fragment>
                      <i className="fas fa-spinner fa-pulse" />
                      &nbsp;&nbsp;Loading...
                    </Fragment>
                  )}
                </button>
              )}
            </Fragment>
          )}
        </form>
      )}
    </Fragment>
  );
}

export default GenerateSamples;
