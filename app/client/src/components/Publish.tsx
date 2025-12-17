/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from '@emotion/react';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import Portal from '@arcgis/core/portal/Portal';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
// components
import {
  EditAoiCharacterization,
  EditCustomSampleTypesTable,
  EditScenario,
  EditStagingAreaCharacterization,
  SaveResultsType,
  SaveStatusType,
} from 'components/EditLayerMetaData';
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { CalculateContext } from 'contexts/Calculate';
import { useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import {
  defaultPlanAttributes,
  PublishContext,
  trainingModePlanAttributes,
} from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// utils
import {
  addPointFeatures,
  buildFieldFromCustomAttribute,
  buildReferenceLayerTableEdits,
  buildRendererParams,
  getAllFeatures,
  getFeatureTables,
  isServiceNameAvailable,
  publish,
} from 'utils/arcGisRestUtils';
import { buildingColors, imageAnalysisSymbols } from 'utils/hooks';
import {
  convertToSimpleGraphic,
  findLayerInEdits,
  generateUUID,
} from 'utils/sketchUtils';
import { createErrorObject, sentenceJoin } from 'utils/utils';
// types
import {
  DeleteFeatureType,
  FeatureEditsType,
  LayerAoiAnalysisEditsType,
  LayerEditsType,
  ScenarioDeconEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import { LayerType } from 'types/Layer';
import { ErrorType } from 'types/Misc';
import { AppType } from 'types/Navigation';
// config
import {
  noDeconPublishMessage,
  noSamplesPublishMessage,
  noSampleTypesPublishMessage,
  noServiceNameMessage,
  noServiceSelectedMessage,
  notLoggedInMessage,
  publishSuccessMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
import { isDecon } from 'styles';

const badStatuses = ['name-not-available', 'invalid-characters'];

type NotAvailableAoiLayer = {
  status: SaveStatusType;
  layer: LayerAoiAnalysisEditsType;
};

type NotAvailableStagingLayer = {
  status: SaveStatusType;
  layer: LayerEditsType;
};

type PublishResults = {
  [key: string]: {
    adds: FeatureEditsType[];
    updates: FeatureEditsType[];
    deletes: DeleteFeatureType[];
    published: FeatureEditsType[];
  };
};

type PublishType = {
  status:
    | 'none'
    | 'fetching'
    | 'success'
    | 'failure'
    | 'fetch-failure'
    | 'name-not-available';
  summary: {
    success: string;
    failed: string;
  };
  error?: ErrorType;
  rawData: any;
};

// --- styles (Publish) ---
const panelContainer = css`
  padding: 20px;
`;

const publishButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const publishButtonStyles = css`
  margin-top: 10px;

  &:disabled {
    cursor: default;
    opacity: 0.65;
  }
`;

const sectionContainer = css`
  margin-bottom: 10px;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

const totsOutputContainer = css`
  padding-bottom: 1.5em;
`;

const checkedStyles = css`
  color: green;
  margin-right: 10px;
`;

const unCheckedStyles = css`
  color: red;
  margin-right: 10px;
`;

const webMapContainerCheckboxStyles = css`
  margin-left: 20px;
`;

// --- components (Publish) ---
type Props = {
  appType: AppType;
};

function Publish({ appType }: Props) {
  const { oAuthInfo, portal, setSignedIn, setPortal, signedIn } = useContext(
    AuthenticationContext,
  );
  const { calculateResults, calculateResultsDecon, contaminationMap } =
    useContext(CalculateContext);
  const { goToOptions, setGoToOptions, trainingMode } =
    useContext(NavigationContext);
  const {
    defaultConfigureOutput,
    manualConfigureOutput,
    publishSamplesMode,
    publishSampleTableMetaData,
    sampleTableDescription,
    sampleTableName,
    sampleTypeSelections,
    selectedService,
    setSampleTableDescription,
    setSampleTableName,
    setSelectedService,
  } = useContext(PublishContext);
  const {
    defaultSymbols,
    edits,
    layers,
    map,
    sampleAttributes,
    selectedScenario,
    setDeconSketchLayer,
    setEdits,
    setLayers,
    setSelectedScenario,
    setStagingAreaLayer,
    setUserDefinedAttributes,
    sketchLayer,
    userDefinedAttributes,
  } = useContext(SketchContext);

  const layerProps = useLookupFiles().data.layerProps;

  const [configOutput] = useState(
    manualConfigureOutput ?? defaultConfigureOutput,
  );

  const {
    includeAoiCharacterization,
    includeCustomSampleTypes,
    includePlan,
    includePlanWebMap,
    includePlanWebScene,
    includeStagingAreas,
    selectedAoiCharacterizations,
    selectedStagingAreas,
    webMapReferenceLayerSelections,
    webSceneReferenceLayerSelections,
  } = configOutput;

  // Checks browser storage to determine if the user clicked publish and logged in.
  const [publishButtonClicked, setPublishButtonClicked] = useState(false);
  const [continueInitialized, setContinueInitialized] = useState(false);
  useEffect(() => {
    if (continueInitialized) return;

    // continue publish is not true, exit early
    if (!goToOptions?.continuePublish) {
      setContinueInitialized(true);
      return;
    }

    // wait until TOTS is signed in before trying to continue the publish
    if (!portal || !signedIn) return;

    // continue with publishing
    setPublishButtonClicked(true);
    setGoToOptions({ continuePublish: false });
    setContinueInitialized(true);
  }, [portal, signedIn, goToOptions, setGoToOptions, continueInitialized]);

  // Sign in if necessary
  useEffect(() => {
    if (!oAuthInfo || !publishButtonClicked) return;

    // have the user login if necessary
    if (!portal || !signedIn) {
      setGoToOptions({ continuePublish: true });
      IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`, {
        oAuthPopupConfirmation: false,
      })
        .then(() => {
          setSignedIn(true);

          const portal = new Portal();
          portal.authMode = 'immediate';
          portal.load().then(() => {
            setPortal(portal);
          });
        })
        .catch((err) => {
          console.error(err);
          setSignedIn(false);
          setPortal(null);
        });
    }
  }, [
    oAuthInfo,
    portal,
    publishButtonClicked,
    setGoToOptions,
    setPortal,
    setSignedIn,
    signedIn,
  ]);

  const [publishResponse, setPublishResponse] = useState<PublishType>({
    status: 'none',
    summary: { success: '', failed: '' },
    rawData: null,
  });

  const [planNameCheckStatus, setPlanNameCheckStatus] = useState<
    'none' | 'available' | 'name-not-available' | 'invalid-characters'
  >('none');
  const [customSampleNameCheckStatus, setCustomSampleNameCheckStatus] =
    useState<
      'none' | 'available' | 'name-not-available' | 'invalid-characters'
    >('none');
  const [aoiCharNameCheckStatus, setAoiCharNameCheckStatus] = useState<
    'none' | 'available' | 'name-not-available' | 'invalid-characters'
  >('none');
  const [aoiLayersNotAvailable, setAoiLayersNotAvailable] = useState<
    NotAvailableAoiLayer[]
  >([]);
  const [stagingAreaNameCheckStatus, setStagingAreaNameCheckStatus] = useState<
    'none' | 'available' | 'name-not-available' | 'invalid-characters'
  >('none');
  const [stagingAreaLayersNotAvailable, setStagingAreaLayersNotAvailable] =
    useState<NotAvailableStagingLayer[]>([]);

  // Check if the scenario name is available
  const [hasNameBeenChecked, setHasNameBeenChecked] = useState(false);
  useEffect(() => {
    if (!portal || !publishButtonClicked) return;

    const {
      includeAoiCharacterization,
      includeCustomSampleTypes,
      includePlan,
      includeStagingAreas,
      selectedAoiCharacterizations,
      selectedStagingAreas,
    } = configOutput;

    // see if names have already been verified as available
    const planNameChecked =
      !includePlan ||
      selectedScenario?.status === 'edited' ||
      selectedScenario?.status === 'published';
    const sampleTypesNameChecked =
      !includeCustomSampleTypes ||
      (publishSamplesMode === 'existing' && publishSampleTableMetaData?.value);

    // figure out what aoi characterizations are included
    let allAoisPublished = true;
    const aoiCharIdsToInclude = selectedAoiCharacterizations.map(
      (aoi) => aoi.value,
    );
    const aoiLayersToInclude: any[] = edits.edits.filter(
      (edit) =>
        edit.type === 'layer-aoi-analysis' &&
        aoiCharIdsToInclude.includes(edit.value),
    );
    if (selectedScenario?.type === 'scenario-decon') {
      edits.edits
        .filter(
          (edit) =>
            selectedScenario.linkedLayerIds.includes(edit.layerId) &&
            edit.type === 'layer-decon',
        )
        .forEach((linkedLayer) => {
          if (linkedLayer.type !== 'layer-decon') return;
          const aoiLayer = edits.edits.find(
            (edit) => edit.layerId === linkedLayer.analysisLayerId,
          ) as LayerAoiAnalysisEditsType;
          if (aoiLayer && !aoiCharIdsToInclude.includes(aoiLayer.layerId)) {
            aoiLayersToInclude.push(aoiLayer);
          }
        });
    }
    aoiLayersToInclude.forEach((aoiLayer) => {
      if (!['published', 'edited'].includes(aoiLayer.status))
        allAoisPublished = false;
    });
    const aoiCharNameChecked = !includeAoiCharacterization || allAoisPublished;

    // figure out what staging areas are included
    let allStagingAreasPublished = true;
    const stagingAreaIdsToInclude = selectedStagingAreas.map((sa) => sa.value);
    const stagingAreaLayersToInclude: any[] = edits.edits.filter(
      (edit) =>
        edit.type === 'layer' &&
        edit.layerType === 'Staging Area Mask' &&
        stagingAreaIdsToInclude.includes(edit.layerId),
    );
    stagingAreaLayersToInclude.forEach((saLayer) => {
      if (!['published', 'edited'].includes(saLayer.status))
        allStagingAreasPublished = false;
    });
    const stagingAreaNameChecked =
      !includeStagingAreas || allStagingAreasPublished;

    if (
      planNameChecked &&
      sampleTypesNameChecked &&
      aoiCharNameChecked &&
      stagingAreaNameChecked
    ) {
      setHasNameBeenChecked(true);
      return;
    }

    setPublishResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    // fire off requests to check if service names are available
    const requests = [];
    let planIndex = -1,
      sampleTypesIndex = -1;
    if (!planNameChecked && selectedScenario) {
      const request = isServiceNameAvailable(
        portal,
        signedIn,
        selectedScenario.scenarioName,
      );
      requests.push(request);
      planIndex = requests.length - 1;
    }
    if (!sampleTypesNameChecked && publishSampleTableMetaData) {
      const request = isServiceNameAvailable(
        portal,
        signedIn,
        publishSampleTableMetaData.label,
      );
      requests.push(request);
      sampleTypesIndex = requests.length - 1;
    }

    const aoiIndexes: number[] = [];
    const aoiLayerIndexes: { [key: number]: LayerAoiAnalysisEditsType } = {};
    aoiLayersToInclude.forEach((aoiLayer) => {
      if (['published', 'edited'].includes(aoiLayer.status)) return;
      const request = isServiceNameAvailable(portal, signedIn, aoiLayer.name);
      requests.push(request);
      aoiIndexes.push(requests.length - 1);
      aoiLayerIndexes[requests.length - 1] = aoiLayer;
    });

    const stagingAreaIndexes: number[] = [];
    const stagingAreaLayerIndexes: { [key: number]: LayerEditsType } = {};
    stagingAreaLayersToInclude.forEach((saLayer) => {
      if (['published', 'edited'].includes(saLayer.status)) return;
      const request = isServiceNameAvailable(portal, signedIn, saLayer.name);
      requests.push(request);
      stagingAreaIndexes.push(requests.length - 1);
      stagingAreaLayerIndexes[requests.length - 1] = saLayer;
    });

    Promise.all(requests)
      .then((responses: any[]) => {
        let stopEarly = false;
        let errorOccurred = false;

        function checkResponse(res: any, setter?: Function) {
          if (res.error) {
            stopEarly = true;
            errorOccurred = true;
            setPublishResponse({
              status: 'fetch-failure',
              summary: { success: '', failed: '' },
              error: {
                error: createErrorObject(res),
                message: res.error.message,
              },
              rawData: null,
            });
          }

          if (!res.available) {
            stopEarly = true;
            const status = res.problem ?? 'name-not-available';
            if (setter) setter(status);
            else return status;
          }
        }

        // check responses for errors
        if (planIndex > -1) {
          checkResponse(responses[planIndex], setPlanNameCheckStatus);
        }
        if (sampleTypesIndex > -1) {
          checkResponse(
            responses[sampleTypesIndex],
            setCustomSampleNameCheckStatus,
          );
        }

        const aoiLayersNotAvailable: NotAvailableAoiLayer[] = [];
        if (aoiIndexes.length > 0) {
          let anyUnavailable = false;
          aoiIndexes.forEach((index) => {
            const status = checkResponse(responses[index]);
            if (badStatuses.includes(status)) {
              anyUnavailable = true;
              aoiLayersNotAvailable.push({
                layer: aoiLayerIndexes[index],
                status,
              });
            }
          });

          if (anyUnavailable) {
            setAoiCharNameCheckStatus('name-not-available');
            setAoiLayersNotAvailable(aoiLayersNotAvailable);
          }
        }

        const stagingAreaLayersNotAvailable: NotAvailableStagingLayer[] = [];
        if (stagingAreaIndexes.length > 0) {
          let anyUnavailable = false;
          stagingAreaIndexes.forEach((index) => {
            const status = checkResponse(responses[index]);
            if (badStatuses.includes(status)) {
              anyUnavailable = true;
              stagingAreaLayersNotAvailable.push({
                layer: stagingAreaLayerIndexes[index],
                status,
              });
            }
          });

          if (anyUnavailable) {
            setStagingAreaNameCheckStatus('name-not-available');
            setStagingAreaLayersNotAvailable(stagingAreaLayersNotAvailable);
          }
        }

        if (stopEarly || errorOccurred) {
          setPublishButtonClicked(false);
          if (!errorOccurred) {
            setPublishResponse({
              status: 'name-not-available',
              summary: { success: '', failed: '' },
              rawData: null,
            });
          }
        }

        setHasNameBeenChecked(true);
      })
      .catch((err) => {
        console.error('isServiceNameAvailable error', err);
        setPublishResponse({
          status: 'fetch-failure',
          summary: { success: '', failed: '' },
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          rawData: err,
        });

        window.logErrorToGa(err);
      });
  }, [
    appType,
    configOutput,
    edits,
    hasNameBeenChecked,
    layers,
    portal,
    publishButtonClicked,
    publishSamplesMode,
    publishSampleTableMetaData,
    selectedScenario,
    signedIn,
    sketchLayer,
  ]);

  const publishItems = useCallback(() => {
    if (!map || !portal) return;

    async function publishItemsInner() {
      if (!map || !portal) return;

      const {
        includeAoiCharacterization,
        includeCustomSampleTypes,
        includePlan,
        includePlanWebMap,
        includePlanWebScene,
        includeStagingAreas,
        selectedAoiCharacterizations,
        selectedStagingAreas,
        webMapReferenceLayerSelections,
        webSceneReferenceLayerSelections,
      } = configOutput;

      try {
        const featureServices: any[] = [];
        const errorMessages: string[] = [];
        const includeSamplePlan = includePlan && !isDecon();
        const includeDeconPlan = includePlan && isDecon();
        const aoiIdsToInclude = selectedAoiCharacterizations.map(
          (aoi) => aoi.value,
        );
        const aoiLayersToInclude: any[] = edits.edits.filter(
          (edit) =>
            edit.type === 'layer-aoi-analysis' &&
            aoiIdsToInclude.includes(edit.value),
        );
        const stagingAreaIdsToInclude = selectedStagingAreas.map(
          (aoi) => aoi.value,
        );
        const stagingAreaLayersToInclude: any[] = edits.edits.filter(
          (edit) =>
            edit.type === 'layer' &&
            edit.layerType === 'Staging Area Mask' &&
            stagingAreaIdsToInclude.includes(edit.layerId),
        );

        const tempPortal = portal as any;
        const token = tempPortal.credential.token;

        if (includeSamplePlan && selectedScenario) {
          const layerInEdits = findLayerInEdits(
            edits.edits,
            selectedScenario.layerId,
          );
          const scenarioIndex = layerInEdits.scenarioIndex;
          const editsScenario =
            layerInEdits.editsScenario as ScenarioEditsType | null;

          if (
            scenarioIndex === -1 ||
            !editsScenario ||
            editsScenario.layers.length === 0
          ) {
            errorMessages.push('No sample data to publish');
          } else {
            // get the attributes to be published
            const attributesToInclude = [
              ...defaultPlanAttributes,
              ...(trainingMode ? trainingModePlanAttributes : []),
              ...editsScenario.customAttributes,
            ];
            attributesToInclude.forEach((item, index) => {
              item.id = index + 1;
            });

            let fields = layerProps.defaultFields;
            if (attributesToInclude) {
              fields = layerProps.defaultFields.filter(
                (x: any) =>
                  attributesToInclude.findIndex((y) => y.name === x.name) >
                    -1 ||
                  x.name === 'GLOBALID' ||
                  x.name === 'OBJECTID',
              );
            }

            attributesToInclude?.forEach((attribute) => {
              const fieldIndex = fields.findIndex(
                (x: any) => x.name === attribute.name,
              );

              if (fieldIndex > -1) return;

              fields.push(buildFieldFromCustomAttribute(attribute));
            });

            const layersToPublish: any[] = [];
            let sampleTypesToPublish: any = {};
            const adds: FeatureEditsType[] = [];
            const updates: FeatureEditsType[] = [];
            const deletes: any[] = [];
            const published: FeatureEditsType[] = [];
            const pointsAdds: FeatureEditsType[] = [];
            const pointsUpdates: FeatureEditsType[] = [];
            const pointsDeletes: any[] = [];
            const pointsPublished: FeatureEditsType[] = [];
            const uniqueValueInfosPolygonsCombined: any[] = [];
            const uniqueValueInfosPointsCombined: any[] = [];
            let fullExtent: __esri.Extent | null = null;
            editsScenario.layers.forEach((layerEdits) => {
              const layer = layers.find(
                (l) => l.layerId === layerEdits.layerId,
              );
              if (!layer) return;

              const {
                graphicsExtent,
                sampleTypes,
                uniqueValueInfosPolygons,
                uniqueValueInfosPoints,
              } = buildRendererParams(layer, null);

              if (graphicsExtent) {
                if (!fullExtent) fullExtent = graphicsExtent;
                else fullExtent.union(graphicsExtent);
              }

              uniqueValueInfosPolygons.forEach((item) => {
                const alreadyAdded =
                  uniqueValueInfosPolygonsCombined.findIndex(
                    (i) => i.value === item.value,
                  ) > -1;
                if (alreadyAdded) return;
                uniqueValueInfosPolygonsCombined.push(item);
              });
              uniqueValueInfosPoints.forEach((item) => {
                const alreadyAdded =
                  uniqueValueInfosPointsCombined.findIndex(
                    (i) => i.value === item.value,
                  ) > -1;
                if (alreadyAdded) return;
                uniqueValueInfosPointsCombined.push(item);
              });

              sampleTypesToPublish = {
                ...sampleTypesToPublish,
                ...sampleTypes,
              };

              published.push(...layerEdits.published);
              published.forEach((item) => {
                addPointFeatures(
                  layer,
                  pointsPublished,
                  item,
                  attributesToInclude,
                );
              });

              layerEdits.adds.forEach((item) => {
                let attributes: any = {};
                if (layer?.sketchLayer?.type === 'graphics') {
                  const graphic = layer.sketchLayer.graphics.find(
                    (graphic) =>
                      graphic.attributes.PERMANENT_IDENTIFIER ===
                      item.attributes.PERMANENT_IDENTIFIER,
                  );

                  if (graphic) {
                    attributes['GLOBALID'] = generateUUID();
                    attributes['OBJECTID'] = graphic.attributes['OBJECTID'];

                    attributesToInclude.forEach((attribute) => {
                      attributes[attribute.name] =
                        graphic.attributes[attribute.name] || null;
                    });
                  }
                }

                if (attributes.length === 0) {
                  attributes = { ...item.attributes };
                }

                adds.push({
                  ...item,
                  attributes,
                });
                addPointFeatures(layer, pointsAdds, item, attributesToInclude);
              });

              const combinedUpdates = [
                ...layerEdits.updates,
                ...layerEdits.published,
              ];
              combinedUpdates.forEach((item) => {
                let attributes: any = {};
                if (layer?.sketchLayer?.type === 'graphics') {
                  const graphic = layer.sketchLayer.graphics.find(
                    (graphic) =>
                      graphic.attributes.PERMANENT_IDENTIFIER ===
                      item.attributes.PERMANENT_IDENTIFIER,
                  );

                  if (graphic) {
                    attributes['GLOBALID'] = generateUUID();
                    attributes['OBJECTID'] = graphic.attributes['OBJECTID'];

                    attributesToInclude.forEach((attribute) => {
                      attributes[attribute.name] =
                        graphic.attributes[attribute.name] || null;
                    });
                  }
                }

                if (attributes.length === 0) {
                  attributes = { ...item.attributes };
                }

                const inDeletes =
                  layerEdits.deletes.findIndex(
                    (feat) =>
                      feat.PERMANENT_IDENTIFIER ===
                      item.attributes.PERMANENT_IDENTIFIER,
                  ) !== -1;
                if (!inDeletes) {
                  adds.push({
                    ...item,
                    attributes,
                  });
                  addPointFeatures(
                    layer,
                    pointsAdds, // layerEdits.pointsId === -1 ? pointsAdds : pointsUpdates,
                    item,
                    attributesToInclude,
                  );
                }
              });
              layerEdits.deletes.forEach((item) => {
                deletes.push({
                  ...item,
                  DECISIONUNITUUID: layer.uuid,
                });
                if (layerEdits.pointsId !== -1)
                  pointsDeletes.push(item.GLOBALID);
              });
            });

            layersToPublish.push({
              id: 0,
              layerId: editsScenario.layerId,
              layerDefinitionProps: {
                ...layerProps.defaultLayerProps,
                fields,
                name: selectedScenario.scenarioName,
                description: selectedScenario.scenarioDescription,
                extent: fullExtent,
                drawingInfo: {
                  renderer: {
                    type: 'uniqueValue',
                    field1: 'TYPEUUID',
                    uniqueValueInfos: uniqueValueInfosPolygonsCombined,
                  },
                },
                types: [
                  {
                    id: 'epa-tots-sample-layer',
                    name: 'epa-tots-sample-layer',
                  },
                ],
              },
              adds,
              updates,
              deletes,
              published,
            });

            layersToPublish.push({
              id: 1,
              layerId: `${editsScenario.layerId}-points`,
              layerDefinitionProps: {
                ...layerProps.defaultLayerProps,
                fields,
                geometryType: 'esriGeometryPoint',
                name: selectedScenario.scenarioName + '-points',
                description: selectedScenario.scenarioDescription,
                extent: fullExtent,
                drawingInfo: {
                  renderer: {
                    type: 'uniqueValue',
                    field1: 'TYPEUUID',
                    uniqueValueInfos: uniqueValueInfosPointsCombined,
                  },
                },
                types: [
                  {
                    id: 'epa-tots-sample-points-layer',
                    name: 'epa-tots-sample-points-layer',
                  },
                ],
              },
              adds: pointsAdds,
              updates: pointsUpdates,
              deletes: pointsDeletes,
              published: pointsPublished,
            });

            let contamMapToPublish: LayerType | null = null;
            if (trainingMode) contamMapToPublish = contaminationMap;
            if (!trainingMode && selectedScenario.portalId) {
              const editLayer = edits.edits.find(
                (e) =>
                  e.type === 'layer' &&
                  e.layerType === 'Contamination Map' &&
                  e.portalId === selectedScenario.portalId,
              );
              const layer = layers.find(
                (l) => l.layerId === editLayer?.layerId,
              );
              if (layer) contamMapToPublish = layer;
            }

            if (contamMapToPublish?.sketchLayer?.type === 'graphics') {
              const graphics =
                contamMapToPublish.sketchLayer.graphics.toArray();
              const unionGeometry =
                graphics.length > 0
                  ? geometryEngine.union(graphics.map((g) => g.geometry))
                  : undefined;

              const symbol = new SimpleFillSymbol(
                defaultSymbols.symbols['Contamination Map'],
              );

              layersToPublish.push({
                id: contamMapToPublish.id,
                layerId: contamMapToPublish.layerId,
                layerDefinitionProps: {
                  ...layerProps.defaultLayerProps,
                  fields: layerProps.defaultContaminationMapLayerFields,
                  geometryType: 'esriGeometryPolygon',
                  name: selectedScenario.scenarioName + '-contamination-map',
                  description: '',
                  extent: unionGeometry?.extent,
                  drawingInfo: {
                    renderer: {
                      type: 'simple',
                      symbol: symbol.toJSON(),
                    },
                  },
                  types: [
                    {
                      id: 'epa-tots-contamination-map-layer',
                      name: 'epa-tots-contamination-map-layer',
                    },
                  ],
                },
                adds: graphics.map((graphic) =>
                  convertToSimpleGraphic(graphic),
                ),
                updates: [],
                deletes: [],
                published: [],
              });
            }

            console.log('layersToPublish: ', layersToPublish);
            featureServices.push({
              category: 'contains-epa-tots-sample-layer',
              label: editsScenario.scenarioName,
              value: editsScenario.portalId ?? '',
              description: editsScenario.scenarioDescription,
              url: '',
              layerId: editsScenario.layerId,
              layers: layersToPublish,
              tables: [
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultFields,
                    type: 'Table',
                    name: `${editsScenario.scenarioName}-sample-types`,
                    description: `Custom sample type definitions for "${editsScenario.scenarioName}".`,
                  },
                  data: Object.values(sampleTypesToPublish).map(
                    (item: any) => ({
                      ...item.attributes,
                      id: undefined,
                      GLOBALID: generateUUID(),
                      OBJECTID: -1,
                    }),
                  ),
                },
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultCalculateSettingsTableFields,
                    type: 'Table',
                    name: `${editsScenario.scenarioName}-calculate-settings`,
                    description: `Calculate settings for "${editsScenario.scenarioName}".`,
                  },
                  data: [editsScenario.calculateSettings.current],
                },
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultCalculateResultsTableFields,
                    type: 'Table',
                    name: `${editsScenario.scenarioName}-calculate-results`,
                    description: `Calculate results for "${editsScenario.scenarioName}".`,
                  },
                  data: [calculateResults.data],
                },
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultReferenceTableFields,
                    type: 'Table',
                    name: `${editsScenario.scenarioName}-reference-layers`,
                    description: `Links to reference layers for "${editsScenario.scenarioName}".`,
                  },
                  data: buildReferenceLayerTableEdits({
                    createWebMap: includePlanWebMap,
                    createWebScene: includePlanWebScene,
                    webMapReferenceLayerSelections,
                    webSceneReferenceLayerSelections,
                  }),
                },
              ],
              referenceMaterials: {
                createWebMap: includePlanWebMap,
                createWebScene: includePlanWebScene,
                webMapReferenceLayerSelections,
                webSceneReferenceLayerSelections,
              },
              onPublishComplete: (res: any) => {
                console.log('res: ', res);
                const portalId = res.portalId;

                const changes: PublishResults = {};
                res.edits.forEach((layerRes: any) => {
                  if (layerRes.id !== 0) return;

                  // need to loop through each array and check the success flag
                  if (layerRes.addResults) {
                    layerRes.addResults.forEach((item: any, index: number) => {
                      // update the edits arrays
                      const origItem = layersToPublish[0].adds[index];
                      const decisionUUID = origItem.attributes.DECISIONUNITUUID;
                      const permanentId =
                        origItem.attributes.PERMANENT_IDENTIFIER;
                      if (item.success) {
                        const type = origItem.attributes.TYPE;
                        origItem.attributes = { ...sampleAttributes[type] };
                        origItem.attributes.DECISIONUNITUUID = decisionUUID;
                        origItem.attributes.PERMANENT_IDENTIFIER = permanentId;
                        origItem.attributes.OBJECTID = item.objectId;
                        origItem.attributes.GLOBALID = item.globalId;

                        // update the published for this layer
                        if (
                          Object.prototype.hasOwnProperty.call(
                            changes,
                            decisionUUID,
                          )
                        ) {
                          const exist =
                            changes[decisionUUID].published.findIndex(
                              (x) =>
                                x.attributes.PERMANENT_IDENTIFIER ===
                                origItem.attributes.PERMANENT_IDENTIFIER,
                            ) > -1;
                          if (!exist)
                            changes[decisionUUID].published.push(origItem);
                        } else {
                          changes[decisionUUID] = {
                            adds: [],
                            updates: [],
                            deletes: [],
                            published: [origItem],
                          };
                        }

                        // find the tots layer
                        const mapLayer = layers.find(
                          (layer) => layer.uuid === decisionUUID,
                        );

                        // update the graphic on the map
                        if (
                          mapLayer &&
                          mapLayer.sketchLayer?.type === 'graphics'
                        ) {
                          const graphic = mapLayer.sketchLayer.graphics.find(
                            (graphic) =>
                              graphic.attributes.PERMANENT_IDENTIFIER ===
                              origItem.attributes.PERMANENT_IDENTIFIER,
                          );

                          if (graphic) {
                            graphic.attributes.OBJECTID = item.objectId;
                            graphic.attributes.GLOBALID = item.globalId;
                          }
                        }
                      } else {
                        // update the adds for this layer
                        if (
                          Object.prototype.hasOwnProperty.call(
                            changes,
                            decisionUUID,
                          )
                        ) {
                          changes[decisionUUID].adds.push(origItem);
                        } else {
                          changes[decisionUUID] = {
                            adds: [origItem],
                            updates: [],
                            deletes: [],
                            published: [],
                          };
                        }
                      }
                    });
                  }
                  if (layerRes.updateResults) {
                    layerRes.updateResults.forEach(
                      (item: any, index: number) => {
                        // update the edits arrays
                        const origItem = layersToPublish[0].updates[index];
                        const decisionUUID =
                          origItem.attributes.DECISIONUNITUUID;
                        if (
                          item.success &&
                          Object.prototype.hasOwnProperty.call(
                            changes,
                            decisionUUID,
                          )
                        ) {
                          const type = origItem.attributes.TYPE;
                          origItem.attributes = { ...sampleAttributes[type] };
                          origItem.attributes.DECISIONUNITUUID = decisionUUID;
                          origItem.attributes.OBJECTID = item.objectId;
                          origItem.attributes.GLOBALID = item.globalId;

                          // get the publish items for this layer
                          const layerNewPublished =
                            changes[decisionUUID].published;

                          // find the item in published
                          const index = layerNewPublished.findIndex(
                            (pubItem) =>
                              pubItem.attributes.PERMANENT_IDENTIFIER ===
                              origItem.attributes.PERMANENT_IDENTIFIER,
                          );

                          // update the item in newPublished
                          if (index > -1) {
                            changes[decisionUUID].published = [
                              ...layerNewPublished.slice(0, index),
                              origItem,
                              ...layerNewPublished.slice(index + 1),
                            ];
                          }

                          // find the tots layer
                          const mapLayer = layers.find(
                            (layer) => layer.uuid === decisionUUID,
                          );

                          // update the graphic on the map
                          if (
                            mapLayer &&
                            mapLayer.sketchLayer?.type === 'graphics'
                          ) {
                            const graphic = mapLayer.sketchLayer.graphics.find(
                              (graphic) =>
                                graphic.attributes.PERMANENT_IDENTIFIER ===
                                origItem.attributes.PERMANENT_IDENTIFIER,
                            );

                            if (graphic) {
                              graphic.attributes.OBJECTID = item.objectId;
                              graphic.attributes.GLOBALID = item.globalId;
                            }
                          }
                        } else {
                          // update the updates for this layer
                          if (
                            Object.prototype.hasOwnProperty.call(
                              changes,
                              decisionUUID,
                            )
                          ) {
                            changes[decisionUUID].updates.push(origItem);
                          } else {
                            changes[decisionUUID] = {
                              adds: [],
                              updates: [origItem],
                              deletes: [],
                              published: [],
                            };
                          }
                        }
                      },
                    );
                  }
                  if (layerRes.deleteResults) {
                    layerRes.deleteResults.forEach(
                      (item: any, index: number) => {
                        // update the edits delete array
                        const origItem = layersToPublish[0].deletes[index];
                        const decisionUUID = origItem.DECISIONUNITUUID;
                        if (
                          item.success &&
                          Object.prototype.hasOwnProperty.call(
                            changes,
                            decisionUUID,
                          )
                        ) {
                          // get the publish items for this layer
                          const layerNewPublished =
                            changes[decisionUUID].published;

                          // find the item in published
                          const pubIndex = layerNewPublished.findIndex(
                            (pubItem) =>
                              pubItem.attributes.PERMANENT_IDENTIFIER ===
                              origItem.PERMANENT_IDENTIFIER,
                          );

                          // update the item in newPublished
                          if (pubIndex > -1) {
                            changes[decisionUUID].published = [
                              ...layerNewPublished.slice(0, pubIndex),
                              ...layerNewPublished.slice(pubIndex + 1),
                            ];
                          }
                        } else {
                          // update the updates for this layer
                          if (
                            Object.prototype.hasOwnProperty.call(
                              changes,
                              decisionUUID,
                            )
                          ) {
                            changes[decisionUUID].deletes.push(origItem);
                          } else {
                            changes[decisionUUID] = {
                              adds: [],
                              updates: [],
                              deletes: [origItem],
                              published: [],
                            };
                          }
                        }
                      },
                    );
                  }
                });

                // make a copy of the edits context variable
                // update the edits state
                setEdits((edits) => {
                  const editsScenario = edits.edits[
                    scenarioIndex
                  ] as ScenarioEditsType;
                  editsScenario.status = 'published';
                  editsScenario.portalId = portalId;

                  editsScenario.layers.forEach((editedLayer) => {
                    // update the ids
                    if (
                      Object.prototype.hasOwnProperty.call(
                        res.idMapping,
                        editedLayer.uuid,
                      )
                    ) {
                      editedLayer.portalId = portalId;
                      editedLayer.id = res.idMapping[editedLayer.uuid].id;
                      editedLayer.pointsId =
                        res.idMapping[editedLayer.uuid].pointsId;
                      editsScenario.id = editedLayer.id;
                      editsScenario.pointsId =
                        res.idMapping[editedLayer.uuid].pointsId;
                    }

                    const edits = changes[editedLayer.uuid];
                    if (edits) {
                      const oldPublished = editedLayer.published.filter((x) => {
                        const idx = editedLayer.deletes.findIndex(
                          (y) =>
                            y.PERMANENT_IDENTIFIER ===
                            x.attributes.PERMANENT_IDENTIFIER,
                        );
                        const idx2 = edits.published.findIndex(
                          (y) =>
                            y.attributes.PERMANENT_IDENTIFIER ===
                            x.attributes.PERMANENT_IDENTIFIER,
                        );
                        return idx === -1 && idx2 === -1;
                      });

                      editedLayer.adds = edits.adds;
                      editedLayer.updates = edits.updates;
                      editedLayer.published = [
                        ...oldPublished,
                        ...edits.published,
                      ];
                      editedLayer.deletes = edits.deletes;
                    }
                  });
                  editsScenario.table = res.table;

                  return {
                    count: edits.count + 1,
                    edits: [
                      ...edits.edits.slice(0, scenarioIndex),
                      editsScenario,
                      ...edits.edits.slice(scenarioIndex + 1),
                    ],
                  };
                });

                // updated the edited layer
                setLayers((layers) =>
                  layers.map((layer) => {
                    if (
                      !Object.prototype.hasOwnProperty.call(changes, layer.uuid)
                    )
                      return layer;

                    const updatedLayer: LayerType = {
                      ...layer,
                      status: 'published',
                      portalId,
                    };

                    // update the ids
                    if (
                      Object.prototype.hasOwnProperty.call(
                        res.idMapping,
                        layer.uuid,
                      )
                    ) {
                      updatedLayer.id = res.idMapping[layer.uuid].id;
                      updatedLayer.pointsId =
                        res.idMapping[layer.uuid].pointsId;
                    }

                    return updatedLayer;
                  }),
                );

                setSelectedScenario((selectedScenario) => {
                  if (!selectedScenario) return selectedScenario;

                  selectedScenario.status = 'published';
                  selectedScenario.portalId = portalId;
                  return selectedScenario;
                });
              },
            });
          }
        }

        if (includeDeconPlan && selectedScenario) {
          const { scenarioIndex, editsScenario } = findLayerInEdits(
            edits.edits,
            selectedScenario.layerId,
          );

          if (
            scenarioIndex === -1 ||
            !editsScenario ||
            editsScenario.type !== 'scenario-decon' ||
            editsScenario.linkedLayerIds.length === 0 ||
            !calculateResultsDecon.data
          ) {
            errorMessages.push('No data to publish');
          } else {
            const layersToPublish: any[] = [];
            const linkedLayers = edits.edits.filter(
              (edit) =>
                editsScenario.linkedLayerIds.includes(edit.layerId) &&
                edit.type === 'layer-decon',
            );

            // build outputs for: operationSettings, operationDetails, calculationResults
            const operationSettings: any[] = [];
            const operationDetails: any[] = [];
            let calculationResults: any[] = [];
            const calculationResultsSummary: any[] = [];
            const calculationResultsWasteSummary: any[] = [];
            linkedLayers.forEach((linkedLayer) => {
              if (linkedLayer.type !== 'layer-decon') return;
              const aoiLayer = edits.edits.find(
                (edit) => edit.layerId === linkedLayer.analysisLayerId,
              ) as LayerAoiAnalysisEditsType;
              const alreadyAdded =
                aoiLayersToInclude.findIndex(
                  (a) => a.layerId === aoiLayer?.layerId,
                ) > -1;
              if (aoiLayer && !alreadyAdded) aoiLayersToInclude.push(aoiLayer);

              let numBuildings = 0;
              aoiLayer?.layers?.forEach((layer) => {
                if (layer.layerType !== 'AOI Assessed') return;
                numBuildings +=
                  layer.adds.length +
                  layer.updates.length +
                  layer.published.length;
              });

              operationSettings.push({
                OPERATION_UUID: linkedLayer.layerId,
                OPERATION_NAME: linkedLayer.name,
                AOI_LAYER_ID: linkedLayer.analysisLayerId,
                AOI_VERSION: aoiLayer.version ?? 1,
                BUILDING_COUNT: numBuildings,
                BUILDING_AREA_TOTAL: aoiLayer.aoiSummary.totalBuildingSqM,
                BUILDING_AREA_EXTERIOR: aoiLayer.aoiSummary.totalBuildingExtSqM,
                BUILDING_AREA_INTERIOR: aoiLayer.aoiSummary.totalBuildingIntSqM,
                BUILDING_AREA_FOOTPRINT:
                  aoiLayer.aoiSummary.totalBuildingFootprintSqM,
                BUILDING_AREA_CEILINGS:
                  aoiLayer.aoiSummary.totalBuildingCeilingsSqM,
                BUILDING_AREA_EXTERIOR_WALLS:
                  aoiLayer.aoiSummary.totalBuildingExtWallsSqM,
                BUILDING_AREA_INTERIOR_WALLS:
                  aoiLayer.aoiSummary.totalBuildingIntWallsSqM,
                BUILDING_AREA_FLOORS:
                  aoiLayer.aoiSummary.totalBuildingFloorsSqM,
                BUILDING_AREA_ROOFS: aoiLayer.aoiSummary.totalBuildingRoofSqM,
                BUILDING_VOLUME: aoiLayer.aoiSummary.totalBuildingVolumeCubM,
                BUILDING_VOLUME_CONTENTS:
                  aoiLayer.aoiSummary.totalBuildingVolumeContentsCubM,
                GROUND_AREA_SOIL: aoiLayer.aoiPercentages.soilSqM,
                GROUND_PCT_SOIL: aoiLayer.aoiPercentages.soil,
                GROUND_AREA_ASPHALT: aoiLayer.aoiPercentages.asphaltSqM,
                GROUND_PCT_ASPHALT: aoiLayer.aoiPercentages.asphalt,
                GROUND_AREA_CONCRETE: aoiLayer.aoiPercentages.concreteSqM,
                GROUND_PCT_CONCRETE: aoiLayer.aoiPercentages.concrete,
                AOI_AREA: aoiLayer.aoiSummary.totalAoiSqM,
                DECON_EST_APPROACH: linkedLayer.approach,
                DECON_BLDG_EST_APPROACH: linkedLayer.buildingApproach,
                NOTES: '',
              });

              linkedLayer.deconTechSelections.forEach((tech) => {
                operationDetails.push({
                  OPERATION_UUID: linkedLayer.layerId,
                  SURFACE_UUID: tech.id,
                  PARENT_SURFACE_UUID: null,
                  SURFACE: tech.media,
                  SURFACE_SUB_CATEGORY: null,
                  DECON_TECH_UUID: tech.deconTech?.value ?? null,
                  DECON_TECH: tech.deconTech?.label ?? null,
                  NUM_ITERATIVE_APPLICATIONS: tech.numIterativeApplications,
                  NUM_TEAMS: tech.numTeams,
                  PCT_AOI: tech.pctAoi,
                  PCT_DECONED: tech.pctDeconed,
                  SURFACE_AREA: tech.surfaceArea,
                  VOLUME: tech.volume,
                  VOLUME_CONTENTS: tech.volumeContents,
                  REMOVE_BLDG_CONTENTS: tech.removeBuildingContents,
                  NOTES: '',
                });

                tech.subRows?.forEach((sub) => {
                  operationDetails.push({
                    OPERATION_UUID: linkedLayer.layerId,
                    SURFACE_UUID: sub.id,
                    PARENT_SURFACE_UUID: tech.id,
                    SURFACE: tech.media,
                    SURFACE_SUB_CATEGORY: sub.media,
                    DECON_TECH_UUID:
                      (sub.deconTech
                        ? sub.deconTech.value
                        : tech.deconTech?.value) ?? null,
                    DECON_TECH:
                      (sub.deconTech
                        ? sub.deconTech.label
                        : tech.deconTech?.label) ?? null,
                    NUM_ITERATIVE_APPLICATIONS: sub.numIterativeApplications,
                    NUM_TEAMS: sub.numTeams,
                    PCT_AOI: sub.pctAoi,
                    PCT_DECONED: sub.pctDeconed,
                    SURFACE_AREA: sub.surfaceArea,
                    VOLUME: sub.volume,
                    VOLUME_CONTENTS: sub.volumeContents,
                    REMOVE_BLDG_CONTENTS: sub.removeBuildingContents,
                    NOTES: '',
                  });
                });
              });

              let totalSolidWaste = 0;
              let totalLiquidWaste = 0;
              let totalSolidWasteMass = 0;
              let totalLiquidWasteMass = 0;
              let totalCost = 0;
              let totalTime = 0;
              linkedLayer.deconLayerResults.resultsTable.forEach((tech) => {
                totalSolidWaste += tech.solidWasteVolumeM3;
                totalSolidWasteMass += tech.solidWasteMassKg;
                totalLiquidWaste += tech.liquidWasteVolumeM3;
                totalLiquidWasteMass += tech.liquidWasteMassKg;
                totalCost += tech.decontaminationCost;
                totalTime = Math.max(tech.decontaminationTimeDays, totalTime);
                calculationResults.push({
                  OPERATION_UUID: linkedLayer.layerId,
                  AGGREGATION_LEVEL: 'RAW',
                  SURFACE: tech.contaminationScenario,
                  SURFACE_SUB_CATEGORY: null,
                  DECON_TECH_UUID: tech.decontaminationTechnology,
                  DECON_TECH: tech.decontaminationTechnology,
                  SOLID_WASTE_M3: tech.solidWasteVolumeM3,
                  SOLID_WASTE_MASS: tech.solidWasteMassKg,
                  AQUEOUS_WASTE_M3: tech.liquidWasteVolumeM3,
                  AQUEOUS_WASTE_MASS: tech.liquidWasteMassKg,
                  COST: tech.decontaminationCost,
                  TIME: tech.decontaminationTimeDays,
                });
              });

              calculationResultsSummary.push({
                OPERATION_UUID: linkedLayer.layerId,
                AGGREGATION_LEVEL: 'SUMMARY',
                SURFACE: linkedLayer.name,
                SURFACE_SUB_CATEGORY: null,
                DECON_TECH_UUID: null,
                DECON_TECH: null,
                SOLID_WASTE_M3: totalSolidWaste,
                SOLID_WASTE_MASS: totalSolidWasteMass,
                AQUEOUS_WASTE_M3: totalLiquidWaste,
                AQUEOUS_WASTE_MASS: totalLiquidWasteMass,
                COST: totalCost,
                TIME: totalTime,
              });
            });

            let totalSolidWaste = 0;
            let totalSolidWasteMass = 0;
            let totalLiquidWaste = 0;
            let totalLiquidWasteMass = 0;
            let totalCost = 0;
            let totalTime = 0;
            calculationResultsSummary.forEach((summary) => {
              totalSolidWaste += summary.SOLID_WASTE_M3;
              totalSolidWasteMass += summary.SOLID_WASTE_MASS;
              totalLiquidWaste += summary.AQUEOUS_WASTE_M3;
              totalLiquidWasteMass += summary.AQUEOUS_WASTE_MASS;
              totalCost += summary.COST;
              totalTime = Math.max(summary.TIME, totalTime);
            });

            calculationResultsSummary.push({
              OPERATION_UUID: null,
              AGGREGATION_LEVEL: 'SUMMARY_TOTALS',
              SURFACE: null,
              SURFACE_SUB_CATEGORY: null,
              DECON_TECH_UUID: null,
              DECON_TECH: null,
              SOLID_WASTE_M3: totalSolidWaste,
              SOLID_WASTE_MASS: totalSolidWasteMass,
              AQUEOUS_WASTE_M3: totalLiquidWaste,
              AQUEOUS_WASTE_MASS: totalLiquidWasteMass,
              COST: totalCost,
              TIME: totalTime,
            });

            calculateResultsDecon.data.resultsTable.forEach((tech) => {
              calculationResultsWasteSummary.push({
                OPERATION_UUID: null,
                AGGREGATION_LEVEL: 'WASTE_SUMMARY',
                SURFACE: tech.contaminationScenario,
                SURFACE_SUB_CATEGORY: null,
                DECON_TECH_UUID: tech.decontaminationTechnology,
                DECON_TECH: tech.decontaminationTechnology,
                SOLID_WASTE_M3: tech.solidWasteVolumeM3,
                SOLID_WASTE_MASS: tech.solidWasteMassKg,
                AQUEOUS_WASTE_M3: tech.liquidWasteVolumeM3,
                AQUEOUS_WASTE_MASS: tech.liquidWasteMassKg,
                COST: tech.decontaminationCost,
                TIME: tech.decontaminationTimeDays,
              });
            });

            calculationResults = [
              ...calculationResultsSummary,
              ...calculationResultsWasteSummary,
              ...calculationResults,
            ];

            const updatedContamMap = map.allLayers.find(
              (l) => l.id === 'contaminationMapUpdated',
            ) as __esri.GraphicsLayer;
            if (
              updatedContamMap?.type === 'graphics' &&
              updatedContamMap.graphics.length > 0
            ) {
              const graphics = updatedContamMap.graphics.toArray();
              const unionGeometry =
                graphics.length > 0
                  ? geometryEngine.union(graphics.map((g) => g.geometry))
                  : undefined;

              const symbol = new SimpleFillSymbol(
                defaultSymbols.symbols['Contamination Map'],
              );

              const uuid = generateUUID();
              layersToPublish.push({
                id: 0,
                layerId: uuid,
                layerDefinitionProps: {
                  ...layerProps.defaultLayerProps,
                  fields: layerProps.defaultContaminationMapLayerFields,
                  geometryType: 'esriGeometryPolygon',
                  name: selectedScenario.scenarioName + '-contamination-map',
                  description: '',
                  extent: unionGeometry?.extent,
                  drawingInfo: {
                    renderer: {
                      type: 'simple',
                      symbol: symbol.toJSON(),
                    },
                  },
                  types: [
                    {
                      id: 'epa-tots-contamination-map-layer',
                      name: 'epa-tots-contamination-map-layer',
                    },
                  ],
                },
                adds: graphics.map((graphic) =>
                  convertToSimpleGraphic(graphic),
                ),
                updates: [],
                deletes: [],
                published: [],
              });
            }

            featureServices.push({
              category: 'contains-epa-tods-decon-layer',
              label: editsScenario.scenarioName,
              value: editsScenario.portalId ?? '',
              description: editsScenario.scenarioDescription,
              url: '',
              layerId: editsScenario.layerId,
              layers: layersToPublish,
              tables: [
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultDeconOperationSettingsTableFields,
                    type: 'Table',
                    name: `${editsScenario.scenarioName}-operation-settings`,
                    description: `Operation settings for "${editsScenario.scenarioName}".`,
                  },
                  data: operationSettings,
                },
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultDeconOperationDetailsTableFields,
                    type: 'Table',
                    name: `${editsScenario.scenarioName}-operation-details`,
                    description: `Operation details for "${editsScenario.scenarioName}".`,
                  },
                  data: operationDetails,
                },
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields:
                      layerProps.defaultDeconCalculationResultsTableFields,
                    type: 'Table',
                    name: `${editsScenario.scenarioName}-calculation-results`,
                    description: `Calculation results for "${editsScenario.scenarioName}".`,
                  },
                  data: calculationResults,
                },
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultReferenceTableFields,
                    type: 'Table',
                    name: `${editsScenario.scenarioName}-reference-layers`,
                    description: `Links to reference layers for "${editsScenario.scenarioName}".`,
                  },
                  data: buildReferenceLayerTableEdits({
                    createWebMap: includePlanWebMap,
                    createWebScene: includePlanWebScene,
                    webMapReferenceLayerSelections,
                    webSceneReferenceLayerSelections,
                  }),
                },
              ],
              onPublishComplete: (res: any) => {
                console.log('res: ', res);
                const portalId = res.portalId;

                // make a copy of the edits context variable
                // update the edits state
                setEdits((edits) => {
                  const editsScenario = edits.edits[
                    scenarioIndex
                  ] as ScenarioDeconEditsType;
                  editsScenario.status = 'published';
                  editsScenario.portalId = portalId;

                  editsScenario.linkedLayerIds.forEach((linkedLayerId) => {
                    const linkedLayer = edits.edits.find(
                      (edit) => edit.layerId === linkedLayerId,
                    );
                    if (!linkedLayer) return;
                    linkedLayer.status = 'published';
                    linkedLayer.portalId = portalId;
                  });

                  return {
                    count: edits.count + 1,
                    edits: [
                      ...edits.edits.slice(0, scenarioIndex),
                      editsScenario,
                      ...edits.edits.slice(scenarioIndex + 1),
                    ],
                  };
                });

                // updated the edited layer
                setLayers((layers) =>
                  // TODO need to look up layers linked to selectedScenario
                  //      this only applys to layerType=Decon
                  layers.map((layer) => {
                    const editsLayer = edits.edits.find(
                      (edit) =>
                        edit.layerId === layer.layerId &&
                        edit.type === 'layer-decon',
                    );
                    if (!editsLayer) return layer;

                    const updatedLayer: LayerType = {
                      ...layer,
                      status: 'published',
                      portalId,
                    };
                    return updatedLayer;
                  }),
                );

                setSelectedScenario((selectedScenario) => {
                  if (!selectedScenario) return selectedScenario;

                  selectedScenario.status = 'published';
                  selectedScenario.portalId = portalId;
                  return selectedScenario;
                });
              },
            });
          }
        }

        if (includeCustomSampleTypes) {
          if (sampleTypeSelections.length === 0) {
            errorMessages.push('No sample types to publish');
          } else if (!publishSampleTableMetaData) {
            errorMessages.push('Feature service metadata missing');
          } else if (publishSamplesMode === 'existing' && !selectedService) {
            errorMessages.push('No existing feature service selected');
          } else {
            const sampleTypeData: any[] = [];
            if (publishSamplesMode === 'new') {
              sampleTypeSelections.forEach((type) => {
                if (!type.value) return;

                const sampleType =
                  userDefinedAttributes.sampleTypes[type.value];
                const symbolTypeUuid =
                  sampleType.attributes.TYPEUUID ?? 'Samples';
                const defaultSymbol =
                  defaultSymbols.symbols[
                    Object.prototype.hasOwnProperty.call(
                      defaultSymbols.symbols,
                      symbolTypeUuid,
                    )
                      ? symbolTypeUuid
                      : 'Samples'
                  ];
                if (publishSamplesMode === 'new') {
                  sampleTypeData.push({
                    ...sampleType.attributes,
                    SYMBOLCOLOR: JSON.stringify(defaultSymbol.color),
                    SYMBOLOUTLINE: JSON.stringify(defaultSymbol.outline),
                    SYMBOLTYPE: defaultSymbol.type,
                  });
                }
              });
            }
            if (publishSamplesMode === 'existing' && selectedService) {
              const res = (await getFeatureTables(
                selectedService.url,
                token,
              )) as any[];

              // fire off requests to get the details and features for each layer
              const layerPromises: Promise<any>[] = [];
              res.forEach((layer: any) => {
                // get the layer features promise
                const featuresCall = getAllFeatures(
                  portal,
                  selectedService.url + '/' + layer.id,
                );
                layerPromises.push(featuresCall);
              });

              // wait for all of the promises to resolve
              const responses = await Promise.all(layerPromises);

              // define items used for updating states
              const existingTypeUuids: string[] = [];

              // create the user defined sample types to be added to TOTS
              responses.forEach((layerFeatures) => {
                // get the graphics from the layer
                layerFeatures.features.forEach((feature: any) => {
                  const uuid = feature.attributes.TYPEUUID;
                  sampleTypeData.push(feature.attributes);
                  if (!existingTypeUuids.includes(uuid)) {
                    existingTypeUuids.push(uuid);
                  }
                });
              });

              sampleTypeSelections.forEach((type) => {
                if (!type.value) return;

                const sampleType =
                  userDefinedAttributes.sampleTypes[type.value];
                const symbolTypeUuid =
                  sampleType.attributes.TYPEUUID ?? 'Samples';
                const defaultSymbol =
                  defaultSymbols.symbols[
                    Object.prototype.hasOwnProperty.call(
                      defaultSymbols.symbols,
                      symbolTypeUuid,
                    )
                      ? symbolTypeUuid
                      : 'Samples'
                  ];
                const item = {
                  ...sampleType.attributes,
                  SYMBOLCOLOR: JSON.stringify(defaultSymbol.color),
                  SYMBOLOUTLINE: JSON.stringify(defaultSymbol.outline),
                  SYMBOLTYPE: defaultSymbol.type,
                };
                const typeUuid = item.TYPEUUID || '';

                if (!existingTypeUuids.includes(typeUuid)) {
                  sampleTypeData.push(item);
                }
              });
            }

            featureServices.push({
              category: 'contains-epa-tots-user-defined-sample-types',
              label: publishSampleTableMetaData.label,
              description: publishSampleTableMetaData.description,
              url: publishSampleTableMetaData.url,
              value: publishSampleTableMetaData.value,
              layers: [],
              tables: [
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultFields,
                    type: 'Table',
                    name: publishSampleTableMetaData.label,
                    description: publishSampleTableMetaData.description,
                  },
                  data: sampleTypeData,
                },
              ],
              onPublishComplete: (res: any) => {
                console.log('res: ', res);
                const newUserDefinedAttributes = { ...userDefinedAttributes };

                // need to loop through each array and check the success flag
                if (res.edits.addResults) {
                  res.edits.addResults.forEach((item: any, index: number) => {
                    // update the edits arrays
                    const origItem = sampleTypeData[index];
                    const origUdt =
                      newUserDefinedAttributes.sampleTypes[
                        origItem.attributes.TYPEUUID
                      ];
                    if (item.success) {
                      origUdt.status = origUdt.serviceId
                        ? 'published-ago'
                        : 'published';
                      origUdt.serviceId =
                        res.service.featureService.serviceItemId;
                      origUdt.attributes.GLOBALID = item.globalId;
                      origUdt.attributes.OBJECTID = item.objectId;
                    }
                  });
                }

                setUserDefinedAttributes(newUserDefinedAttributes);
                if (publishSamplesMode === 'new') {
                  setSampleTableDescription('');
                  setSampleTableName('');
                }
                if (publishSamplesMode === 'existing') {
                  setSelectedService(null);
                }
              },
            });
          }
        }

        if (
          (includeAoiCharacterization || includePlan) &&
          aoiLayersToInclude.length > 0
        ) {
          aoiLayersToInclude.forEach((aoiLayer) => {
            const layersToPublish = [];
            let extent: __esri.Extent | null = null;

            const imageryLayer = aoiLayer.layers.find(
              (l) => l.layerType === 'Image Analysis',
            );
            const buildingLayer = aoiLayer.layers.find(
              (l) => l.layerType === 'AOI Assessed',
            );
            const maskLayer = aoiLayer.layers.find(
              (l) => l.layerType === 'Decon Mask',
            );

            // get the extent
            const maskLayerSketch = layers.find(
              (l) => l.layerId === maskLayer?.layerId,
            );
            if (maskLayerSketch?.sketchLayer?.type === 'graphics') {
              const unionGeometry = geometryEngine.union(
                maskLayerSketch.sketchLayer.graphics
                  .toArray()
                  .map((g) => g.geometry),
              );
              extent = unionGeometry.extent;
            }

            if (imageryLayer) {
              layersToPublish.push({
                id: imageryLayer.id,
                layerId: imageryLayer.layerId,
                layerDefinitionProps: {
                  ...layerProps.defaultLayerProps,
                  fields: layerProps.defaultImageryAnalysisFields,
                  hasZ: false,
                  name: 'Imagery Analysis Results',
                  description: '',
                  extent,
                  drawingInfo: {
                    renderer: {
                      type: 'uniqueValue',
                      field1: 'category',
                      uniqueValueInfos: Object.keys(imageAnalysisSymbols).map(
                        (key) => ({
                          value: key,
                          label: key,
                          symbol: imageAnalysisSymbols[key].toJSON(),
                        }),
                      ),
                      defaultSymbol: {
                        type: 'esriSFS',
                        style: 'esriSFSSolid',
                        color: [150, 150, 150, 0.2],
                        outline: {
                          color: [153, 153, 153, 64],
                          width: 0.84,
                        },
                      },
                    },
                  },
                  types: [
                    {
                      id: 'epa-tods-imagery-analysis-layer',
                      name: 'epa-tods-imagery-analysis-layer',
                    },
                  ],
                },
                adds: imageryLayer.adds.map((a) => ({
                  ...a,
                  attributes: {
                    ...a.attributes,
                    GLOBALID: generateUUID(),
                  },
                })),
                updates: imageryLayer.updates.map((a) => ({
                  ...a,
                  attributes: {
                    ...a.attributes,
                    GLOBALID: generateUUID(),
                  },
                })),
                deletes: imageryLayer.deletes,
                published: imageryLayer.published,
              });
            }

            let numBuildings = 0;
            if (buildingLayer) {
              numBuildings =
                buildingLayer.adds.length +
                buildingLayer.updates.length +
                buildingLayer.published.length;
              layersToPublish.push({
                id: buildingLayer.id,
                layerId: buildingLayer.layerId,
                layerDefinitionProps: {
                  ...layerProps.defaultLayerProps,
                  fields: layerProps.defaultBuildingLayerFields,
                  hasZ: false,
                  name: 'Building Results',
                  description: '',
                  extent,
                  drawingInfo: {
                    renderer: {
                      type: 'uniqueValue',
                      field1: 'category',
                      uniqueValueInfos: Object.keys(buildingColors)
                        .filter((k) => k !== 'Other')
                        .map((key) => ({
                          value: key,
                          label: key,
                          symbol: {
                            type: 'esriSFS',
                            style: 'esriSFSSolid',
                            color: buildingColors[key],
                            outline: {
                              color: [153, 153, 153, 64],
                              width: 0.84,
                            },
                          },
                        })),
                      defaultSymbol: {
                        type: 'esriSFS',
                        style: 'esriSFSSolid',
                        color: buildingColors['Other'],
                        outline: {
                          color: [153, 153, 153, 64],
                          width: 0.84,
                        },
                      },
                    },
                  },
                  types: [
                    {
                      id: 'epa-tods-building-layer',
                      name: 'epa-tods-building-layer',
                    },
                  ],
                },
                adds: buildingLayer.adds.map((a) => ({
                  ...a,
                  attributes: {
                    ...a.attributes,
                    GLOBALID: generateUUID(),
                  },
                })),
                updates: buildingLayer.updates.map((a) => ({
                  ...a,
                  attributes: {
                    ...a.attributes,
                    GLOBALID: generateUUID(),
                  },
                })),
                deletes: buildingLayer.deletes,
                published: buildingLayer.published,
              });
            }

            if (maskLayer) {
              layersToPublish.push({
                id: maskLayer.id,
                layerId: maskLayer.layerId,
                layerDefinitionProps: {
                  ...layerProps.defaultLayerProps,
                  fields: layerProps.defaultDeconMaskLayerFields,
                  name: 'Area of Interest',
                  description: '',
                  extent,
                  drawingInfo: {
                    renderer: {
                      type: 'simple',
                      symbol: {
                        type: 'esriSFS',
                        style: 'esriSFSSolid',
                        color: [150, 150, 150, 0.2],
                        outline: {
                          color: [50, 50, 50],
                          width: 2,
                        },
                      },
                    },
                  },
                  types: [
                    {
                      id: 'epa-tods-aoi-layer',
                      name: 'epa-tods-aoi-layer',
                    },
                  ],
                },
                adds: maskLayer.adds,
                updates: maskLayer.updates,
                deletes: maskLayer.deletes,
                published: maskLayer.published,
              });
            }

            featureServices.push({
              category: 'contains-epa-tots-aoi-characterization',
              synchronous: true,
              label: aoiLayer.label,
              description: aoiLayer.description,
              url: '',
              value: aoiLayer.portalId ?? '',
              layerId: aoiLayer.layerId,
              layers: layersToPublish,
              tables: [
                {
                  tableDefinitionProps: {
                    ...layerProps.defaultTableProps,
                    fields: layerProps.defaultAoiInfoTableFields,
                    type: 'Table',
                    name: `${aoiLayer.name}-aoi-info`,
                    description: `Area of Interest info for "${aoiLayer.name}".`,
                  },
                  data: [
                    {
                      AOI_LAYER_ID: aoiLayer.layerId,
                      AOI_VERSION: aoiLayer.version ?? 1,
                      BUILDING_COUNT: numBuildings,
                      BUILDING_AREA_TOTAL: aoiLayer.aoiSummary.totalBuildingSqM,
                      BUILDING_AREA_EXTERIOR:
                        aoiLayer.aoiSummary.totalBuildingExtSqM,
                      BUILDING_AREA_INTERIOR:
                        aoiLayer.aoiSummary.totalBuildingIntSqM,
                      BUILDING_AREA_FOOTPRINT:
                        aoiLayer.aoiSummary.totalBuildingFootprintSqM,
                      BUILDING_AREA_CEILINGS:
                        aoiLayer.aoiSummary.totalBuildingCeilingsSqM,
                      BUILDING_AREA_EXTERIOR_WALLS:
                        aoiLayer.aoiSummary.totalBuildingExtWallsSqM,
                      BUILDING_AREA_INTERIOR_WALLS:
                        aoiLayer.aoiSummary.totalBuildingIntWallsSqM,
                      BUILDING_AREA_FLOORS:
                        aoiLayer.aoiSummary.totalBuildingFloorsSqM,
                      BUILDING_AREA_ROOFS:
                        aoiLayer.aoiSummary.totalBuildingRoofSqM,
                      BUILDING_VOLUME:
                        aoiLayer.aoiSummary.totalBuildingVolumeCubM,
                      BUILDING_VOLUME_CONTENTS:
                        aoiLayer.aoiSummary.totalBuildingVolumeContentsCubM,
                      GROUND_AREA_SOIL: aoiLayer.aoiPercentages.soilSqM,
                      GROUND_PCT_SOIL: aoiLayer.aoiPercentages.soil,
                      GROUND_AREA_ASPHALT: aoiLayer.aoiPercentages.asphaltSqM,
                      GROUND_PCT_ASPHALT: aoiLayer.aoiPercentages.asphalt,
                      GROUND_AREA_CONCRETE: aoiLayer.aoiPercentages.concreteSqM,
                      GROUND_PCT_CONCRETE: aoiLayer.aoiPercentages.concrete,
                      AOI_AREA: aoiLayer.aoiSummary.totalAoiSqM,
                      NOTES: '',
                    },
                  ],
                },
              ],
              onPublishComplete: (res: any) => {
                const portalId = res.portalId;

                // make a copy of the edits context variable
                // update the edits state
                setEdits((edits) => {
                  const editsAoi = edits.edits.find(
                    (edit) => edit.layerId === aoiLayer.layerId,
                  ) as LayerAoiAnalysisEditsType;
                  editsAoi.status = 'published';
                  editsAoi.portalId = portalId;
                  editsAoi.version = editsAoi.version ?? 1;

                  setDeconSketchLayer((layer) => {
                    if (layer?.layerId === editsAoi.layerId) {
                      layer.status = 'published';
                      layer.portalId = portalId;
                      layer.version = editsAoi.version ?? 1;
                    }
                    return layer;
                  });

                  editsAoi.layers.forEach((editedLayer) => {
                    // update the ids
                    if (
                      Object.prototype.hasOwnProperty.call(
                        res.idMapping,
                        editedLayer.uuid,
                      )
                    ) {
                      editedLayer.portalId = portalId;
                      editedLayer.id = res.idMapping[editedLayer.uuid].id;
                      editsAoi.id = editedLayer.id;
                    }
                  });

                  return {
                    count: edits.count + 1,
                    edits: edits.edits,
                  };
                });
              },
            });
          });
        }

        if (includeStagingAreas && stagingAreaLayersToInclude.length > 0) {
          stagingAreaLayersToInclude.forEach((stagingAreaLayer) => {
            // get the extent
            let extent: __esri.Extent | null = null;
            const maskLayerSketch = layers.find(
              (l) => l.layerId === stagingAreaLayer.layerId,
            );
            if (maskLayerSketch?.sketchLayer?.type === 'graphics') {
              const unionGeometry = geometryEngine.union(
                maskLayerSketch.sketchLayer.graphics
                  .toArray()
                  .map((g) => g.geometry),
              );
              extent = unionGeometry.extent;
            }

            const symbol = new SimpleFillSymbol(
              defaultSymbols.symbols['Staging Area Mask'],
            );

            function addNameDescription(array: any[]) {
              return array.map((item) => {
                item.attributes.NAME = stagingAreaLayer.label;
                item.attributes.DESCRIPTION = stagingAreaLayer.description;
                return item;
              });
            }

            featureServices.push({
              category: 'contains-epa-tots-staging-area',
              label: stagingAreaLayer.label,
              description: stagingAreaLayer.description,
              url: '',
              value: stagingAreaLayer.portalId ?? '',
              layerId: stagingAreaLayer.layerId,
              layers: [
                {
                  id: stagingAreaLayer.id,
                  layerId: stagingAreaLayer.layerId,
                  layerDefinitionProps: {
                    ...layerProps.defaultLayerProps,
                    fields: layerProps.defaultAoiStagingAreaMaskLayerFields,
                    name: 'Staging Area',
                    description: '',
                    extent,
                    drawingInfo: {
                      renderer: {
                        type: 'simple',
                        symbol: symbol.toJSON(),
                      },
                    },
                    types: [
                      {
                        id: 'epa-tods-staging-area-layer',
                        name: 'epa-tods-staging-area-layer',
                      },
                    ],
                  },
                  adds: addNameDescription(stagingAreaLayer.adds),
                  updates: addNameDescription(stagingAreaLayer.updates),
                  deletes: stagingAreaLayer.deletes,
                  published: addNameDescription(stagingAreaLayer.published),
                },
              ],
              tables: [],
              onPublishComplete: (res: any) => {
                const portalId = res.portalId;

                // make a copy of the edits context variable
                // update the edits state
                setEdits((edits) => {
                  const editsAoi = edits.edits.find(
                    (edit) => edit.layerId === stagingAreaLayer.layerId,
                  ) as LayerEditsType;
                  editsAoi.status = 'published';
                  editsAoi.portalId = portalId;

                  // update the id
                  if (
                    Object.prototype.hasOwnProperty.call(
                      res.idMapping,
                      editsAoi.layerId,
                    )
                  ) {
                    editsAoi.portalId = portalId;
                    editsAoi.id = res.idMapping[editsAoi.layerId].id;
                  }

                  setLayers((layers) => {
                    const layer = layers.find(
                      (layer) => layer.layerId === stagingAreaLayer.layerId,
                    );
                    if (!layer) return layers;

                    layer.status = 'published';
                    layer.portalId = portalId;
                    layer.id = editsAoi.id;
                    return layers;
                  });

                  setStagingAreaLayer((layer) => {
                    if (!layer) return layer;
                    layer.status = 'published';
                    layer.portalId = portalId;
                    layer.id = editsAoi.id;
                    return layer;
                  });

                  return {
                    count: edits.count + 1,
                    edits: edits.edits,
                  };
                });
              },
            });
          });
        }

        if (errorMessages.length > 0) {
          setPublishResponse({
            status: 'fetch-failure',
            summary: { success: '', failed: '' },
            error: { error: null, message: errorMessages.join('\n') },
            rawData: null,
          });
          return;
        }

        console.log('featureServices: ', featureServices);

        // run the publish
        setPublishResponse({
          status: 'fetching',
          summary: { success: '', failed: '' },
          rawData: null,
        });

        const responses: any = await publish({
          portal,
          map,
          featureServices,
          layerProps,
        });
        console.log('responses: ', responses);

        // get totals
        const totals = {
          added: 0,
          updated: 0,
          deleted: 0,
          failed: 0,
        };

        responses.forEach((res: any) => {
          res.edits.forEach((layerRes: any) => {
            if (layerRes.id !== 0) return;

            // need to loop through each array and check the success flag
            if (layerRes.addResults) {
              layerRes.addResults.forEach((item: any) => {
                if (item.success) totals.added += 1;
                else totals.failed += 1;
              });
            }
            if (layerRes.updateResults) {
              layerRes.updateResults.forEach((item: any) => {
                if (item.success) totals.updated += 1;
                else totals.failed += 1;
              });
            }
            if (layerRes.deleteResults) {
              layerRes.deleteResults.forEach((item: any) => {
                if (item.success) totals.deleted += 1;
                else totals.failed += 1;
              });
            }
          });
        });

        // create the message string for each type of change (add, update and delete)
        const successParts = [];
        if (totals.added) {
          successParts.push(`${totals.added} item(s) added`);
        }
        if (totals.updated) {
          successParts.push(`${totals.updated} item(s) updated`);
        }
        if (totals.deleted) {
          successParts.push(`${totals.deleted} item(s) deleted`);
        }

        // combine the messages
        let success = '';
        if (successParts.length === 1) {
          success = successParts[0];
        }
        if (successParts.length > 1) success = sentenceJoin(successParts);

        // create the failed status message
        const failed = totals.failed
          ? `${totals.failed} item(s) failed to publish. Check the console log for details.`
          : '';
        if (failed) console.error('Some items failed to publish: ', responses);

        setPublishResponse({
          status: 'success',
          summary: { success, failed },
          rawData: responses,
        });
      } catch (err) {
        console.error(err);
        setPublishResponse({
          status: 'fetch-failure',
          summary: { success: '', failed: '' },
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          rawData: err,
        });
        window.logErrorToGa(err);
      }
    }

    publishItemsInner();
  }, [
    calculateResults,
    calculateResultsDecon,
    configOutput,
    contaminationMap,
    defaultSymbols,
    edits,
    layerProps,
    layers,
    map,
    portal,
    publishSamplesMode,
    publishSampleTableMetaData,
    sampleAttributes,
    sampleTypeSelections,
    selectedScenario,
    selectedService,
    setDeconSketchLayer,
    setEdits,
    setLayers,
    setSampleTableDescription,
    setSampleTableName,
    setSelectedScenario,
    setSelectedService,
    setStagingAreaLayer,
    setUserDefinedAttributes,
    trainingMode,
    userDefinedAttributes,
  ]);

  // Run the publish
  useEffect(() => {
    const { includeCustomSampleTypes, includePlan } = configOutput;

    if (!oAuthInfo || !portal || !signedIn) return;
    if (!publishButtonClicked || !hasNameBeenChecked) return;
    if (includePlan && (!layers || layers.length === 0 || !selectedScenario)) {
      return;
    }

    if (
      includeCustomSampleTypes &&
      (Object.keys(sampleTypeSelections).length === 0 ||
        !publishSampleTableMetaData ||
        (publishSamplesMode === 'existing' && !selectedService))
    ) {
      return;
    }
    setPublishButtonClicked(false);

    publishItems();
  }, [
    configOutput,
    hasNameBeenChecked,
    layers,
    layerProps,
    oAuthInfo,
    portal,
    publishButtonClicked,
    publishItems,
    publishSampleTableMetaData,
    publishSamplesMode,
    sampleTypeSelections,
    selectedScenario,
    selectedService,
    signedIn,
  ]);

  ///////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////// END - Publish Sample Types ///////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////

  // count the number of samples of the selected sampling plan
  let sampleCount = 0;
  if (selectedScenario?.scenarioName) {
    layers.forEach((layer) => {
      if (layer.layerType !== 'Samples' && layer.layerType !== 'VSP') return;
      if (!layer.sketchLayer || layer.sketchLayer.type === 'feature') return;
      if (layer.parentLayer?.title !== selectedScenario.scenarioName) return;

      sampleCount += layer.sketchLayer.graphics.length;
    });
  }

  const [aoiCharNameCheck, setAoiCharNameCheck] = useState<SaveResultsType>({
    status: 'none',
  });
  const [publishNameCheck, setPublishNameCheck] = useState<SaveResultsType>({
    status: 'none',
  });
  const [sampleTypesNameCheck, setSampleTypesNameCheck] =
    useState<SaveResultsType>({ status: 'none' });
  const [stagingAreaNameCheck, setStagingAreaNameCheck] =
    useState<SaveResultsType>({
      status: 'none',
    });

  const isPublishPlanReady =
    !includePlan ||
    // verify the service name is available
    ((!badStatuses.includes(planNameCheckStatus) ||
      (badStatuses.includes(planNameCheckStatus) &&
        publishNameCheck.status === 'success')) &&
      ((appType === 'sampling' && sampleCount !== 0) ||
        (appType === 'decon' &&
          calculateResultsDecon.status === 'success' &&
          calculateResultsDecon.data)) && // verify there are samples to publish
      // verify service name availbility if changed
      (publishNameCheck.status === 'none' ||
        publishNameCheck.status === 'success'));

  const isPublishSamplesReady =
    !includeCustomSampleTypes ||
    // verify the service name is available
    ((!badStatuses.includes(customSampleNameCheckStatus) ||
      (badStatuses.includes(customSampleNameCheckStatus) &&
        sampleTypesNameCheck.status === 'success')) &&
      // verify at least on custom sample type is selected and a service is selected
      sampleTypeSelections.length > 0 &&
      ((publishSamplesMode === 'new' && sampleTableName) ||
        (publishSamplesMode === 'existing' && selectedService !== null)) &&
      // verify service name availbility if changed
      (sampleTypesNameCheck.status === 'none' ||
        sampleTypesNameCheck.status === 'success'));

  const isPublishAoiCharReady =
    !includeAoiCharacterization ||
    ((!badStatuses.includes(aoiCharNameCheckStatus) ||
      (badStatuses.includes(aoiCharNameCheckStatus) &&
        aoiCharNameCheck.status === 'success' &&
        aoiLayersNotAvailable.length === 0)) &&
      (selectedAoiCharacterizations.length > 0 ||
        (calculateResultsDecon.status === 'success' &&
          calculateResultsDecon.data)));

  const isPublishStagingAreaReady =
    !includeStagingAreas ||
    ((!badStatuses.includes(stagingAreaNameCheckStatus) ||
      (badStatuses.includes(stagingAreaNameCheckStatus) &&
        stagingAreaNameCheck.status === 'success' &&
        stagingAreaLayersNotAvailable.length === 0)) &&
      selectedStagingAreas.length > 0);

  let appName = '';
  if (appType === 'sampling') appName = 'TOTS';
  if (appType === 'decon') appName = 'TODS';

  return (
    <div css={panelContainer}>
      <h2>Publish Output</h2>
      <div css={sectionContainer}>
        <p>
          Publish the configured {appName} output to your ArcGIS Online account.
          A summary of the selections made on the Configure Output step is
          below. By default, only you and the ArcGIS Online administrator can
          access content created. Provide other collaborators access to{' '}
          {appName} content by{' '}
          <a
            href="https://doc.arcgis.com/en/arcgis-online/share-maps/share-items.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            sharing
          </a>{' '}
          <a
            className="exit-disclaimer"
            href="https://www.epa.gov/home/exit-epa"
            target="_blank"
            rel="noopener noreferrer"
          >
            EXIT
          </a>{' '}
          the content to everyone (the public), your organization, or members of
          specific groups. You can edit{' '}
          <a
            href="https://doc.arcgis.com/en/arcgis-online/manage-data/item-details.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            item details
          </a>{' '}
          and change{' '}
          <a
            href="https://doc.arcgis.com/en/arcgis-online/manage-data/manage-hosted-feature-layers.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            feature layer settings
          </a>
          .{' '}
          <a
            className="exit-disclaimer"
            href="https://www.epa.gov/home/exit-epa"
            target="_blank"
            rel="noopener noreferrer"
          >
            EXIT
          </a>
        </p>
        {badStatuses.includes(planNameCheckStatus) ? (
          <EditScenario
            appType={appType}
            initialScenario={selectedScenario}
            initialStatus={planNameCheckStatus}
            onSave={(saveResults) => {
              if (!saveResults) return;

              setPublishNameCheck(saveResults);
            }}
          />
        ) : (
          <Fragment>
            <p css={layerInfo}>
              <strong>Plan Name: </strong>
              {selectedScenario?.scenarioName}
            </p>
            <p css={layerInfo}>
              <strong>Plan Description: </strong>
              <ShowLessMore
                text={selectedScenario?.scenarioDescription}
                charLimit={20}
              />
            </p>
          </Fragment>
        )}
      </div>

      <div>
        <h3>Publish Summary</h3>
        <div css={totsOutputContainer}>
          <strong>
            {includePlan ? (
              <i className="fas fa-check" css={checkedStyles}></i>
            ) : (
              <i className="fas fa-times" css={unCheckedStyles}></i>
            )}
            Include Tailored {appName} Output Files:
          </strong>
          {includePlan && (
            <div>
              {appType === 'sampling' && (
                <div>
                  <strong css={webMapContainerCheckboxStyles}>
                    {includePlanWebMap ? (
                      <i className="fas fa-check" css={checkedStyles}></i>
                    ) : (
                      <i className="fas fa-times" css={unCheckedStyles}></i>
                    )}
                    Include Web Map:
                  </strong>
                </div>
              )}
              {webMapReferenceLayerSelections.length > 0 && (
                <div css={webMapContainerCheckboxStyles}>
                  Reference layers to include:
                  <ul>
                    {webMapReferenceLayerSelections
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((l, index) => (
                        <li key={index}>{l.label}</li>
                      ))}
                  </ul>
                </div>
              )}

              {appType === 'sampling' && (
                <Fragment>
                  <div>
                    <strong css={webMapContainerCheckboxStyles}>
                      {includePlanWebScene ? (
                        <i className="fas fa-check" css={checkedStyles}></i>
                      ) : (
                        <i className="fas fa-times" css={unCheckedStyles}></i>
                      )}
                      Include Web Scene:
                    </strong>
                  </div>
                  {webSceneReferenceLayerSelections.length > 0 && (
                    <div css={webMapContainerCheckboxStyles}>
                      Reference layers to include:
                      <ul>
                        {webSceneReferenceLayerSelections
                          .sort((a, b) => a.label.localeCompare(b.label))
                          .map((l, index) => (
                            <li key={index}>{l.label}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </Fragment>
              )}
            </div>
          )}
        </div>

        {includeCustomSampleTypes && appType === 'sampling' && (
          <div>
            <strong>Include Custom Sample Types:</strong>
            <ul>
              {sampleTypeSelections.map((item, index) => {
                return <li key={index}>{item.label}</li>;
              })}
            </ul>
            <p>
              <strong>Publish Custom Sample Types to:</strong>
              <br />
              {selectedService ? (
                <Fragment>
                  <strong>Feature Service Name: </strong>
                  {selectedService.label}
                  <br />
                  <strong>Feature Service Description: </strong>
                  {selectedService.description}
                </Fragment>
              ) : (
                <Fragment>
                  <strong>Feature Service Name: </strong>
                  {sampleTableName}
                  <br />
                  <strong>Feature Service Description: </strong>
                  {sampleTableDescription}
                </Fragment>
              )}
            </p>
          </div>
        )}

        {includeAoiCharacterization && (
          <div>
            <strong>
              <i className="fas fa-check" css={checkedStyles}></i>
              Include AOI Characterization Output Files:
            </strong>
            <ul>
              {selectedAoiCharacterizations.map((item, index) => {
                return <li key={index}>{item.label}</li>;
              })}
            </ul>
          </div>
        )}

        {includeStagingAreas && (
          <div>
            <strong>
              <i className="fas fa-check" css={checkedStyles}></i>
              Include Staging Area Output Files:
            </strong>
            <ul>
              {selectedStagingAreas.map((item, index) => {
                return <li key={index}>{item.label}</li>;
              })}
            </ul>
          </div>
        )}
      </div>

      {publishResponse.status === 'fetching' && <LoadingSpinner />}
      {publishResponse.status === 'fetch-failure' &&
        webServiceErrorMessage(publishResponse.error)}
      {publishResponse.status === 'success' &&
        publishResponse.summary.failed && (
          <MessageBox
            severity="error"
            title="Some item(s) failed to publish"
            message={publishResponse.summary.failed}
          />
        )}
      {publishResponse.status === 'success' &&
        publishSuccessMessage(appName, publishResponse.rawData)}

      {!signedIn && notLoggedInMessage}
      {includePlan &&
        appType === 'sampling' &&
        sampleCount === 0 &&
        noSamplesPublishMessage}
      {includePlan &&
        appType === 'decon' &&
        (calculateResultsDecon.status !== 'success' ||
          !calculateResultsDecon.data) &&
        noDeconPublishMessage}
      {includeCustomSampleTypes && (
        <Fragment>
          {sampleTypeSelections.length === 0 && noSampleTypesPublishMessage}
          {publishSamplesMode === 'new' &&
            publishResponse.status === 'none' &&
            !sampleTableName &&
            noServiceNameMessage}
          {publishSamplesMode === 'existing' &&
            publishResponse.status === 'none' &&
            !selectedService &&
            noServiceSelectedMessage}
        </Fragment>
      )}

      {badStatuses.includes(customSampleNameCheckStatus) &&
        publishSamplesMode === 'new' && (
          <EditCustomSampleTypesTable
            appType={appType}
            initialStatus={customSampleNameCheckStatus}
            onSave={(saveResults) => {
              if (!saveResults) return;

              setCustomSampleNameCheckStatus('available');
              setSampleTypesNameCheck(saveResults);
            }}
          />
        )}
      {badStatuses.includes(aoiCharNameCheckStatus) &&
        aoiLayersNotAvailable.map((item) => {
          const layer = item.layer;
          return (
            <div key={layer.value}>
              <EditAoiCharacterization
                aoiLayer={layer}
                initialStatus={item.status}
                onSave={(saveResults) => {
                  if (!saveResults) return;

                  if (saveResults.status === 'success') {
                    setAoiLayersNotAvailable((aoiLayersNotAvailable) => {
                      const newAoiLayersNotAvailable =
                        aoiLayersNotAvailable.filter(
                          (l) => l.layer.value !== layer.value,
                        );
                      if (newAoiLayersNotAvailable.length === 0)
                        setAoiCharNameCheckStatus('available');
                      return newAoiLayersNotAvailable;
                    });
                  }
                  setAoiCharNameCheck(saveResults);
                }}
              />
            </div>
          );
        })}
      {badStatuses.includes(stagingAreaNameCheckStatus) &&
        stagingAreaLayersNotAvailable.map((item) => {
          const layer = item.layer;
          return (
            <div key={layer.layerId}>
              <EditStagingAreaCharacterization
                aoiLayer={layer}
                initialStatus={item.status}
                onSave={(saveResults) => {
                  if (!saveResults) return;

                  if (saveResults.status === 'success') {
                    setStagingAreaLayersNotAvailable(
                      (stagingAreaLayersNotAvailable) => {
                        const newStagingAreaLayersNotAvailable =
                          stagingAreaLayersNotAvailable.filter(
                            (l) => l.layer.layerId !== layer.layerId,
                          );
                        if (newStagingAreaLayersNotAvailable.length === 0)
                          setStagingAreaNameCheckStatus('available');
                        return newStagingAreaLayersNotAvailable;
                      },
                    );
                  }
                  setStagingAreaNameCheck(saveResults);
                }}
              />
            </div>
          );
        })}

      {(includePlan ||
        includeCustomSampleTypes ||
        includeAoiCharacterization ||
        includeStagingAreas) &&
        isPublishPlanReady &&
        isPublishSamplesReady &&
        isPublishAoiCharReady &&
        isPublishStagingAreaReady && (
          <div css={publishButtonContainerStyles}>
            <button
              disabled={publishResponse.status === 'fetching'}
              css={publishButtonStyles}
              onClick={() => setPublishButtonClicked(true)}
            >
              Publish
            </button>
          </div>
        )}
    </div>
  );
}

export default Publish;
