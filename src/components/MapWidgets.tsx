/** @jsx jsx */

import React from 'react';
import ReactDOM from 'react-dom';
import { jsx, css } from '@emotion/core';
import Select from 'components/Select';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { EditsType } from 'types/Edits';
import { LayerType, LayerTypeName } from 'types/Layer';
// config
import { sampleAttributes } from 'config/sampleAttributes';
// utils
import { useGeometryTools } from 'utils/hooks';
import {
  generateUUID,
  getCurrentDateTime,
  getPopupTemplate,
  getSketchableLayers,
  updateLayerEdits,
} from 'utils/sketchUtils';
// styles
import { colors } from 'styles';

type SaveStatusType = 'none' | 'success' | 'failure';

// Makes all sketch buttons no longer active by removing
// the sketch-button-selected class.
function deactivateButtons() {
  const buttons = document.querySelectorAll('.sketch-button');

  for (let i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('sketch-button-selected');
  }
}

// Replaces the prevClassName with nextClassName for all elements with
// prevClassName on the DOM.
function replaceClassName(prevClassName: string, nextClassName: string) {
  // timeout is necessary to handle race condition of loading indicator classname vs prevClassName
  setTimeout(() => {
    // get all elements with prevClassName and replace it with nextClassName
    const elms: HTMLCollectionOf<Element> = document.getElementsByClassName(
      prevClassName,
    );
    for (let i = 0; i < elms.length; i++) {
      const el = elms[i];
      el.className = el.className.replace(prevClassName, nextClassName);
    }
  }, 100);
}

// Finds the layer being updated and its index within the layers variable.
// Also returns the eventType (add, update, etc.) and event changes.
function getUpdateEventInfo(
  layers: LayerType[],
  event: any,
  setter: React.Dispatch<React.SetStateAction<LayerType | null>> | null,
) {
  // get type and changes
  const type = event.type === 'create' ? 'add' : event.type;
  const changes = type === 'add' ? [event.graphic] : event.graphics;

  // Get the layer from the event. It's better to get the layer from the graphics
  // since that will persist when changing tabs. For delete events we have to get
  // the layer from the target, since delete events never have the layer on the graphic.
  const eventLayer = type === 'delete' ? event.target.layer : changes[0].layer;

  // look up the layer for this event
  let updateLayer: LayerType | null = null;
  let updateLayerIndex = -1;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.layerId === eventLayer.id) {
      updateLayer = layer;
      updateLayerIndex = i;
      break;
    }
  }

  return {
    eventType: type,
    eventChanges: changes,
    layer: updateLayer,
    layerIndex: updateLayerIndex,
    setter,
  };
}

// --- styles (FeatureTool) ---
const containerStyles = css`
  width: 260px;
  padding: 6px;
  background-color: white;

  .sketch-button-selected {
    background-color: #f0f0f0;
    cursor: pointer;
  }

  .sketch-button-hidden {
    display: none;
  }
`;

const headerStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const buttonStyles = css`
  padding: 5px;
  background-color: white;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: #f0f0f0;
  }
`;

const noteStyles = css`
  height: 75px;
  width: 100%;
`;

const saveButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
  height: 40.47px;
  align-items: center;
`;

const inputContainerStyles = css`
  margin-bottom: 10px;
`;

const saveButtonStyles = (status: SaveStatusType) => {
  let backgroundColor = '';
  if (status === 'success') {
    backgroundColor = `background-color: ${colors.green()};`;
  }
  if (status === 'failure') {
    backgroundColor = `background-color: ${colors.red()};`;
  }

  return css`
    margin: 5px 0;
    ${backgroundColor}
  `;
};

const saveMessageStyles = css`
  color: ${colors.green()};
`;

// --- components (FeatureTool) ---
type FeatureToolProps = {
  sketchVM: __esri.SketchViewModel | null;
  selectedGraphicsIds: Array<string>;
  edits: EditsType;
  layers: LayerType[];
  onClick: (
    ev: React.MouseEvent<HTMLElement>,
    type: string,
    newLayer?: LayerType | null,
  ) => void;
};

function FeatureTool({
  sketchVM,
  selectedGraphicsIds,
  edits,
  layers,
  onClick,
}: FeatureToolProps) {
  // initializes the note and graphicNote whenever the graphic selection changes
  const [graphicNote, setGraphicNote] = React.useState('');
  const [note, setNote] = React.useState('');
  const [saveStatus, setSaveStatus] = React.useState<SaveStatusType>('none');
  React.useEffect(() => {
    // Reset the note if either no graphics are selected or multiple graphics
    // are selected. The note field only works if one graphic is selected.
    if (selectedGraphicsIds.length !== 1) {
      if (graphicNote) setGraphicNote('');
      if (note) setNote('');
      if (saveStatus !== 'none') setSaveStatus('none');
      return;
    }

    // Workaround for activeComponent not existing on the SketchViewModel type.
    const tempSketchVM = sketchVM as any;

    // Get the note from the graphics attributes
    if (tempSketchVM?.activeComponent?.graphics?.[0]?.attributes) {
      let newNote = tempSketchVM.activeComponent.graphics[0].attributes.Notes;
      newNote = newNote ? newNote : '';
      if (graphicNote !== newNote) {
        setGraphicNote(newNote);
        setNote(newNote);
        setSaveStatus('none');
      }
    }
  }, [graphicNote, note, saveStatus, sketchVM, selectedGraphicsIds]);

  // Reset the note, in the textbox, when the user selects a different sample.
  React.useEffect(() => {
    setNote(graphicNote);
  }, [selectedGraphicsIds, graphicNote]);

  // Resets the layerInitialized state when the graphic selection changes
  const [layerInitialized, setLayerInitialized] = React.useState(false);
  React.useEffect(() => {
    setLayerInitialized(false);
  }, [selectedGraphicsIds]);

  // Initializes the selected layer
  const [selectedLayer, setSelectedLayer] = React.useState<LayerType | null>(
    null,
  );
  React.useEffect(() => {
    if (layerInitialized) return;

    // Workaround for activeComponent not existing on the SketchViewModel type.
    const tempSketchVM = sketchVM as any;
    if (tempSketchVM?.activeComponent?.graphics?.[0]?.layer) {
      const activeLayerId = tempSketchVM.activeComponent.graphics[0].layer.id;
      // find the layer
      const sketchLayer = layers.find(
        (layer) => layer.layerId === activeLayerId,
      );

      // set the selectedLayer if different
      if (sketchLayer && sketchLayer.layerId !== selectedLayer?.layerId) {
        setSelectedLayer(sketchLayer);
      }
      if (!sketchLayer && selectedLayer) {
        setSelectedLayer(null);
      }

      setLayerInitialized(true);
    } else {
      if (selectedLayer) setSelectedLayer(null);
    }
  }, [layerInitialized, sketchVM, selectedLayer, layers]);

  // Resets the save status if the user changes the note
  React.useEffect(() => {
    if (graphicNote !== note && saveStatus === 'success') setSaveStatus('none');
  }, [graphicNote, note, saveStatus]);

  if (!sketchVM || selectedGraphicsIds.length === 0) return null;

  // Workaround for activeComponent not existing on the SketchViewModel type.
  const tempSketchVM = sketchVM as any;
  const type = tempSketchVM?.activeComponent?.graphics?.[0]?.attributes?.TYPE;

  // get the layers the graphic can be moved to
  const layerOptions: { label: string; options: LayerType[] }[] = [];
  edits.edits.forEach((edit) => {
    if (edit.type === 'layer') return;
    if (edit.layerType !== 'Samples' && edit.layerType !== 'VSP') return;

    layerOptions.push({
      label: edit.label,
      options: getSketchableLayers(layers, edit.layers),
    });
  });

  layerOptions.push({
    label: 'Unlinked Layers',
    options: getSketchableLayers(layers, edits.edits),
  });

  // get the sketch layer id
  const activeLayer = tempSketchVM?.activeComponent?.graphics?.[0]?.layer;
  const activeLayerId = activeLayer?.id;

  return (
    <div css={containerStyles}>
      <div css={headerStyles}>
        {selectedGraphicsIds.length} Feature(s)
        <div
          id="Delete"
          title="Delete"
          className="sketch-button"
          onClick={(ev) => onClick(ev, 'Delete')}
          css={buttonStyles}
        >
          <i className="fas fa-trash-alt" />
        </div>
      </div>
      {selectedGraphicsIds.length === 1 && (
        <React.Fragment>
          <div css={inputContainerStyles}>
            <label>Type: </label>
            {type}
          </div>
          {activeLayer?.title !== 'Sketched Sampling Mask' && (
            <React.Fragment>
              <div css={inputContainerStyles}>
                <label htmlFor="layer-change-select-input">Layer:</label>
                <Select
                  id="layer-change-select"
                  inputId="layer-change-select-input"
                  value={selectedLayer}
                  onChange={(ev) => {
                    setSaveStatus('none');
                    setSelectedLayer(ev as LayerType);
                  }}
                  options={layerOptions}
                />
              </div>
              <div>
                <label htmlFor="graphic-note">Note: </label>
                <br />
                <textarea
                  id="graphic-note"
                  css={noteStyles}
                  value={note}
                  onChange={(ev) => {
                    setSaveStatus('none');
                    setNote(ev.target.value);
                  }}
                />
              </div>
              <div css={saveButtonContainerStyles}>
                {(graphicNote !== note ||
                  activeLayerId !== selectedLayer?.layerId) && (
                  <button
                    css={saveButtonStyles(saveStatus)}
                    onClick={(ev) => {
                      // Workaround for activeComponent not existing on the SketchViewModel type.
                      const tempSketchVM = sketchVM as any;

                      // set the notes
                      if (tempSketchVM.activeComponent?.graphics) {
                        const firstGraphic =
                          tempSketchVM.activeComponent.graphics[0];
                        firstGraphic.attributes['Notes'] = note;
                        setGraphicNote(note);

                        // move the graphic if it is on a different layer
                        if (activeLayerId !== selectedLayer?.layerId) {
                          onClick(ev, 'Move', selectedLayer);
                        } else {
                          onClick(ev, 'Save');
                        }

                        setSaveStatus('success');
                      } else {
                        setSaveStatus('failure');
                      }
                    }}
                  >
                    {saveStatus === 'none' && 'Save'}
                    {saveStatus === 'failure' && (
                      <React.Fragment>
                        <i className="fas fa-exclamation-triangle" /> Error
                      </React.Fragment>
                    )}
                  </button>
                )}
                {saveStatus === 'success' && (
                  <div css={saveMessageStyles}>
                    <i className="fas fa-check" /> Saved Successfully
                  </div>
                )}
              </div>
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

// --- components (MapWidgets) ---
type Props = {
  mapView: __esri.MapView;
};

function MapWidgets({ mapView }: Props) {
  const { currentPanel, trainingMode, getTrainingMode } = React.useContext(
    NavigationContext,
  );
  const {
    edits,
    setEdits,
    homeWidget,
    setHomeWidget,
    selectedSampleIds,
    sketchVM,
    setSketchVM,
    aoiSketchVM,
    setAoiSketchVM,
    sketchLayer,
    setSketchLayer,
    aoiSketchLayer,
    setAoiSketchLayer,
    selectedScenario,
    layers,
    setLayers,
    map,
    polygonSymbol,
  } = React.useContext(SketchContext);
  const {
    Collection,
    Handles,
    Home,
    Locate,
    PopupTemplate,
    SketchViewModel,
  } = useEsriModulesContext();
  const { createBuffer } = useGeometryTools();

  // Creates and adds the home widget to the map.
  // Also moves the zoom widget to the top-right
  React.useEffect(() => {
    if (!mapView || !setHomeWidget || homeWidget) return;

    const widget = new Home({ view: mapView });

    mapView.ui.add(widget, { position: 'top-right', index: 1 });
    mapView.ui.move('zoom', 'top-right');

    setHomeWidget(widget);
  }, [mapView, Home, homeWidget, setHomeWidget]);

  // Creates and adds the locate widget to the map.
  const [
    locateWidget,
    setLocateWidget, //
  ] = React.useState<__esri.Locate | null>(null);
  React.useEffect(() => {
    if (!mapView || locateWidget) return;

    const widget = new Locate({ view: mapView });

    // show the locate icon on success
    widget.on('locate', (event) => {
      replaceClassName('esri-icon-error2', 'esri-icon-locate');
    });

    // show the error icon on failure
    widget.on('locate-error', (event) => {
      replaceClassName('esri-icon-locate', 'esri-icon-error2');
    });

    mapView.ui.add(widget, { position: 'top-right', index: 2 });
    setLocateWidget(widget);
  }, [mapView, Locate, locateWidget]);

  // Creates the SketchViewModel
  React.useEffect(() => {
    if (!sketchLayer) return;
    if (sketchVM) return;
    const svm = new SketchViewModel({
      layer: sketchLayer.sketchLayer,
      view: mapView,
      polygonSymbol,
      pointSymbol: polygonSymbol,
    });

    setSketchVM(svm);
  }, [
    SketchViewModel,
    mapView,
    sketchVM,
    setSketchVM,
    sketchLayer,
    polygonSymbol,
  ]);

  // Creates the SketchViewModel
  React.useEffect(() => {
    if (!aoiSketchLayer) return;
    if (aoiSketchVM) return;
    const svm = new SketchViewModel({
      layer: aoiSketchLayer.sketchLayer,
      view: mapView,
      polygonSymbol,
      pointSymbol: polygonSymbol,
    });

    setAoiSketchVM(svm);
  }, [
    SketchViewModel,
    mapView,
    aoiSketchVM,
    setAoiSketchVM,
    aoiSketchLayer,
    polygonSymbol,
  ]);

  // Updates the selected layer of the sketchViewModel
  React.useEffect(() => {
    if (!sketchVM) return;

    if (
      currentPanel?.value === 'locateSamples' &&
      sketchLayer?.sketchLayer?.type === 'graphics'
    ) {
      sketchVM.layer = sketchLayer.sketchLayer;
    } else {
      // disable the sketch vm for any panel other than locateSamples
      sketchVM.layer = (null as unknown) as __esri.GraphicsLayer;
    }

    sketchVM.polygonSymbol = polygonSymbol as any;
    sketchVM.pointSymbol = polygonSymbol as any;
  }, [currentPanel, sketchVM, sketchLayer, polygonSymbol]);

  // Updates the selected layer of the aoiSketchViewModel
  React.useEffect(() => {
    if (!aoiSketchVM) return;

    if (
      currentPanel?.value === 'locateSamples' &&
      aoiSketchLayer?.sketchLayer?.type === 'graphics'
    ) {
      aoiSketchVM.layer = aoiSketchLayer.sketchLayer;
    } else {
      // disable the sketch vm for any panel other than locateSamples
      aoiSketchVM.layer = (null as unknown) as __esri.GraphicsLayer;
    }

    aoiSketchVM.polygonSymbol = polygonSymbol as any;
    aoiSketchVM.pointSymbol = polygonSymbol as any;
  }, [currentPanel, aoiSketchVM, aoiSketchLayer, polygonSymbol]);

  // Creates the sketchVM events for placing the graphic on the map
  const [
    selectedGraphicsIds,
    setSelectedGraphicsIds, //
  ] = React.useState<Array<string>>([]);
  const setupEvents = React.useCallback(
    (
      layers: LayerType[],
      sketchViewModel: __esri.SketchViewModel,
      setter: React.Dispatch<React.SetStateAction<boolean>>,
      sketchEventSetter: React.Dispatch<any>,
    ) => {
      sketchViewModel.on('create', (event) => {
        const { graphic } = event;

        // place the graphic on the map when the drawing is complete
        if (event.state === 'complete') {
          // get the button and it's id
          const button = document.querySelector('.sketch-button-selected');
          const id = button && button.id;
          if (id === 'sampling-mask') {
            deactivateButtons();
          }

          if (!id) {
            // workaround for an error that said "target" does not exist on
            // type 'SketchViewModelUpdateEvent'.
            const tempEvent = event as any;
            tempEvent.target.cancel();
            return;
          }

          // get the layer uuid
          const layer = layers.find(
            (layer) => layer.layerId === graphic.layer.id,
          );

          // get the predefined attributes using the id of the clicked button
          const uuid = generateUUID();
          let layerType: LayerTypeName = 'Samples';
          if (id === 'sampling-mask') {
            layerType = 'Sampling Mask';
            graphic.attributes = {
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              TYPE: layerType,
            };
          } else {
            graphic.attributes = {
              ...sampleAttributes[id],
              DECISIONUNITUUID: layer?.uuid,
              DECISIONUNIT: layer?.label,
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              Notes: '',
              CREATEDDATE: getCurrentDateTime(),
            };
          }

          // add a popup template to the graphic
          graphic.popupTemplate = new PopupTemplate(
            getPopupTemplate(layerType, getTrainingMode()),
          );

          // predefined boxes (sponge, micro vac and swab) need to be
          // converted to a box of a specific size.
          if (graphic.attributes.ShapeType === 'point') {
            createBuffer(graphic, graphic.attributes.Width);
          }

          // save the graphic
          sketchViewModel.complete();
          sketchEventSetter(event);

          if (id !== 'sampling-mask') {
            // start next graphic
            sketchViewModel.create(graphic.attributes.ShapeType);
          }

          // re-enable layer popups
          if (map) {
            map.layers.forEach((layer: any) => {
              // had to use any, since some layer types don't have popupEnabled
              if (layer.popupEnabled) layer.popupEnabled = true;
            });
          }
        }
      });

      sketchViewModel.on('update', (event) => {
        let isActive = event.state === 'complete' ? false : true;
        // the updates have completed add them to the edits variable
        if (event.state === 'complete' && !event.aborted) {
          // fire the update event if event.state is complete.
          if (event.state === 'complete') {
            event.graphics.forEach((graphic) => {
              graphic.attributes.UPDATEDDATE = getCurrentDateTime();
            });
            sketchEventSetter(event);
          }

          // re-enable layer popups
          if (map) {
            map.layers.forEach((layer: any) => {
              // had to use any, since some layer types don't have popupEnabled
              if (layer.popupEnabled) layer.popupEnabled = true;
            });
          }
          isActive = false;
        }

        const isShapeChange =
          event.toolEventInfo &&
          (event.toolEventInfo.type.includes('reshape') ||
            event.toolEventInfo.type.includes('scale'));

        let hasPredefinedBoxes = false;
        event.graphics.forEach((graphic) => {
          if (graphic.attributes?.ShapeType === 'point') {
            hasPredefinedBoxes = true;
          }
        });

        // prevent scale and reshape changes on the predefined graphics
        // allow moves and rotates
        if (isShapeChange && hasPredefinedBoxes) {
          // workaround for an error that said "target" does not exist on
          // type 'SketchViewModelUpdateEvent'.
          const tempEvent = event as any;
          tempEvent.target.cancel();
        }

        // get the number of selected graphics
        let selectedGraphicsIds: Array<string> = [];
        if (event.graphics) {
          event.graphics.forEach((graphic) => {
            if (graphic.attributes?.PERMANENT_IDENTIFIER) {
              selectedGraphicsIds.push(graphic.attributes.PERMANENT_IDENTIFIER);
            }
          });
        }
        setSelectedGraphicsIds(
          event.state === 'complete' ? [] : selectedGraphicsIds,
        );
        setter(isActive);
      });

      // handles deleting when the delete key is pressed
      // Workaround for an error that said Argument of type '"delete"' is
      // not assignable to parameter of type '"undo"'.
      // This issue looks like the types haven't been updated, because delete
      // is now an option.
      const tempSketchVM = sketchViewModel as any;
      tempSketchVM.on('delete', (event: any) => {
        sketchEventSetter(event);
      });
    },
    [createBuffer, getTrainingMode, map, PopupTemplate],
  );

  // Setup the sketch view model events for the base sketchVM
  const [sketchVMActive, setSketchVMActive] = React.useState(false);
  const [
    sketchEventsInitialized,
    setSketchEventsInitialized, //
  ] = React.useState(false);
  const [updateSketchEvent, setUpdateSketchEvent] = React.useState<any>(null);
  React.useEffect(() => {
    if (!sketchVM || sketchEventsInitialized) return;
    setupEvents(layers, sketchVM, setSketchVMActive, setUpdateSketchEvent);

    setSketchEventsInitialized(true);
  }, [
    layers,
    sketchVM,
    setupEvents,
    sketchEventsInitialized,
    setSketchEventsInitialized,
  ]);

  // Setup the sketch view model events for the Sampling Mask sketchVM
  const [aoiSketchVMActive, setAoiSketchVMActive] = React.useState(false);
  const [
    aoiSketchEventsInitialized,
    setAoiSketchEventsInitialized, //
  ] = React.useState(false);
  const [
    aoiUpdateSketchEvent,
    setAoiUpdateSketchEvent, //
  ] = React.useState<any>(null);
  React.useEffect(() => {
    if (!aoiSketchVM || aoiSketchEventsInitialized) return;
    setupEvents(
      layers,
      aoiSketchVM,
      setAoiSketchVMActive,
      setAoiUpdateSketchEvent,
    );

    setAoiSketchEventsInitialized(true);
  }, [
    layers,
    aoiSketchVM,
    setupEvents,
    aoiSketchEventsInitialized,
    setAoiSketchEventsInitialized,
  ]);

  // Get the active sketchVM
  type SketchVMName = '' | 'sketchVM' | 'aoiSketchVM';
  const [
    targetSketchVM,
    setTargetSketchVM, //
  ] = React.useState<SketchVMName>('');
  const [bothEqualSet, setBothEqualSet] = React.useState(false);
  React.useEffect(() => {
    let newTarget: SketchVMName = '';
    let newBothEqualSet = bothEqualSet;

    // determine what the current sketchVM is
    if (sketchVMActive && aoiSketchVMActive) {
      // switch to the latest sketchVM
      if (targetSketchVM === 'sketchVM') newTarget = 'aoiSketchVM';
      if (targetSketchVM === 'aoiSketchVM') newTarget = 'sketchVM';
      newBothEqualSet = true;
    } else if (sketchVMActive) {
      newTarget = 'sketchVM';
      newBothEqualSet = false;
    } else if (aoiSketchVMActive) {
      newTarget = 'aoiSketchVM';
      newBothEqualSet = false;
    } else {
      newTarget = '';
      newBothEqualSet = false;
    }

    // When both sketchVMs are active only change the targetVM once.
    if (newBothEqualSet && bothEqualSet) return;

    // set state if it changed
    if (newTarget !== targetSketchVM) setTargetSketchVM(newTarget);
    if (newBothEqualSet !== bothEqualSet) setBothEqualSet(newBothEqualSet);
  }, [sketchVMActive, aoiSketchVMActive, targetSketchVM, bothEqualSet]);

  type UpdateLayerEventType = {
    eventType: any;
    eventChanges: any;
    layer: LayerType | null;
    layerIndex: number;
    setter: React.Dispatch<React.SetStateAction<LayerType | null>> | null;
  };
  const [updateLayer, setUpdateLayer] = React.useState<UpdateLayerEventType>({
    eventType: null,
    eventChanges: null,
    layer: null,
    layerIndex: -1,
    setter: null,
  });

  // set the updateLayer for the updateSketchEvent
  React.useEffect(() => {
    if (layers.length === 0 || !updateSketchEvent) return;
    setUpdateSketchEvent(null);

    setUpdateLayer(
      getUpdateEventInfo(layers, updateSketchEvent, setSketchLayer),
    );
  }, [updateSketchEvent, layers, setSketchLayer]);

  // set the updateLayer for the aoiUpdateSketchEvent
  React.useEffect(() => {
    if (layers.length === 0 || !aoiUpdateSketchEvent) return;
    setAoiUpdateSketchEvent(null);

    setUpdateLayer(
      getUpdateEventInfo(layers, aoiUpdateSketchEvent, setAoiSketchLayer),
    );
  }, [aoiUpdateSketchEvent, layers, setAoiSketchLayer]);

  // save the updated graphic to the edits data structure for later publishing
  React.useEffect(() => {
    if (!updateLayer.layer) return;
    setUpdateLayer({
      eventType: null,
      eventChanges: null,
      layer: null,
      layerIndex: -1,
      setter: null,
    });

    // save the layer changes
    // make a copy of the edits context variable
    const editsCopy = updateLayerEdits({
      edits,
      layer: updateLayer.layer,
      type: updateLayer.eventType,
      changes: updateLayer.eventChanges,
    });

    // update the edits state
    setEdits(editsCopy);

    // updated the edited layer
    setLayers([
      ...layers.slice(0, updateLayer.layerIndex),
      updateLayer.layer,
      ...layers.slice(updateLayer.layerIndex + 1),
    ]);

    // update sketchVM event
    if (updateLayer.setter) {
      updateLayer.setter((layer) => {
        return layer ? { ...layer, editType: updateLayer.eventType } : null;
      });
    }
  }, [edits, setEdits, updateLayer, layers, setLayers]);

  // Reactivate aoiSketchVM after the updateSketchEvent is null
  React.useEffect(() => {
    if (
      updateSketchEvent ||
      !aoiSketchVM ||
      aoiSketchVM.layer ||
      aoiSketchLayer?.sketchLayer?.type !== 'graphics' ||
      currentPanel?.value !== 'locateSamples'
    ) {
      return;
    }

    aoiSketchVM.layer = aoiSketchLayer.sketchLayer;
  }, [currentPanel, updateSketchEvent, aoiSketchVM, aoiSketchLayer]);

  // Reactivate sketchVM after the aoiUpdateSketchEvent is null
  React.useEffect(() => {
    if (
      aoiUpdateSketchEvent ||
      !sketchVM ||
      sketchVM.layer ||
      sketchLayer?.sketchLayer?.type !== 'graphics' ||
      currentPanel?.value !== 'locateSamples'
    ) {
      return;
    }

    sketchVM.layer = sketchLayer.sketchLayer;
  }, [currentPanel, aoiUpdateSketchEvent, sketchVM, sketchLayer]);

  // Updates the popupTemplates when trainingMode is toggled on/off
  React.useEffect(() => {
    // get the popupTemplate
    const popupTemplate = new PopupTemplate(
      getPopupTemplate('Samples', trainingMode),
    );

    // update the popupTemplate for all Sample/VSP layers
    layers.forEach((layer) => {
      if (
        layer.sketchLayer.type === 'graphics' &&
        (layer.layerType === 'Samples' || layer.layerType === 'VSP')
      ) {
        layer.sketchLayer.graphics.forEach((graphic) => {
          graphic.popupTemplate = popupTemplate;
        });
      }
    });
  }, [PopupTemplate, trainingMode, layers]);

  // Adds a container for the feature tool to the map
  const [
    featureTool,
    setFeatureTool, //
  ] = React.useState<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!mapView || featureTool) return;
    // Put the sketch toolbar on the map
    const featureToolContainer = document.createElement('div');
    mapView.ui.add(featureToolContainer, 'bottom-right');
    setFeatureTool(featureToolContainer);
  }, [mapView, featureTool]);

  // Creates and adds the custom edit feature tool to the map.
  const [
    lastTargetSketchVM,
    setLastTargetSketchVM, //
  ] = React.useState<SketchVMName>('');
  React.useEffect(() => {
    if (!featureTool) return;

    let localSketchLayer: LayerType | null = null;
    let localSketchVM: __esri.SketchViewModel | null = null;
    let otherSketchVM: __esri.SketchViewModel | null = null;

    // get the last used sketchVM (to be tied to the FeatureTool)
    if (targetSketchVM === 'sketchVM') {
      localSketchVM = sketchVM;
      localSketchLayer = sketchLayer;
      otherSketchVM = aoiSketchVM;
    }
    if (targetSketchVM === 'aoiSketchVM') {
      localSketchVM = aoiSketchVM;
      localSketchLayer = aoiSketchLayer;
      otherSketchVM = sketchVM;
    }

    // complete any active sketches on the otherSketchVM
    if (targetSketchVM !== lastTargetSketchVM) {
      otherSketchVM?.complete();
      setLastTargetSketchVM(targetSketchVM);
    }

    // handles the sketch button clicks
    const handleClick = (
      ev: React.MouseEvent<HTMLElement>,
      type: string,
      newLayer: LayerType | null = null,
    ) => {
      if (!localSketchVM || !localSketchLayer) return;

      // set the clicked button as active until the drawing is complete
      deactivateButtons();

      const target = ev.target as HTMLElement;
      target.classList.add('sketch-button-selected');

      // Workaround for activeComponent not existing on the SketchViewModel type.
      const tempSketchVM = localSketchVM as any;
      if (type === 'Delete') {
        // Workaround for activeComponent not existing on the SketchViewModel type.
        const tempSketchVM = localSketchVM as any;
        if (tempSketchVM.activeComponent?.graphics) {
          // make a copy of the edits context variable
          const editsCopy = updateLayerEdits({
            edits,
            layer: localSketchLayer,
            type: 'delete',
            changes: tempSketchVM.activeComponent.graphics,
          });

          setEdits(editsCopy);

          localSketchVM.layer.removeMany(tempSketchVM.activeComponent.graphics);
        }
      }
      if (type === 'Save') {
        if (tempSketchVM.activeComponent?.graphics) {
          // make a copy of the edits context variable
          const editsCopy = updateLayerEdits({
            edits,
            layer: localSketchLayer,
            type: 'update',
            changes: tempSketchVM.activeComponent.graphics,
          });

          setEdits(editsCopy);
        }
      }
      if (
        type === 'Move' &&
        newLayer &&
        tempSketchVM.activeComponent?.graphics &&
        tempSketchVM.activeComponent.graphics.length > 0
      ) {
        // get items from sketch view model
        const graphicsToMove = new Collection<__esri.Graphic>();
        tempSketchVM.activeComponent.graphics.forEach(
          (graphic: __esri.Graphic) => {
            graphic.attributes.DECISIONUNITUUID = newLayer.uuid;
            graphic.attributes.DECISIONUNIT = newLayer.label;
            graphicsToMove.add(graphic);
          },
        );
        const tempLayer = graphicsToMove.getItemAt(0)
          .layer as __esri.GraphicsLayer;

        // find the layer
        const tempSketchLayer = layers.find(
          (layer) => layer.layerId === tempLayer.id,
        );
        if (!tempSketchLayer) return;

        // add the graphics to move to the new layer
        let editsCopy = updateLayerEdits({
          edits,
          layer: newLayer,
          type: 'add',
          changes: graphicsToMove,
        });

        // remove the graphics from the old layer
        editsCopy = updateLayerEdits({
          edits: editsCopy,
          layer: tempSketchLayer,
          type: 'delete',
          changes: graphicsToMove,
        });
        setEdits(editsCopy);

        // move between layers on map
        const tempNewLayer = newLayer.sketchLayer as __esri.GraphicsLayer;
        tempNewLayer.graphics.addMany(graphicsToMove);
        tempLayer.removeMany(graphicsToMove.toArray());
      }
    };

    let featureToolContent = (
      <FeatureTool
        sketchVM={localSketchVM}
        selectedGraphicsIds={selectedGraphicsIds}
        edits={edits}
        layers={layers}
        onClick={handleClick}
      />
    );
    ReactDOM.render(featureToolContent, featureTool);
  }, [
    Collection,
    featureTool,
    sketchVM,
    aoiSketchVM,
    sketchLayer,
    aoiSketchLayer,
    selectedGraphicsIds,
    edits,
    setEdits,
    layers,
    setLayers,
    targetSketchVM,
    lastTargetSketchVM,
  ]);

  // Gets the graphics to be highlighted and highlights them
  type HighlightType = {
    graphics: __esri.Graphic[];
    handle: __esri.Handle | null;
  };

  const [handles] = React.useState(new Handles());
  React.useEffect(() => {
    if (!map || !selectedScenario || selectedScenario.layers.length === 0) {
      return;
    }

    const group = 'contamination-highlights-group';
    handles.remove(group);

    // find the group layer
    const groupLayer = map.findLayerById(
      selectedScenario.layerId,
    ) as __esri.GroupLayer;

    // Get any graphics that have a contam value
    if (trainingMode) {
      groupLayer.layers.forEach((layer) => {
        if (layer.type !== 'graphics') return;

        const highlightGraphics: __esri.Graphic[] = [];
        const tempLayer = layer as __esri.GraphicsLayer;
        tempLayer.graphics.forEach((graphic) => {
          if (graphic.attributes.CONTAMVAL) {
            highlightGraphics.push(graphic);
          }
        });

        // Highlight the graphics with a contam value
        if (highlightGraphics.length === 0) return;

        mapView.whenLayerView(tempLayer).then((layerView) => {
          const handle = layerView.highlight(highlightGraphics);
          handles.add(handle, group);
        });
      });
    }
  }, [map, handles, edits, selectedScenario, mapView, trainingMode]);

  React.useEffect(() => {
    if (!map) {
      return;
    }

    const group = 'highlights-group';
    handles.remove(group);

    const samples: any = {};
    selectedSampleIds.forEach((sample) => {
      if (!samples.hasOwnProperty(sample.DECISIONUNITUUID)) {
        samples[sample.DECISIONUNITUUID] = [sample.PERMANENT_IDENTIFIER];
      } else {
        samples[sample.DECISIONUNITUUID].push(sample.PERMANENT_IDENTIFIER);
      }
    });

    Object.keys(samples).forEach((layerUuid) => {
      // find the layer
      const sampleUuids = samples[layerUuid];
      const layer = layers.find((layer) => layer.uuid === layerUuid);

      if (!layer) return;

      const highlightGraphics: __esri.Graphic[] = [];
      const tempLayer = layer.sketchLayer as __esri.GraphicsLayer;
      tempLayer.graphics.forEach((graphic) => {
        if (sampleUuids.includes(graphic.attributes.PERMANENT_IDENTIFIER)) {
          highlightGraphics.push(graphic);
        }
      });

      // Highlight the graphics with a contam value
      if (highlightGraphics.length === 0) return;

      mapView.whenLayerView(tempLayer).then((layerView) => {
        const handle = layerView.highlight(highlightGraphics);
        handles.add(handle, group);
      });
    });
  }, [map, handles, layers, mapView, selectedSampleIds]);

  return null;
}

export default MapWidgets;
