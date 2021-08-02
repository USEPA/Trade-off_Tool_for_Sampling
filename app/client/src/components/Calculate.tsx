/** @jsxImportSource @emotion/react */

import React from 'react';
import { css } from '@emotion/react';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import LoadingSpinner from 'components/LoadingSpinner';
import Select from 'components/Select';
import ShowLessMore from 'components/ShowLessMore';
import NavigationButton from 'components/NavigationButton';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { CalculateContext } from 'contexts/Calculate';
import { useServicesContext } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
import { ErrorType } from 'types/Misc';
// config
import {
  contaminationHitsSuccessMessage,
  featureNotAvailableMessage,
  noContaminationGraphicsMessage,
  noContaminationMapMessage,
  noSampleLayerMessage,
  noSamplesMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
// utils
import { appendEnvironmentObjectParam } from 'utils/arcGisRestUtils';
import { CalculateResultsType } from 'types/CalculateResults';
import { geoprocessorFetch } from 'utils/fetchUtils';
import { useDynamicPopup } from 'utils/hooks';
import { updateLayerEdits } from 'utils/sketchUtils';
import { chunkArray, createErrorObject } from 'utils/utils';
// styles
import { reactSelectStyles } from 'styles';

type ContaminationResultsType = {
  status:
    | 'none'
    | 'no-layer'
    | 'no-map'
    | 'no-contamination-graphics'
    | 'no-graphics'
    | 'fetching'
    | 'success'
    | 'failure';
  error?: ErrorType;
  data: any[] | null;
};

// Gets all of the graphics of a group layer associated with the provided layerId
function getGraphics(map: __esri.Map, layerId: string) {
  const graphics: __esri.Graphic[] = [];
  let groupLayer: __esri.GroupLayer | null = null;

  // find the group layer
  const tempGroupLayer = map.layers.find((layer) => layer.id === layerId);

  // get the graphics
  if (tempGroupLayer) {
    groupLayer = tempGroupLayer as __esri.GroupLayer;
    groupLayer.layers.forEach((layer) => {
      if (layer.type !== 'graphics' || layer.id.includes('-points')) return;

      const graphicsLayer = layer as __esri.GraphicsLayer;
      graphics.push(...graphicsLayer.graphics.toArray());
    });
  }

  return { groupLayer, graphics };
}

// --- styles (Calculate) ---
const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const submitButtonContainerStyles = css`
  margin-top: 10px;
`;

const submitButtonStyles = css`
  margin: 10px 0;
  width: 100%;
`;

const panelContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  padding: 20px 0;
`;

const sectionContainer = css`
  margin-bottom: 10px;
  padding: 0 20px;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

const inlineMenuStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const addButtonStyles = css`
  margin: 0;
  height: 38px; /* same height as ReactSelect */
`;

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

// --- components (Calculate) ---
function Calculate() {
  const { FeatureSet, Geoprocessor, PopupTemplate } = useEsriModulesContext();
  const { setGoTo, setGoToOptions, trainingMode } = React.useContext(
    NavigationContext,
  );
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    map,
    sketchLayer,
    selectedScenario,
    getGpMaxRecordCount,
  } = React.useContext(SketchContext);
  const {
    contaminationMap,
    setContaminationMap,
    calculateResults,
    setCalculateResults,
    numLabs,
    numLabHours,
    numSamplingHours,
    numSamplingPersonnel,
    numSamplingShifts,
    numSamplingTeams,
    samplingLaborCost,
    surfaceArea,
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
    setUpdateContextValues,
  } = React.useContext(CalculateContext);

  const getPopupTemplate = useDynamicPopup();
  const services = useServicesContext();

  // callback for closing the results panel when leaving this tab
  const closePanel = React.useCallback(() => {
    setCalculateResults((calculateResults: CalculateResultsType) => {
      return {
        ...calculateResults,
        panelOpen: false,
      };
    });
  }, [setCalculateResults]);

  // Cleanup useEffect for closing the results panel when leaving
  // this tab
  React.useEffect(() => {
    return function cleanup() {
      closePanel();
    };
  }, [closePanel]);

  // Initialize the contamination map to the first available one
  const [contamMapInitialized, setContamMapInitialized] = React.useState(false);
  React.useEffect(() => {
    if (contamMapInitialized) return;

    setContamMapInitialized(true);

    // exit early since there is no need to set the contamination map
    if (contaminationMap) return;

    // set the contamination map to the first available one
    const newContamMap = layers.find(
      (layer) => layer.layerType === 'Contamination Map',
    );
    if (!newContamMap) return;
    setContaminationMap(newContamMap);
  }, [contaminationMap, setContaminationMap, contamMapInitialized, layers]);

  // updates context to run the calculations
  function runCalculation() {
    if (!map) return;

    // set no scenario status
    if (!selectedScenario) {
      setCalculateResults({
        status: 'no-scenario',
        panelOpen: true,
        data: null,
      });
      return;
    }

    // set the no layer status
    if (selectedScenario.layers.length === 0) {
      setCalculateResults({ status: 'no-layer', panelOpen: true, data: null });
      return;
    }

    const { graphics } = getGraphics(map, selectedScenario.layerId);

    // set the no graphics status
    if (graphics.length === 0) {
      setCalculateResults({
        status: 'no-graphics',
        panelOpen: true,
        data: null,
      });
      return;
    }

    // if the inputs are the same as context
    // fake a loading spinner and open the panel
    if (
      calculateResults.status === 'success' &&
      numLabs === inputNumLabs &&
      numLabHours === inputNumLabHours &&
      numSamplingHours === inputNumSamplingHours &&
      numSamplingShifts === inputNumSamplingShifts &&
      numSamplingPersonnel === inputNumSamplingPersonnel &&
      numSamplingTeams === inputNumSamplingTeams &&
      samplingLaborCost === inputSamplingLaborCost &&
      surfaceArea === inputSurfaceArea
    ) {
      // display the loading spinner for 1 second
      setCalculateResults({
        status: 'fetching',
        panelOpen: true,
        data: calculateResults.data,
      });
      setTimeout(() => {
        setCalculateResults({
          status: 'success',
          panelOpen: true,
          data: calculateResults.data,
        });
      }, 1000);
      return;
    }

    // open the panel and update context to run calculations
    setCalculateResults({ status: 'fetching', panelOpen: true, data: null });
    setUpdateContextValues(true);
  }

  const [
    contaminationResults,
    setContaminationResults, //
  ] = React.useState<ContaminationResultsType>({ status: 'none', data: null });

  // Call the GP Server to run calculations against the contamination
  // map.
  function runContaminationCalculation() {
    if (!getGpMaxRecordCount) return;
    if (!map || !sketchLayer?.sketchLayer) return;

    // set no scenario status
    if (!selectedScenario) {
      setCalculateResults({
        status: 'no-scenario',
        panelOpen: true,
        data: null,
      });
      return;
    }

    // set the no layer status
    if (selectedScenario.layers.length === 0) {
      setCalculateResults({ status: 'no-layer', panelOpen: true, data: null });
      return;
    }

    // set the no contamination map status
    if (!contaminationMap) {
      setContaminationResults({ status: 'no-map', data: null });
      return;
    }

    let contamMapSet: __esri.FeatureSet | null = null;
    let graphics: __esri.GraphicProperties[] = [];
    if (contaminationMap?.sketchLayer?.type === 'graphics') {
      graphics = contaminationMap.sketchLayer.graphics.toArray();
    }
    if (graphics.length === 0) {
      // display the no graphics on contamination map warning
      setContaminationResults({
        status: 'no-contamination-graphics',
        data: null,
      });
      return;
    }

    // create a feature set for communicating with the GPServer
    // this one is for the contamination map input
    contamMapSet = new FeatureSet({
      displayFieldName: '',
      geometryType: 'polygon',
      features: graphics,
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
          name: 'GLOBALID',
          type: 'guid',
          alias: 'GlobalID',
        },
        {
          name: 'PERMANENT_IDENTIFIER',
          type: 'guid',
          alias: 'Permanent Identifier',
        },
        {
          name: 'CONTAMTYPE',
          type: 'string',
          alias: 'Contamination Type',
        },
        {
          name: 'CONTAMVAL',
          type: 'double',
          alias: 'Contamination Value',
        },
        {
          name: 'CONTAMUNIT',
          type: 'string',
          alias: 'Contamination Unit',
        },
        {
          name: 'Notes',
          type: 'string',
          alias: 'Notes',
        },
      ],
    });

    const { groupLayer, graphics: sketchedGraphics } = getGraphics(
      map,
      selectedScenario.layerId,
    );
    if (sketchedGraphics.length === 0 || !groupLayer) {
      // display the no-graphics warning
      setContaminationResults({
        status: 'no-graphics',
        data: null,
      });
      return;
    }

    // display the loading spinner
    setContaminationResults({
      status: 'fetching',
      data: null,
    });

    getGpMaxRecordCount()
      .then((maxRecordCount) => {
        const chunkedFeatures: __esri.Graphic[][] = chunkArray(
          sketchedGraphics,
          maxRecordCount,
        );

        // fire off the contamination results requests
        const requests: Promise<any>[] = [];
        chunkedFeatures.forEach((features) => {
          // create a feature set for communicating with the GPServer
          // this one is for the samples input
          const featureSet = new FeatureSet({
            displayFieldName: '',
            geometryType: 'polygon',
            features,
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
                name: 'GLOBALID',
                type: 'guid',
                alias: 'GlobalID',
              },
              {
                name: 'PERMANENT_IDENTIFIER',
                type: 'guid',
                alias: 'Permanent Identifier',
              },
              {
                name: 'TYPEUUID',
                type: 'string',
                alias: 'Sampling Method Type ID',
              },
              {
                name: 'TYPE',
                type: 'string',
                alias: 'Sampling Method Type',
              },
              {
                name: 'TTPK',
                type: 'double',
                alias: 'Time to Prepare Kits',
              },
              {
                name: 'TTC',
                type: 'double',
                alias: 'Time to Collect',
              },
              {
                name: 'TTA',
                type: 'double',
                alias: 'Time to Analyze',
              },
              {
                name: 'TTPS',
                type: 'double',
                alias: 'Total Time per Sample',
              },
              {
                name: 'LOD_P',
                type: 'double',
                alias: 'Limit of Detection Porous',
              },
              {
                name: 'LOD_NON',
                type: 'double',
                alias: 'Limit of Detection Nonporous',
              },
              {
                name: 'MCPS',
                type: 'double',
                alias: 'Sampling Material Cost per Sample',
              },
              {
                name: 'TCPS',
                type: 'double',
                alias: 'Total Cost Per Sample',
              },
              {
                name: 'WVPS',
                type: 'double',
                alias: 'Waste Volume per Sample',
              },
              {
                name: 'WWPS',
                type: 'double',
                alias: 'Waste Weight per Sample',
              },
              {
                name: 'SA',
                type: 'double',
                alias: 'Sampling Surface Area',
              },
              {
                name: 'Notes',
                type: 'string',
                alias: 'Notes',
              },
              {
                name: 'ALC',
                type: 'double',
                alias: 'Analysis Labor Cost',
              },
              {
                name: 'AMC',
                type: 'double',
                alias: 'Analysis Material Cost',
              },
              {
                name: 'CONTAMTYPE',
                type: 'string',
                alias: 'Contamination Type',
              },
              {
                name: 'CONTAMVAL',
                type: 'double',
                alias: 'Contamination Value',
              },
              {
                name: 'CONTAMUNIT',
                type: 'string',
                alias: 'Contamination Unit',
              },
            ],
          });

          // call the GP Server
          const params = {
            f: 'json',
            Input_Sampling_Unit: featureSet,
            Contamination_Map: contamMapSet,
          };
          appendEnvironmentObjectParam(params);

          const request = geoprocessorFetch({
            Geoprocessor,
            url: `${services.data.totsGPServer}/Contamination Results`,
            inputParameters: params,
          });
          requests.push(request);
        });

        Promise.all(requests)
          .then((responses: any) => {
            // perform calculations to update talley in nav bar
            setUpdateContextValues(true);

            const resFeatures: any[] = [];
            for (let i = 0; i < responses.length; i++) {
              const res = responses[i];

              // catch an error in the response of the successful fetch
              if (res.error) {
                console.error(res.error);
                setContaminationResults({
                  status: 'failure',
                  error: {
                    error: createErrorObject(res),
                    message: res.error.message,
                  },
                  data: null,
                });
                return;
              }

              if (res?.results?.[0]?.value?.features) {
                resFeatures.push(...res.results[0].value.features);
              }
            }

            // make the contamination map visible in the legend
            contaminationMap.listMode = 'show';
            contaminationMap.sketchLayer.listMode = 'show';
            setContaminationMap((layer) => {
              return {
                ...layer,
                listMode: 'show',
              } as LayerType;
            });

            // find the layer being edited
            const index = layers.findIndex(
              (layer) => layer.layerId === contaminationMap.layerId,
            );

            // update the layers context
            if (index > -1) {
              setLayers((layers) => {
                return [
                  ...layers.slice(0, index),
                  {
                    ...contaminationMap,
                    listMode: 'show',
                  },
                  ...layers.slice(index + 1),
                ];
              });
            }

            // make a copy of the edits context variable
            let editsCopy = updateLayerEdits({
              edits,
              layer: contaminationMap,
              type: 'properties',
            });

            // save the data to state, use an empty array if there is no data
            if (resFeatures.length > 0) {
              const popupTemplate = new PopupTemplate(
                getPopupTemplate(sketchLayer.layerType, true),
              );

              // loop through the layers and update the contam values
              groupLayer.layers.forEach((graphicsLayer) => {
                if (graphicsLayer.type !== 'graphics') return;

                const tempLayer = graphicsLayer as __esri.GraphicsLayer;
                // update the contam value attribute of the graphics
                tempLayer.graphics.forEach((graphic) => {
                  const resFeature = resFeatures.find(
                    (feature: any) =>
                      graphic.attributes.PERMANENT_IDENTIFIER ===
                      feature.attributes.PERMANENT_IDENTIFIER,
                  );

                  // if the graphic was not found in the response, set contam value to null,
                  // otherwise use the contam value value found in the response.
                  let contamValue = null;
                  let contamType = graphic.attributes.CONTAMTYPE;
                  let contamUnit = graphic.attributes.CONTAMUNIT;
                  if (resFeature) {
                    contamValue = resFeature.attributes.CONTAMVAL;
                    contamType = resFeature.attributes.CONTAMTYPE;
                    contamUnit = resFeature.attributes.CONTAMUNIT;
                  }
                  graphic.attributes.CONTAMVAL = contamValue;
                  graphic.attributes.CONTAMTYPE = contamType;
                  graphic.attributes.CONTAMUNIT = contamUnit;
                  graphic.popupTemplate = popupTemplate;
                });

                // find the layer
                const layer = layers.find(
                  (layer) => layer.layerId === graphicsLayer.id,
                );
                if (!layer) return;

                // update the graphics of the sketch layer
                editsCopy = updateLayerEdits({
                  edits: editsCopy,
                  layer: layer,
                  type: 'update',
                  changes: tempLayer.graphics,
                  hasContaminationRan: true,
                });
              });

              setContaminationResults({
                status: 'success',
                data: resFeatures,
              });
            } else {
              setContaminationResults({
                status: 'success',
                data: [],
              });
            }

            setEdits(editsCopy);
          })
          .catch((err) => {
            console.error(err);

            // perform calculations to update talley in nav bar
            setUpdateContextValues(true);

            setContaminationResults({
              status: 'failure',
              error: {
                error: createErrorObject(err),
                message: err.message,
              },
              data: null,
            });

            window.logErrorToGa(err);
          });
      })
      .catch((err) => {
        console.error(err);

        // perform calculations to update talley in nav bar
        setUpdateContextValues(true);

        setContaminationResults({
          status: 'failure',
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          data: null,
        });

        window.logErrorToGa(err);
      });
  }

  // Run calculations when the user exits this tab, by updating
  // the context values.
  React.useEffect(() => {
    return function cleanup() {
      setUpdateContextValues(true);
    };
  }, [setUpdateContextValues]);

  return (
    <div css={panelContainer}>
      <div>
        <div css={sectionContainer}>
          <h2>Calculate Resources</h2>
          <p>
            Default resource constraints are provided to estimate the cost and
            time required to implement the designed plan. You can change the
            default parameters to reflect scenario-specific constraints and to
            support conducting "what-if" scenarios. Click{' '}
            <strong>View Detailed Results</strong> to display a detailed summary
            of the results.{' '}
            {trainingMode && (
              <React.Fragment>
                If you have a contamination map layer, click{' '}
                <strong>View Contamination Hits</strong> to see if any of your
                samples would have resulted in contamination hits.{' '}
              </React.Fragment>
            )}
            Click <strong>Next</strong> to configure your output.
          </p>
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
        </div>

        <div css={sectionContainer}>
          <label htmlFor="number-teams-input">
            Number of Available Teams for Sampling
          </label>
          <input
            id="number-teams-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumSamplingTeams}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumSamplingTeams(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="personnel-per-team-input">
            Personnel per Sampling Team
          </label>
          <input
            id="personnel-per-team-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumSamplingPersonnel}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumSamplingPersonnel(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="sampling-hours-input">
            Sampling Team Hours per Shift
          </label>
          <input
            id="sampling-hours-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumSamplingHours}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumSamplingHours(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="shifts-per-input">Sampling Team Shifts per Day</label>
          <input
            id="shifts-per-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumSamplingShifts}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumSamplingShifts(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="labor-cost-input">Sampling Team Labor Cost ($)</label>
          <input
            id="labor-cost-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputSamplingLaborCost}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputSamplingLaborCost(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="number-of-labs-input">
            Number of Available Labs for Analysis
          </label>
          <input
            id="number-of-labs-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumLabs}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumLabs(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="lab-hours-input">Analysis Lab Hours per Day</label>
          <input
            id="lab-hours-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumLabHours}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumLabHours(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="surface-area-input">
            Surface Area (ft<sup>2</sup>) (optional)
          </label>
          <input
            id="surface-area-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputSurfaceArea}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputSurfaceArea(Number(ev.target.value));
              }
            }}
          />
        </div>

        <div css={sectionContainer}>
          <div css={submitButtonContainerStyles}>
            <button css={submitButtonStyles} onClick={runCalculation}>
              View Detailed Results
            </button>
          </div>
        </div>

        {trainingMode && (
          <React.Fragment>
            <div css={sectionContainer}>
              <p>
                <strong>TRAINING MODE</strong>: If you have a contamination
                layer, you can add here and check if your sampling plan captured
                the contamination zone.
              </p>
            </div>
            <AccordionList>
              <AccordionItem title={'Include Contamination Map (Optional)'}>
                <div css={sectionContainer}>
                  {services.status === 'fetching' && <LoadingSpinner />}
                  {services.status === 'failure' &&
                    featureNotAvailableMessage('Include Contamination Map')}
                  {services.status === 'success' && (
                    <React.Fragment>
                      <label htmlFor="contamination-map-select-input">
                        Contamination map
                      </label>
                      <div css={inlineMenuStyles}>
                        <Select
                          id="contamination-map-select"
                          inputId="contamination-map-select-input"
                          css={fullWidthSelectStyles}
                          styles={reactSelectStyles as any}
                          value={contaminationMap}
                          onChange={(ev) =>
                            setContaminationMap(ev as LayerType)
                          }
                          options={layers.filter(
                            (layer: any) =>
                              layer.layerType === 'Contamination Map',
                          )}
                        />
                        <button
                          css={addButtonStyles}
                          onClick={(ev) => {
                            setGoTo('addData');
                            setGoToOptions({
                              from: 'file',
                              layerType: 'Contamination Map',
                            });
                          }}
                        >
                          Add
                        </button>
                      </div>

                      {contaminationResults.status === 'fetching' && (
                        <LoadingSpinner />
                      )}
                      {contaminationResults.status === 'failure' &&
                        webServiceErrorMessage(contaminationResults.error)}
                      {contaminationResults.status === 'no-map' &&
                        noContaminationMapMessage}
                      {contaminationResults.status === 'no-layer' &&
                        noSampleLayerMessage}
                      {contaminationResults.status === 'no-graphics' &&
                        noSamplesMessage}
                      {contaminationResults.status ===
                        'no-contamination-graphics' &&
                        noContaminationGraphicsMessage}
                      {contaminationResults.status === 'success' &&
                        contaminationResults?.data &&
                        contaminationResults.data.length > -1 &&
                        contaminationHitsSuccessMessage(
                          contaminationResults.data.length,
                        )}

                      <button
                        css={submitButtonStyles}
                        onClick={runContaminationCalculation}
                      >
                        View Contamination Hits
                      </button>
                    </React.Fragment>
                  )}
                </div>
              </AccordionItem>
            </AccordionList>
          </React.Fragment>
        )}
      </div>
      <div css={sectionContainer}>
        <NavigationButton goToPanel="configureOutput" />
      </div>
    </div>
  );
}

export default Calculate;
