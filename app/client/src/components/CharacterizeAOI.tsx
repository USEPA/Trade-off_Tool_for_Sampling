/** @jsxImportSource @emotion/react */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import { SaveResultsType } from 'components/EditLayerMetaData';
import InfoIcon from 'components/InfoIcon';
import MessageBox from 'components/MessageBox';
import Select from 'components/Select';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { CalculateContext } from 'contexts/Calculate';
import { DialogContext } from 'contexts/Dialog';
import { useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { PlanGraphics, SketchContext } from 'contexts/Sketch';
// utils
import { isServiceNameAvailable } from 'utils/arcGisRestUtils';
import { fetchBuildingData, processScenario } from 'utils/hooks';
import {
  activateSketchButton,
  calculateArea,
  createScenarioDeconLayer,
  generateUUID,
  getDefaultSamplingMaskLayer,
  getScenariosDecon,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { convertBase64ToFile, createErrorObject } from 'utils/utils';
// types
import {
  ScenarioDeconEditsType,
  LayerEditsType,
  EditsType,
  LayerAoiAnalysisEditsType,
  LayerDeconEditsType,
} from 'types/Edits';
import { LayerType } from 'types/Layer';
// styles
import { infoIconStyles, isDecon, reactSelectStyles } from 'styles';
import {
  scenarioNameInvalidMessage,
  scenarioNameTakenMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
function getAoiLayer(
  deconSketchLayer: LayerAoiAnalysisEditsType,
  layers: LayerType[],
) {
  let aoiLayer: LayerType | undefined = undefined;

  // locate the layer
  if (deconSketchLayer?.aoiLayerMode === 'draw') {
    const aoiEditsLayer = deconSketchLayer.layers.find(
      (l) => l.layerType === 'Decon Mask',
    );
    aoiLayer = layers.find(
      (l) =>
        l.layerType === 'Decon Mask' && l.layerId === aoiEditsLayer?.layerId,
    );
  }

  if (
    deconSketchLayer?.aoiLayerMode === 'file' &&
    deconSketchLayer.importedAoiLayer
  ) {
    // locate the layer
    aoiLayer = layers.find(
      (l) =>
        l.layerType === 'Area of Interest' &&
        l.layerId === deconSketchLayer.importedAoiLayer?.layerId,
    );
  }

  return aoiLayer;
}

function hasAoiGraphics(
  deconSketchLayer: LayerAoiAnalysisEditsType,
  layers: LayerType[],
) {
  const aoiLayer = getAoiLayer(deconSketchLayer, layers);
  return (
    aoiLayer?.sketchLayer &&
    aoiLayer.sketchLayer.type === 'graphics' &&
    aoiLayer.sketchLayer.graphics.length > 0
  );
}

const helpText = `
  Select "Draw Area of Interest" to draw a boundary on your map to<br/>
  designate a decontamination zone or decision unit. The tool will<br/>
  retrieve and analyze building data and ground surface characteristics<br/>
  to inform decontamination strategy decisions. Click "Save and Submit" to<br/>
  automatically generate a summary of contamination scenarios that are<br/>
  present within the designated AOI.
`;

// --- styles (Calculate) ---
const addButtonStyles = css`
  margin: 0;
  height: 38px; /* same height as ReactSelect */
`;

const iconButtonContainerStyles = css`
  display: flex;
  justify-content: space-between;
`;

const iconButtonStyles = css`
  width: 25px;
  margin: 0 2px;
  padding: 0.25em 0;
  color: black;
  background-color: white;
  border-radius: 0;
  line-height: 16px;
  text-decoration-line: none;
  font-weight: bold;

  &:hover {
    background-color: white;
  }
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

const layerButtonContainerStyles = css`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  div {
    display: flex;
    justify-content: flex-end;
  }
`;

const layerSelectStyles = css`
  margin-bottom: 10px;
`;

const radioLabelStyles = css`
  padding-left: 0.375rem;
`;

const saveButtonStyles = css`
  &: disabled {
    cursor: default;
    opacity: 0.65;
  }
`;

const sketchAoiButtonStyles = css`
  background-color: white;
  color: black;
  margin-bottom: 0.5rem;

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
  display: flex;
  justify-content: flex-end;

  button {
    margin-top: 10px;
  }
`;

const verticalCenterTextStyles = css`
  display: flex;
  align-items: center;
`;

// --- components (CharacterizeAOI) ---
type Props = {
  label?: string;
  showHelpText?: boolean;
  showOnEdit?: boolean;
};

function CharacterizeAOI({
  label = 'Active AOI Layer',
  showHelpText = true,
  showOnEdit = false,
}: Props) {
  const { portal, signedIn } = useContext(AuthenticationContext);
  const { calculateResultsDecon, setCalculateResultsDecon } =
    useContext(CalculateContext);
  const { setOptions } = useContext(DialogContext);
  const { setGoTo, setGoToOptions } = useContext(NavigationContext);
  const {
    aoiCharacterizationData,
    aoiSketchLayer,
    aoiSketchVM,
    deconOperation,
    deconSketchLayer,
    defaultDeconSelections,
    defaultSymbols,
    displayDimensions,
    edits,
    gsgFiles,
    layers,
    layersInitialized,
    map,
    mapView,
    sceneView,
    sceneViewForArea,
    selectedScenario,
    setAoiCharacterizationData,
    setAoiSketchLayer,
    setDeconSketchLayer,
    setEdits,
    setGsgFiles,
    setLayers,
    setSelectedScenario,
    sketchVM,
  } = useContext(SketchContext);
  const { defaultGsg, technologyTypes, services } = useLookupFiles().data;

  const [newDeconLayerName, setNewDeconLayerName] = useState('');
  const [newDeconDescription, setNewDeconDescription] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveResultsType>({
    status: 'none',
    name: newDeconLayerName,
  });

  // Initializes the aoi layer for performance reasons
  useEffect(() => {
    if (!map || !layersInitialized || aoiSketchLayer) return;

    const newAoiSketchLayer = getDefaultSamplingMaskLayer('');

    // add the layer to the map
    setLayers((layers) => {
      return [...layers, newAoiSketchLayer];
    });

    // set the active sketch layer
    setAoiSketchLayer(newAoiSketchLayer);
  }, [map, aoiSketchLayer, setAoiSketchLayer, layersInitialized, setLayers]);

  const [lastAoiSketchLayer, setLastAoiSketchLayer] =
    useState<__esri.GraphicsLayer | null>(null);
  useEffect(() => {
    if (!aoiSketchVM) return;

    aoiSketchVM.polygonSymbol = defaultSymbols.symbols[
      'Area of Interest'
    ] as any;

    const scenario: ScenarioDeconEditsType | undefined = edits.edits.find(
      (item) => item.type === 'scenario-decon',
    );
    if (!scenario) return;

    const deconLayer = edits.edits.find(
      (l) =>
        scenario.linkedLayerIds.includes(l.layerId) &&
        l.type === 'layer-aoi-analysis',
    ) as LayerAoiAnalysisEditsType;
    if (!deconLayer) return;

    const aoiEditsLayer = deconLayer.layers.find(
      (l) => l.layerType === 'Decon Mask',
    );
    const sketchLayer = layers.find(
      (l) =>
        l.layerType === 'Decon Mask' && l.layerId === aoiEditsLayer?.layerId,
    );
    if (
      sketchLayer &&
      sketchLayer?.sketchLayer?.id !== aoiSketchVM?.layer?.id
    ) {
      setLastAoiSketchLayer(aoiSketchVM.layer);
      aoiSketchVM.layer = sketchLayer.sketchLayer as __esri.GraphicsLayer;
      aoiSketchVM.layer.elevationInfo = { mode: 'on-the-ground' };
    }

    return function cleanup() {
      if (lastAoiSketchLayer) aoiSketchVM.layer = lastAoiSketchLayer;
    };
  }, [aoiSketchVM, defaultSymbols, edits, lastAoiSketchLayer, layers]);

  useEffect(() => {
    const scenario: ScenarioDeconEditsType | undefined = edits.edits.find(
      (item) => item.type === 'scenario-decon',
    );
    if (!scenario) return;

    const deconLayer = edits.edits.find(
      (l) =>
        scenario.linkedLayerIds.includes(l.layerId) &&
        l.type === 'layer-aoi-analysis',
    ) as LayerAoiAnalysisEditsType;
    if (!deconLayer) return;

    const aoiEditsLayer = deconLayer.layers.find(
      (l) => l.layerType === 'Decon Mask',
    );
    const sketchLayer = layers.find(
      (l) =>
        l.layerType === 'Decon Mask' && l.layerId === aoiEditsLayer?.layerId,
    );

    if (sketchLayer && sketchLayer.layerId !== aoiSketchLayer?.layerId)
      setAoiSketchLayer(sketchLayer);
  }, [aoiSketchLayer, edits, layers, setAoiSketchLayer]);

  // Handle a user clicking the sketch AOI button. If an AOI is not selected from the
  // dropdown this will create an AOI layer. This also sets the sketchVM to use the
  // selected AOI and triggers a React useEffect to allow the user to sketch on the map.
  function sketchAoiButtonClick() {
    if (!map || !aoiSketchVM || !sceneView || !mapView || !deconSketchLayer)
      return;

    aoiSketchVM.polygonSymbol = defaultSymbols.symbols[
      'Area of Interest'
    ] as any;

    const aoiEditsLayer = deconSketchLayer.layers.find(
      (l) => l.layerType === 'Decon Mask',
    );
    const sketchLayer = layers.find(
      (l) =>
        l.layerType === 'Decon Mask' && l.layerId === aoiEditsLayer?.layerId,
    );

    if (sketchLayer) {
      aoiSketchVM.layer = sketchLayer.sketchLayer as __esri.GraphicsLayer;
      aoiSketchVM.layer.visible = true;
      aoiSketchVM.layer.elevationInfo = { mode: 'on-the-ground' };
    }

    // save changes from other sketchVM and disable to prevent
    // interference
    if (sketchVM) sketchVM[displayDimensions].cancel();

    // make the style of the button active
    const wasSet = activateSketchButton('decon-mask');

    if (wasSet) {
      // let the user draw/place the shape
      aoiSketchVM.create('polygon');
    } else {
      aoiSketchVM.cancel();
    }
  }

  async function assessAoi() {
    if (!deconSketchLayer || !deconSketchLayer.aoiLayerMode) return;

    const aoiLayer = getAoiLayer(deconSketchLayer, layers);
    const aoiGraphics: __esri.Graphic[] = [];
    if (aoiLayer?.sketchLayer && aoiLayer.sketchLayer.type === 'graphics') {
      aoiGraphics.push(...aoiLayer.sketchLayer.graphics.toArray());
    }

    if (aoiGraphics.length === 0 || !deconSketchLayer) return;

    let editsCopy: EditsType = edits;

    setAoiCharacterizationData({
      status: 'fetching',
      planGraphics: {},
    });

    const responseIndexes: string[] = [];
    const planGraphics: PlanGraphics = {};
    let planAoiArea = 0;
    for (const graphic of aoiGraphics) {
      const areaSM = await calculateArea(graphic, sceneViewForArea);
      if (typeof areaSM === 'number') {
        planAoiArea += areaSM;
        graphic.attributes.AREA = areaSM;
      }

      responseIndexes.push(deconSketchLayer.layerId);
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        planGraphics,
        deconSketchLayer.layerId,
      )
    ) {
      planGraphics[deconSketchLayer.layerId] = {
        graphics: [],
        imageGraphics: [],
        aoiArea: planAoiArea,
        buildingFootprint: 0,
        summary: {
          totalAoiSqM: planAoiArea,
          totalBuildingExtSqM: 0,
          totalBuildingIntSqM: 0,
          totalBuildingVolumeCubM: 0,
          totalBuildingVolumeContentsCubM: 0,
          totalBuildingFootprintSqM: 0,
          totalBuildingFloorsSqM: 0,
          totalBuildingSqM: 0,
          totalBuildingExtWallsSqM: 0,
          totalBuildingIntWallsSqM: 0,
          totalBuildingRoofSqM: 0,
          totalBuildingCeilingsSqM: 0,
        },
        aoiPercentages: {
          numAois: 0,
          asphalt: 0,
          concrete: 0,
          soil: 0,
        },
      };
    } else {
      planGraphics[deconSketchLayer.layerId].aoiArea = planAoiArea;
      planGraphics[deconSketchLayer.layerId].summary.totalAoiSqM = planAoiArea;
    }

    let exitEarly = false;
    try {
      if (!['published', 'edited'].includes(deconSketchLayer.status)) {
        const nameRes: any = await isServiceNameAvailable(
          portal,
          signedIn,
          newDeconLayerName,
        );
        if (nameRes.error) {
          const saveStatus: SaveResultsType = {
            status: 'failure',
            name: newDeconLayerName,
            error: {
              error: createErrorObject(nameRes),
              message: nameRes.error.message,
            },
          };
          setSaveStatus(saveStatus);
          exitEarly = true;
        }

        if (!nameRes.available) {
          const saveStatus: SaveResultsType = {
            status: nameRes.problem ?? 'name-not-available',
            name: newDeconLayerName,
          };
          setSaveStatus(saveStatus);
          exitEarly = true;
        } else {
          setSaveStatus({
            status: 'success',
            name: newDeconLayerName,
          });
        }
      } else {
        const aoiLayerNamesTaken = edits.edits
          .filter(
            (edit) =>
              edit.type === 'layer-aoi-analysis' &&
              edit.layerId !== deconSketchLayer.layerId,
          )
          .map((edit) => edit.name);

        if (aoiLayerNamesTaken.includes(newDeconLayerName)) {
          const saveStatus: SaveResultsType = {
            status: 'name-not-available',
            name: newDeconLayerName,
          };
          setSaveStatus(saveStatus);
          exitEarly = true;
        } else {
          setSaveStatus({
            status: 'success',
            name: newDeconLayerName,
          });
        }
      }

      if (exitEarly) {
        setAoiCharacterizationData((aoiCharacterizationData) => {
          return {
            ...aoiCharacterizationData,
            status: 'none',
          };
        });
      } else {
        // update name and description
        const deconLayer = editsCopy.edits.find(
          (l) => l.layerId === deconSketchLayer.layerId,
        ) as LayerAoiAnalysisEditsType;
        deconLayer.name = newDeconLayerName;
        deconLayer.label = newDeconLayerName;
        deconLayer.description = newDeconDescription;
        if (deconLayer.version) deconLayer.version += 1;
        editsCopy.count += 1;

        const file = gsgFiles.files[gsgFiles.selectedIndex ?? 0];
        const gsgFile = await convertBase64ToFile(
          file.file ?? defaultGsg,
          file.path,
        );

        // TODO - look into adding more queries here
        const { buildingCount, buildingLimit, thresholdExceeded } =
          await fetchBuildingData(
            aoiGraphics,
            services,
            planGraphics,
            responseIndexes,
            gsgFile,
            sceneViewForArea,
            'math',
            technologyTypes,
          );
        if (thresholdExceeded) {
          setOptions({
            title: 'Too Many Buildings',
            ariaLabel: 'Too Many Buildings',
            description: `The AOI contains too many buildings (${buildingCount}). The limit is ${buildingLimit} buildings. Please draw a smaller AOI(s) and try again.`,
            onCancel: () =>
              setAoiCharacterizationData({ status: 'none', planGraphics: {} }),
          });
          return;
        }

        const newDeconTechSelections = processScenario(
          deconSketchLayer,
          {
            status: 'success',
            planGraphics,
          },
          {},
          {},
          defaultDeconSelections,
        );

        // Figure out what to add graphics to
        const aoiAssessed = deconSketchLayer.layers.find(
          (l) => l.layerType === 'AOI Assessed',
        );
        const imageAnalysis = deconSketchLayer.layers.find(
          (l: any) => l.layerType === 'Image Analysis',
        );
        const deconAoi = deconSketchLayer.layers.find(
          (l: any) => l.layerType === 'Decon Mask',
        );

        if (aoiAssessed && imageAnalysis && deconAoi) {
          const aoiAssessedLayer = layers.find(
            (l) => l.layerId === aoiAssessed.layerId,
          );
          const imageAnalysisLayer = layers.find(
            (l: any) => l.layerId === imageAnalysis.layerId,
          );
          const deconAoiLayer = layers.find(
            (l: any) => l.layerId === deconAoi.layerId,
          );

          // tie graphics and imageryGraphics to a scenario
          const planData = planGraphics[deconSketchLayer.layerId];
          if (
            aoiAssessedLayer?.sketchLayer?.type === 'graphics' &&
            planData?.graphics
          ) {
            aoiAssessedLayer.sketchLayer.graphics.removeAll();
            aoiAssessedLayer.sketchLayer.graphics.addMany(planData.graphics);

            editsCopy = updateLayerEdits({
              appType: 'decon',
              edits: editsCopy,
              layer: aoiAssessedLayer,
              type: 'replace',
              changes: planData.graphics,
            });
          }
          if (
            imageAnalysisLayer?.sketchLayer?.type === 'graphics' &&
            planData?.imageGraphics
          ) {
            imageAnalysisLayer?.sketchLayer.graphics.removeAll();
            imageAnalysisLayer?.sketchLayer.graphics.addMany(
              planData.imageGraphics,
            );

            editsCopy = updateLayerEdits({
              appType: 'decon',
              edits: editsCopy,
              layer: imageAnalysisLayer,
              type: 'replace',
              changes: planData.imageGraphics,
            });
          }
          if (deconAoiLayer) {
            if (deconAoiLayer.sketchLayer)
              deconAoiLayer.sketchLayer.visible = false;
            editsCopy = updateLayerEdits({
              appType: 'decon',
              edits: editsCopy,
              layer: deconAoiLayer,
              type: 'properties',
            });
          }

          const aoiAnalysis = editsCopy.edits.find(
            (e) =>
              e.type === 'layer-aoi-analysis' &&
              e.layerId === deconSketchLayer.layerId,
          ) as LayerAoiAnalysisEditsType | undefined;
          if (aoiAnalysis) {
            aoiAnalysis.aoiPercentages = {
              asphalt: planData.aoiPercentages.asphalt,
              asphaltSqM: planData.aoiPercentages.asphaltSqM,
              concrete: planData.aoiPercentages.concrete,
              concreteSqM: planData.aoiPercentages.concreteSqM,
              numAois: planData.aoiPercentages.numAois,
              soil: planData.aoiPercentages.soil,
              soilSqM: planData.aoiPercentages.soilSqM,
            };
            aoiAnalysis.aoiSummary = {
              totalAoiSqM: planData.summary.totalAoiSqM,
              totalBuildingExtSqM: planData.summary.totalBuildingExtSqM,
              totalBuildingIntSqM: planData.summary.totalBuildingIntSqM,
              totalBuildingVolumeCubM: planData.summary.totalBuildingVolumeCubM,
              totalBuildingVolumeContentsCubM:
                planData.summary.totalBuildingVolumeContentsCubM,
              totalBuildingExtWallsSqM:
                planData.summary.totalBuildingExtWallsSqM,
              totalBuildingFloorsSqM: planData.summary.totalBuildingFloorsSqM,
              totalBuildingFootprintSqM:
                planData.summary.totalBuildingFootprintSqM,
              totalBuildingIntWallsSqM:
                planData.summary.totalBuildingIntWallsSqM,
              totalBuildingRoofSqM: planData.summary.totalBuildingRoofSqM,
              totalBuildingCeilingsSqM:
                planData.summary.totalBuildingCeilingsSqM,
              totalBuildingSqM: planData.summary.totalBuildingSqM,
              areaByMedia: newDeconTechSelections.map((media: any) => {
                return {
                  id: media.id,
                  media: media.media,
                  pctAoi: media.pctAoi,
                  surfaceArea: media.surfaceArea,
                  volume: media.volume,
                  subMedia: media.subRows
                    ? media.subRows.map((r) => ({
                        id: r.id ?? generateUUID(),
                        media: r.media,
                        pctAoi: r.pctAoi,
                        surfaceArea: r.surfaceArea,
                        volume: r.volume,
                        subMedia: [],
                      }))
                    : [],
                };
              }),
            };

            editsCopy.edits.forEach((edit) => {
              if (
                (edit.type !== 'layer-decon' ||
                  edit.analysisLayerId !== aoiAnalysis?.layerId) &&
                (edit.type !== 'layer-aoi-analysis' ||
                  edit.layerId !== aoiAnalysis?.layerId)
              )
                return;

              edit.deconTechSelections = newDeconTechSelections.map((tech) => {
                const media = edit.deconTechSelections.find(
                  (a) => a.media === tech.media,
                );

                return {
                  ...tech,
                  deconTech: media?.deconTech ?? tech.deconTech,
                  isHazardous: media?.isHazardous ?? tech.isHazardous,
                  numIterativeApplications:
                    media?.numIterativeApplications ??
                    tech.numIterativeApplications,
                  numTeams: media?.numTeams ?? tech.numTeams,
                  removeContents: media?.removeContents ?? tech.removeContents,
                  subRows: tech.subRows?.map((sub: any) => {
                    const mediaSubRow = media?.subRows?.find(
                      (s: any) => s.media === sub.media,
                    );
                    return {
                      ...sub,
                      id: sub.id ?? generateUUID(),
                      deconTech: mediaSubRow?.deconTech ?? sub.deconTech,
                      isHazardous: mediaSubRow?.isHazardous ?? sub.isHazardous,
                      numIterativeApplications:
                        mediaSubRow?.numIterativeApplications ??
                        sub.numIterativeApplications,
                      numTeams: mediaSubRow?.numTeams ?? sub.numTeams,
                      removeContents:
                        mediaSubRow?.removeContents ?? sub.removeContents,
                    };
                  }),
                };
              });
            });
          }
        }

        setAoiCharacterizationData({
          status: 'success',
          planGraphics,
        });

        if (selectedScenario?.type === 'scenario-decon') {
          setCalculateResultsDecon((calculateResultsDecon) => {
            return {
              status: 'fetching',
              panelOpen: calculateResultsDecon.panelOpen,
              data: null,
            };
          });
        }
      }
    } catch (ex: any) {
      console.error(ex);
      setAoiCharacterizationData({
        status: 'failure',
        planGraphics: {},
        error: {
          error: createErrorObject(ex),
          message: ex.message,
        },
      });
      return;
    }

    setEdits(editsCopy);
    if (exitEarly) {
      setEditScenarioVisible(true);
    } else {
      const layer = layers.find((l) => l.layerId === deconSketchLayer?.layerId);
      if (!deconSketchLayer || !layer) return;

      // update title on layer
      if (layer.sketchLayer) layer.sketchLayer.title = newDeconLayerName;

      // update selected decon layer
      setDeconSketchLayer((layer) => {
        if (!layer) return null;
        return {
          ...layer,
          name: newDeconLayerName,
          label: newDeconLayerName,
          description: newDeconDescription,
        };
      });

      setDeconLayers((deconLayers) => {
        return deconLayers.map((layer) => {
          if (layer.layerId === deconSketchLayer.layerId) {
            return {
              ...layer,
              name: newDeconLayerName,
              label: newDeconLayerName,
              description: newDeconDescription,
            };
          }
          return layer;
        });
      });

      setAddScenarioVisible(false);
      setEditScenarioVisible(false);
    }
  }

  const [generateRandomMode, setGenerateRandomMode] = useState<
    'draw' | 'file' | ''
  >('draw');
  const [selectedAoiFile, setSelectedAoiFile] = useState<LayerType | null>(
    null,
  );
  const [selectedGsgFile, setSelectedGsgFile] = useState<any | null>(null);

  // get gsg file options
  const [gsgFileOptions] = useState(
    gsgFiles.files.map((file, index) => ({
      label: file.name,
      value: index,
      file,
    })),
  );

  // initialize the selected gsg file
  useEffect(() => {
    setSelectedGsgFile(gsgFileOptions[gsgFiles.selectedIndex ?? 0]);
  }, [gsgFileOptions, gsgFiles]);

  // useEffect(() => {
  //   if (!selectedScenario || selectedScenario.type !== 'scenario-decon' || selectedScenario.linkedLayerIds.length > 0) {
  //     setSelectedAoiFile(null);
  //     setGenerateRandomMode('draw');
  //     return;
  //   }

  //   if (
  //     selectedScenario.type !== 'scenario-decon' ||
  //     !selectedScenario?.layers[0]?.importedAoiLayer
  //   )
  //     return;

  //   // find the layer
  //   const layer = layers.find(
  //     (l) => l.layerId === selectedScenario.layers[0].importedAoiLayer?.layerId,
  //   );
  //   if (layer) setSelectedAoiFile(layer);
  // }, [layers, selectedScenario]);

  const [addScenarioVisible, setAddScenarioVisible] = useState(false);
  const [editScenarioVisible, setEditScenarioVisible] = useState(false);

  const [editsInitialized, setEditsInitialized] = useState(false);
  useEffect(() => {
    if (editsInitialized) return;
    if (!deconSketchLayer) {
      setEditScenarioVisible(false);
      return;
    }
    setEditsInitialized(true);

    const aoiEditsLayer = deconSketchLayer.layers.find(
      (l) => l.layerType === 'Decon Mask',
    );
    if (aoiEditsLayer && aoiEditsLayer.adds.length < 1)
      setEditScenarioVisible(true);
  }, [deconSketchLayer, editsInitialized]);

  // get decon layers for showing in select
  const [deconLayers, setDeconLayers] = useState<LayerAoiAnalysisEditsType[]>(
    [],
  );
  const [initializedLayers, setInitializedLayers] = useState(false);
  useEffect(() => {
    if (!layersInitialized) return;

    const newDeconLayers: LayerAoiAnalysisEditsType[] = [];
    edits.edits.forEach((edit) => {
      if (edit.type === 'layer-aoi-analysis')
        newDeconLayers.push(edit as LayerAoiAnalysisEditsType);
    });
    setDeconLayers(newDeconLayers);
    setInitializedLayers(true);
  }, [edits, layersInitialized]);

  const [initializedDeconLayer, setInitializedDeconLayer] = useState(false);
  useEffect(() => {
    if (
      deconSketchLayer ||
      initializedDeconLayer ||
      !initializedLayers ||
      !layersInitialized ||
      !map
    )
      return;

    setInitializedDeconLayer(true);

    if (deconLayers.length > 0) {
      setDeconSketchLayer(deconLayers[0]);
    } else {
      const {
        layers: newLayers,
        groupLayer,
        layerDecon,
        layerAoiAnalysis,
        sketchLayer,
        tempDeconLayer,
        tempAssessedAoiLayer,
        tempImageAnalysisLayer,
        tempCharacterizeAoiLayer,
      } = createScenarioDeconLayer(defaultDeconSelections);

      layerDecon.analysisLayerId = layerAoiAnalysis.layerId;

      // make a copy of the edits context variable
      setEdits((edits) => {
        const newEdits = edits.edits.filter((edit) => {
          const idx = newLayers.findIndex((l) => l.layerId === edit.layerId);

          return idx === -1;
        });

        if (selectedScenario?.type === 'scenario-decon') {
          const scenarioEdit = newEdits.find(
            (e) => e.layerId === selectedScenario.layerId,
          ) as ScenarioDeconEditsType;
          if (scenarioEdit.linkedLayerIds.length === 0) {
            scenarioEdit.linkedLayerIds.push(layerDecon.layerId);
            setSelectedScenario((selectedScenario) => {
              if (selectedScenario?.type !== 'scenario-decon')
                return selectedScenario;
              return {
                ...selectedScenario,
                linkedLayerIds: [layerDecon.layerId],
              };
            });
          }
        }

        return {
          count: edits.count + 1,
          edits: [...newEdits, layerAoiAnalysis, layerDecon],
        };
      });

      setDeconSketchLayer(layerAoiAnalysis);

      const tLayers = [...layers];
      if (tempCharacterizeAoiLayer) tLayers.push(tempCharacterizeAoiLayer);
      if (sketchLayer) tLayers.push(sketchLayer);
      if (tempImageAnalysisLayer) tLayers.push(tempImageAnalysisLayer);
      if (tempAssessedAoiLayer) tLayers.push(tempAssessedAoiLayer);
      if (tempDeconLayer) tLayers.push(tempDeconLayer);

      // update layers (set parent layer)
      window.totsLayers = tLayers;
      setLayers(tLayers);

      // add the scenario group layer to the map
      map.add(groupLayer);
    }
  }, [
    deconLayers,
    deconSketchLayer,
    defaultDeconSelections,
    initializedDeconLayer,
    initializedLayers,
    layers,
    layersInitialized,
    map,
    selectedScenario,
    setDeconSketchLayer,
    setEdits,
    setLayers,
    setSelectedScenario,
  ]);

  const [lastDeconSketchLayer, setLastDeconSketchLayer] =
    useState<LayerAoiAnalysisEditsType | null>(null);

  function handleAdd() {
    if (!map) return;

    const {
      layers: newLayers,
      groupLayer,
      layerAoiAnalysis,
      sketchLayer,
      tempAssessedAoiLayer,
      tempImageAnalysisLayer,
      tempCharacterizeAoiLayer,
    } = createScenarioDeconLayer(defaultDeconSelections, undefined);

    // make a copy of the edits context variable
    setEdits((edits) => {
      const newEdits = edits.edits.filter((edit) => {
        const idx = newLayers.findIndex((l) => l.layerId === edit.layerId);

        return idx === -1;
      });

      const selectedOp = edits.edits.find(
        (edit) =>
          edit.type === 'layer-decon' &&
          edit.layerId === deconOperation?.layerId,
      ) as LayerDeconEditsType | undefined;
      if (selectedOp) {
        selectedOp.analysisLayerId = layerAoiAnalysis.layerId;
        selectedOp.deconTechSelections = selectedOp.deconTechSelections.map(
          (tech) => {
            return {
              ...tech,
              pctAoi: 0,
              surfaceArea: 0,
            };
          },
        );
      }

      return {
        count: edits.count + 1,
        edits: [...newEdits, layerAoiAnalysis],
      };
    });

    setDeconSketchLayer(layerAoiAnalysis);

    const tLayers = [...layers];
    if (tempCharacterizeAoiLayer) tLayers.push(tempCharacterizeAoiLayer);
    if (sketchLayer) tLayers.push(sketchLayer);
    if (tempImageAnalysisLayer) tLayers.push(tempImageAnalysisLayer);
    if (tempAssessedAoiLayer) tLayers.push(tempAssessedAoiLayer);

    // update layers (set parent layer)
    window.totsLayers = tLayers;
    setLayers(tLayers);

    // add the scenario group layer to the map
    map.add(groupLayer);
  }

  function handleDelete(
    lastDeconSketchLayer?: LayerAoiAnalysisEditsType | null,
  ) {
    if (!deconSketchLayer) return;

    const idsToDelete: string[] = [deconSketchLayer.layerId];
    deconSketchLayer.layers.forEach((l) => {
      idsToDelete.push(l.layerId);
    });

    const newDeconLayers = deconLayers.filter(
      (layer) => !idsToDelete.includes(layer.layerId),
    );
    setDeconLayers(newDeconLayers);
    const nextDeconSketchLayer = lastDeconSketchLayer
      ? lastDeconSketchLayer
      : newDeconLayers.length > 0
        ? newDeconLayers[0]
        : null;
    setDeconSketchLayer(nextDeconSketchLayer);

    // remove all of the child layers
    setLayers((layers) => {
      return layers.filter((layer) => !idsToDelete.includes(layer.layerId));
    });

    // remove the scenario from edits
    const newEdits: EditsType = {
      count: edits.count + 1,
      edits: edits.edits.filter(
        (item) => item.layerId !== deconSketchLayer.layerId,
      ),
    };

    edits.edits.forEach((edit) => {
      if (edit.type !== 'layer-decon') return;
      if (!idsToDelete.includes(edit.analysisLayerId)) return;

      if (nextDeconSketchLayer) {
        edit.analysisLayerId = nextDeconSketchLayer.layerId;
        edit.deconTechSelections = nextDeconSketchLayer.deconTechSelections.map(
          (tech) => {
            const editTech = edit.deconTechSelections.find(
              (e) => e.media === tech.media,
            );
            return {
              ...tech,
              deconTech: editTech?.deconTech ?? tech.deconTech,
              numIterativeApplications:
                editTech?.numIterativeApplications ??
                tech.numIterativeApplications,
              numTeams: editTech?.numTeams ?? tech.numTeams,
              removeContents: editTech?.removeContents ?? tech.removeContents,
              subRows:
                editTech?.subRows?.map((subTech: any) => {
                  const subEditTech = editTech
                    ? editTech.subRows.find((e: any) => e.media === tech.media)
                    : null;

                  return {
                    ...subTech,
                    deconTech: subEditTech?.deconTech ?? subTech.deconTech,
                    numIterativeApplications:
                      subEditTech?.numIterativeApplications ??
                      subTech.numIterativeApplications,
                    numTeams: subEditTech?.numTeams ?? subTech.numTeams,
                    removeContents:
                      subEditTech?.removeContents ?? subTech.removeContents,
                  };
                }) ?? tech.subRows,
            };
          },
        );
      } else {
        edit.analysisLayerId = '';
        edit.deconTechSelections = edit.deconTechSelections.map((tech) => {
          return {
            ...tech,
            pctAoi: 0,
            surfaceArea: 0,
          };
        });
      }
    });

    setEdits(newEdits);

    // select the next available scenario
    const scenarios = getScenariosDecon(newEdits);
    if (selectedScenario?.type === 'scenario-decon')
      setSelectedScenario(scenarios.length > 0 ? scenarios[0] : null);

    if (scenarios.length > 0 && isDecon()) {
      setCalculateResultsDecon((calculateResultsDecon) => {
        return {
          status: 'fetching',
          panelOpen: calculateResultsDecon.panelOpen,
          data: null,
        };
      });
    }

    if (!map) return;

    // make the new selection visible
    if (scenarios.length > 0) {
      const newSelection = map.layers.find(
        (layer) => layer.id === scenarios[0].layerId,
      );
      if (newSelection) newSelection.visible = true;
    }

    // remove the scenario from the map
    const mapLayer = map.layers.find(
      (layer) => layer.id === deconSketchLayer.layerId,
    );
    map.remove(mapLayer);
  }

  useEffect(() => {
    setNewDeconLayerName(deconSketchLayer?.name ?? '');
    setNewDeconDescription(deconSketchLayer?.description ?? '');
  }, [deconSketchLayer]);

  return (
    <Fragment>
      {showHelpText && <p>{helpText.replaceAll('<br/>', '')}</p>}

      <div>
        <div css={iconButtonContainerStyles}>
          <div css={verticalCenterTextStyles}>
            <label htmlFor="characterize-aoi-select-input">{label}</label>
          </div>
          <div css={layerButtonContainerStyles}>
            <div>
              {deconSketchLayer && (
                <Fragment>
                  <button
                    css={iconButtonStyles}
                    title="Delete Layer"
                    onClick={() => handleDelete()}
                  >
                    <i className="fas fa-trash-alt" />
                    <span className="sr-only">Delete Layer</span>
                  </button>

                  <button
                    css={iconButtonStyles}
                    title={editScenarioVisible ? 'Cancel' : 'Edit Layer'}
                    onClick={() => {
                      setAddScenarioVisible(false);
                      setEditScenarioVisible(!editScenarioVisible);
                    }}
                  >
                    <i
                      className={
                        editScenarioVisible ? 'fas fa-times' : 'fas fa-edit'
                      }
                    />
                    <span className="sr-only">
                      {editScenarioVisible ? 'Cancel' : 'Edit Layer'}
                    </span>
                  </button>
                </Fragment>
              )}
              <button
                css={iconButtonStyles}
                title={addScenarioVisible ? 'Cancel' : 'Add Layer'}
                onClick={() => {
                  setEditScenarioVisible(false);
                  setAddScenarioVisible(!addScenarioVisible);

                  if (!addScenarioVisible) {
                    setLastDeconSketchLayer(deconSketchLayer);
                    handleAdd();
                  } else {
                    // delete the newly added layer
                    handleDelete(lastDeconSketchLayer);
                    setLastDeconSketchLayer(null);
                  }
                }}
              >
                <i
                  className={
                    addScenarioVisible ? 'fas fa-times' : 'fas fa-plus'
                  }
                />
                <span className="sr-only">
                  {addScenarioVisible ? 'Cancel' : 'Add Layer'}
                </span>
              </button>
            </div>
          </div>
        </div>
        <Select
          id="characterize-aoi-select-input-container"
          inputId="characterize-aoi-select-input"
          css={layerSelectStyles}
          styles={reactSelectStyles as any}
          isDisabled={addScenarioVisible || editScenarioVisible}
          options={deconLayers}
          value={deconSketchLayer}
          onChange={(ev) => {
            const newLayer = ev as LayerAoiAnalysisEditsType;
            setDeconSketchLayer(newLayer);
            if (!showOnEdit) return;

            setEdits((edits) => {
              return {
                count: edits.count + 1,
                edits: edits.edits.map((edit) => {
                  if (
                    edit.type === 'layer-decon' &&
                    edit.layerId === deconOperation?.layerId
                  ) {
                    return {
                      ...edit,
                      analysisLayerId: newLayer.layerId,
                      deconTechSelections: newLayer.deconTechSelections.map(
                        (tech) => {
                          const editTech = edit.deconTechSelections.find(
                            (e) => e.media === tech.media,
                          );
                          return {
                            ...tech,
                            deconTech: editTech?.deconTech ?? tech.deconTech,
                            numIterativeApplications:
                              editTech?.numIterativeApplications ??
                              tech.numIterativeApplications,
                            numTeams: editTech?.numTeams ?? tech.numTeams,
                            removeContents:
                              editTech?.removeContents ?? tech.removeContents,
                            subRows:
                              editTech?.subRows?.map((subTech: any) => {
                                const subEditTech = editTech
                                  ? editTech.subRows.find(
                                      (e: any) => e.media === tech.media,
                                    )
                                  : null;

                                return {
                                  ...subTech,
                                  deconTech:
                                    subEditTech?.deconTech ?? subTech.deconTech,
                                  numIterativeApplications:
                                    subEditTech?.numIterativeApplications ??
                                    subTech.numIterativeApplications,
                                  numTeams:
                                    subEditTech?.numTeams ?? subTech.numTeams,
                                  removeContents:
                                    subEditTech?.removeContents ??
                                    subTech.removeContents,
                                };
                              }) ?? tech.subRows,
                          };
                        },
                      ),
                    };
                  }

                  return edit;
                }),
              };
            });

            if (selectedScenario?.type === 'scenario-decon') {
              setCalculateResultsDecon((calculateResultsDecon) => {
                return {
                  status: 'fetching',
                  panelOpen: calculateResultsDecon.panelOpen,
                  data: null,
                };
              });
            }
          }}
        />
      </div>

      {(addScenarioVisible || editScenarioVisible) && (
        <div>
          <label>
            <span>AOI Decon Layer Name</span>
            <input
              type="text"
              css={inputStyles}
              maxLength={90}
              placeholder="Enter AOI Decon Layer Name"
              value={newDeconLayerName}
              disabled={['published', 'edited'].includes(
                deconSketchLayer?.status ?? '',
              )}
              onChange={(ev) => {
                setNewDeconLayerName(ev.target.value);
              }}
            />
          </label>
          <label>
            <span>AOI Decon Layer Description</span>
            <input
              type="text"
              css={inputStyles}
              maxLength={2048}
              placeholder="Enter AOI Decon Layer Description (2048 characters)"
              value={newDeconDescription}
              disabled={['published', 'edited'].includes(
                deconSketchLayer?.status ?? '',
              )}
              onChange={(ev) => {
                setNewDeconDescription(ev.target.value);
              }}
            />
          </label>
        </div>
      )}

      {(!showOnEdit ||
        (showOnEdit && (addScenarioVisible || editScenarioVisible))) && (
        <Fragment>
          {showOnEdit && (
            <div
              css={css`
                margin-top: 0.5rem;
              `}
            >
              <strong>Characterize Area of Interest</strong>
              <InfoIcon
                cssStyles={infoIconStyles}
                id="characterize-aoi-help-icon"
                tooltip={helpText}
                place="right"
              />
            </div>
          )}

          <div style={{ display: 'none' }}>
            <input
              id="draw-aoi"
              type="radio"
              name="mode"
              value="Draw area of Interest"
              disabled={calculateResultsDecon.status === 'fetching'}
              checked={generateRandomMode === 'draw'}
              onChange={(_ev) => {
                if (!deconSketchLayer) return;
                setGenerateRandomMode('draw');

                const aoiLayer = deconSketchLayer.layers.find(
                  (l) => l.layerType === 'Decon Mask',
                );
                if (!aoiLayer) return;

                const maskLayer = layers.find(
                  (layer) =>
                    layer.layerType === 'Decon Mask' &&
                    layer.layerId === aoiLayer?.layerId,
                );
                if (maskLayer) setAoiSketchLayer(maskLayer);

                setEdits((edits) => {
                  const index = edits.edits.findIndex(
                    (item) =>
                      item.type === 'layer-aoi-analysis' &&
                      item.layerId === deconSketchLayer.layerId,
                  );
                  const editedAoiAnalysis = edits.edits[
                    index
                  ] as LayerAoiAnalysisEditsType;

                  editedAoiAnalysis.aoiLayerMode = 'draw';

                  return {
                    count: edits.count + 1,
                    edits: [
                      ...edits.edits.slice(0, index),
                      editedAoiAnalysis,
                      ...edits.edits.slice(index + 1),
                    ],
                  };
                });
              }}
            />
            <label htmlFor="draw-aoi" css={radioLabelStyles}>
              Draw Sampling Mask
            </label>
          </div>

          {generateRandomMode === 'draw' && (
            <button
              id="decon-mask"
              title="Draw Decon Mask"
              className="sketch-button"
              disabled={aoiCharacterizationData.status === 'fetching'}
              onClick={() => {
                if (!aoiSketchLayer) return;

                sketchAoiButtonClick();
              }}
              css={sketchAoiButtonStyles}
            >
              <span css={sketchAoiTextStyles}>
                <i className="fas fa-draw-polygon" />{' '}
                <span>Draw Area of Interest</span>
              </span>
            </button>
          )}

          <div style={{ display: 'none' }}>
            <input
              id="use-aoi-file"
              type="radio"
              name="mode"
              value="Use Imported Area of Interest"
              disabled={calculateResultsDecon.status === 'fetching'}
              checked={generateRandomMode === 'file'}
              onChange={(_ev) => {
                if (!deconSketchLayer) return;

                setGenerateRandomMode('file');
                setAoiSketchLayer(null);

                let aoiLayer: LayerType | null = null;
                if (!selectedAoiFile) {
                  const aoiLayers = layers.filter(
                    (layer) => layer.layerType === 'Area of Interest',
                  );
                  aoiLayer = aoiLayers[0];
                  setSelectedAoiFile(aoiLayer);
                }

                setEdits((edits) => {
                  const index = edits.edits.findIndex(
                    (item) =>
                      item.type === 'layer-aoi-analysis' &&
                      item.layerId === deconSketchLayer.layerId,
                  );
                  const editedAoiAnalysis = edits.edits[
                    index
                  ] as LayerAoiAnalysisEditsType;

                  const importedAoi = edits.edits.find(
                    (l) =>
                      aoiLayer &&
                      l.type === 'layer' &&
                      l.layerType === 'Area of Interest' &&
                      l.layerId === aoiLayer.layerId,
                  );

                  if (importedAoi)
                    editedAoiAnalysis.importedAoiLayer =
                      importedAoi as LayerEditsType;

                  editedAoiAnalysis.aoiLayerMode = 'file';

                  return {
                    count: edits.count + 1,
                    edits: [
                      ...edits.edits.slice(0, index),
                      editedAoiAnalysis,
                      ...edits.edits.slice(index + 1),
                    ],
                  };
                });
              }}
            />
            <label htmlFor="use-aoi-file" css={radioLabelStyles}>
              Use Imported Area of Interest
            </label>
          </div>

          {generateRandomMode === 'file' && (
            <Fragment>
              <label htmlFor="aoi-mask-select-input">
                Area of Interest Mask
              </label>
              <div css={inlineMenuStyles}>
                <Select
                  id="aoi-mask-select"
                  inputId="aoi-mask-select-input"
                  css={inlineSelectStyles}
                  styles={reactSelectStyles as any}
                  isClearable={true}
                  value={selectedAoiFile}
                  onChange={(ev) => {
                    setSelectedAoiFile(ev as LayerType);

                    if (!deconSketchLayer) return;
                    setEdits((edits) => {
                      const index = edits.edits.findIndex(
                        (item) =>
                          item.type === 'layer-aoi-analysis' &&
                          item.layerId === deconSketchLayer.layerId,
                      );
                      const editedAoiAnalysis = edits.edits[
                        index
                      ] as LayerAoiAnalysisEditsType;

                      const importedAoi = edits.edits.find(
                        (l) =>
                          l.type === 'layer' &&
                          l.layerType === 'Area of Interest' &&
                          l.layerId === (ev as LayerType).layerId,
                      );

                      if (importedAoi)
                        editedAoiAnalysis.importedAoiLayer =
                          importedAoi as LayerEditsType;
                      return {
                        count: edits.count + 1,
                        edits: [
                          ...edits.edits.slice(0, index),
                          editedAoiAnalysis,
                          ...edits.edits.slice(index + 1),
                        ],
                      };
                    });
                  }}
                  options={layers.filter(
                    (layer) => layer.layerType === 'Area of Interest',
                  )}
                />
                <button
                  css={addButtonStyles}
                  disabled={calculateResultsDecon.status === 'fetching'}
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

          <AccordionList>
            <AccordionItem title="Advanced Options">
              <p>
                A default Ground Sampled Group (GSG) file is included. Click Add
                to upload an alternative GSG file to support ground surface
                classification imagery analysis.
              </p>
              <label htmlFor="gsg-file-select-input">
                GSG File (optional)
                <InfoIcon
                  id={'gsg-file-info-icon'}
                  cssStyles={infoIconStyles}
                  tooltip="Ground Sampled Group (gsg) is a file format used for machine<br/>learning workflows. TODS will use this file for performing<br/>imagery analysis. This file isn't required but providing one<br/>can help the accuracy of the imagery analysis results."
                />
              </label>
              <div css={inlineMenuStyles}>
                <Select
                  id="gsg-file-select"
                  inputId="gsg-file-select-input"
                  css={inlineSelectStyles}
                  styles={reactSelectStyles as any}
                  value={selectedGsgFile}
                  onChange={(ev) => {
                    setSelectedGsgFile(ev);

                    setGsgFiles((gsg) => {
                      return {
                        ...gsg,
                        selectedIndex: (ev as any)?.value ?? null,
                      };
                    });
                  }}
                  options={gsgFileOptions}
                />
                <button
                  css={addButtonStyles}
                  disabled={calculateResultsDecon.status === 'fetching'}
                  onClick={(_ev) => {
                    setGoTo('addData');
                    setGoToOptions({
                      from: 'file',
                      layerType: 'GSG',
                    });
                  }}
                >
                  Add
                </button>
              </div>
            </AccordionItem>
          </AccordionList>

          {generateRandomMode && (
            <Fragment>
              {calculateResultsDecon.status === 'failure' &&
                webServiceErrorMessage(calculateResultsDecon.error)}
              {saveStatus.status === 'failure' &&
                webServiceErrorMessage(saveStatus.error)}
              {aoiCharacterizationData.status === 'failure' &&
                webServiceErrorMessage(aoiCharacterizationData.error)}
              {saveStatus.status === 'name-not-available' &&
                scenarioNameTakenMessage(saveStatus.name)}
              {saveStatus.status === 'invalid-characters' &&
                scenarioNameInvalidMessage(saveStatus.name)}
              <div css={submitButtonStyles}>
                <button
                  css={saveButtonStyles}
                  onClick={assessAoi}
                  disabled={
                    aoiCharacterizationData.status === 'fetching' ||
                    !newDeconLayerName ||
                    !deconSketchLayer ||
                    !hasAoiGraphics(deconSketchLayer, layers)
                  }
                >
                  {aoiCharacterizationData.status !== 'fetching' &&
                    'Save and Submit'}
                  {aoiCharacterizationData.status === 'fetching' && (
                    <Fragment>
                      <i className="fas fa-spinner fa-pulse" />
                      &nbsp;&nbsp;Loading...
                    </Fragment>
                  )}
                </button>
              </div>
              {aoiCharacterizationData.status === 'fetching' && (
                <MessageBox
                  severity="warning"
                  title=""
                  message={
                    <Fragment>
                      The tool is performing ground surface imagery analysis and
                      retrieving building infrastructure characteristics. Please
                      be patient. Tip: Smaller AOIs will return results more
                      quickly.
                    </Fragment>
                  }
                />
              )}
            </Fragment>
          )}

          <hr />
        </Fragment>
      )}
    </Fragment>
  );
}

export default CharacterizeAOI;
