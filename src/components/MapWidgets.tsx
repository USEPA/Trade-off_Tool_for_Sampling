/** @jsx jsx */

import React from 'react';
import ReactDOM from 'react-dom';
import { jsx, css } from '@emotion/core';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType, LayerTypeName } from 'types/Layer';
// config
import {
  predefinedBoxTypes,
  SampleType,
  sampleAttributes,
} from 'config/sampleAttributes';
import { polygonSymbol } from 'config/symbols';
// utils
import {
  generateUUID,
  getCurrentDateTime,
  getPopupTemplate,
  updateLayerEdits,
} from 'utils/sketchUtils';
// styles
import { colors } from 'styles';

const sponge_SA = 0.254 / 2;
const vac_SA = 0.3048 / 2;
const swab_SA = 0.0508 / 2;

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

// --- styles (FeatureTool) ---
const containerStyles = css`
  width: 160px;
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
`;

const saveButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
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

// --- components (FeatureTool) ---
type FeatureToolProps = {
  sketchVM: __esri.SketchViewModel | null;
  selectedGraphicsIds: Array<string>;
  onClick: (ev: React.MouseEvent<HTMLElement>, type: string) => void;
};

function FeatureTool({
  sketchVM,
  selectedGraphicsIds,
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
      const newNote = tempSketchVM.activeComponent.graphics[0].attributes.Notes;
      if (graphicNote !== newNote) {
        setGraphicNote(newNote);
        setNote(newNote);
        setSaveStatus('none');
      }
    }
  }, [graphicNote, note, saveStatus, sketchVM, selectedGraphicsIds]);

  // Resets the save status if the user changes the note
  React.useEffect(() => {
    if (graphicNote !== note && saveStatus !== 'none') setSaveStatus('none');
  }, [graphicNote, note, saveStatus]);

  if (!sketchVM || selectedGraphicsIds.length === 0) return null;

  // Workaround for activeComponent not existing on the SketchViewModel type.
  const tempSketchVM = sketchVM as any;
  const type = tempSketchVM?.activeComponent?.graphics?.[0]?.attributes?.TYPE;

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
          <div>
            <label>Type: </label>
            {type}
          </div>
          <div>
            <label htmlFor="graphic-note">Note: </label>
            <br />
            <textarea
              id="graphic-note"
              css={noteStyles}
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
            />
          </div>
          <div css={saveButtonContainerStyles}>
            <button
              css={saveButtonStyles(saveStatus)}
              disabled={note === graphicNote}
              onClick={(ev) => {
                // Workaround for activeComponent not existing on the SketchViewModel type.
                const tempSketchVM = sketchVM as any;

                // set the notes
                if (tempSketchVM.activeComponent?.graphics) {
                  const firstGraphic = tempSketchVM.activeComponent.graphics[0];
                  firstGraphic.attributes['Notes'] = note;
                  setGraphicNote(note);

                  onClick(ev, 'Save');
                  setSaveStatus('success');
                } else {
                  setSaveStatus('failure');
                }
              }}
            >
              {saveStatus === 'none' && 'Save'}
              {saveStatus === 'success' && (
                <React.Fragment>
                  <i className="fas fa-check" /> Saved
                </React.Fragment>
              )}
              {saveStatus === 'failure' && (
                <React.Fragment>
                  <i className="fas fa-exclamation-triangle" /> Error
                </React.Fragment>
              )}
            </button>
          </div>
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
  const {
    edits,
    setEdits,
    homeWidget,
    setHomeWidget,
    sketchVM,
    setSketchVM,
    aoiSketchVM,
    setAoiSketchVM,
    setSketchVMLayerId,
    sketchLayer,
    aoiSketchLayer,
    layers,
    setLayers,
    map,
  } = React.useContext(SketchContext);
  const {
    Home,
    Locate,
    Polygon,
    PopupTemplate,
    SketchViewModel,
  } = useEsriModulesContext();

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
  }, [SketchViewModel, mapView, sketchVM, setSketchVM, sketchLayer]);

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
  }, [SketchViewModel, mapView, aoiSketchVM, setAoiSketchVM, aoiSketchLayer]);

  // Updates the selected layer of the sketchViewModel
  React.useEffect(() => {
    if (!sketchVM || !sketchLayer?.sketchLayer) return;

    if (sketchLayer.sketchLayer.type === 'graphics') {
      sketchVM.layer = sketchLayer.sketchLayer;
      setSketchVMLayerId(sketchLayer.sketchLayer.id);
    }
  }, [sketchVM, setSketchVMLayerId, sketchLayer]);

  // Updates the selected layer of the aoiSketchViewModel
  React.useEffect(() => {
    if (!aoiSketchVM || !aoiSketchLayer?.sketchLayer) return;

    if (aoiSketchLayer.sketchLayer.type === 'graphics') {
      aoiSketchVM.layer = aoiSketchLayer.sketchLayer;
    }
  }, [aoiSketchVM, aoiSketchLayer]);

  // Creates the sketchVM events for placing the graphic on the map
  const [updateSketchEvent, setUpdateSketchEvent] = React.useState<any>(null);
  const [
    selectedGraphicsIds,
    setSelectedGraphicsIds, //
  ] = React.useState<Array<string>>([]);
  const setupEvents = React.useCallback(
    (
      sketchViewModel: __esri.SketchViewModel,
      setter: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
      let nextId = 1;

      sketchViewModel.on('create', (event) => {
        const { graphic } = event;

        // place the graphic on the map when the drawing is complete
        if (event.state === 'complete') {
          // get the button and it's id
          const button = document.querySelector('.sketch-button-selected');
          const id = button && button.id;
          const key = id as SampleType;
          deactivateButtons();

          if (!id) {
            // workaround for an error that said "target" does not exist on
            // type 'SketchViewModelUpdateEvent'.
            const tempEvent = event as any;
            tempEvent.target.cancel();
            return;
          }

          // get the predefined attributes using the id of the clicked button
          const uuid = generateUUID();
          let layerType: LayerTypeName = 'Samples';
          if (id === 'aoi') {
            layerType = 'Area of Interest';
            graphic.attributes = {
              OBJECTID: nextId.toString(),
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              Notes: '',
              TYPE: layerType,
            };
          } else {
            graphic.attributes = {
              ...sampleAttributes[key],
              OBJECTID: nextId.toString(),
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              Notes: '',
              CREATEDDATE: getCurrentDateTime(),
            };
          }

          // add a popup template to the graphic
          graphic.popupTemplate = new PopupTemplate(
            getPopupTemplate(layerType),
          );
          nextId = nextId + 1;

          // predefined boxes (sponge, micro vac and swab) need to be
          // converted to a box of a specific size.
          if (predefinedBoxTypes.includes(id)) {
            let halfWidth = 0;
            if (id === 'Sponge') halfWidth = sponge_SA;
            if (id === 'Micro Vac') halfWidth = vac_SA;
            if (id === 'Swab') halfWidth = swab_SA;

            // create the graphic
            const prevGeo = graphic.geometry as __esri.Point;

            graphic.geometry = new Polygon({
              spatialReference: prevGeo.spatialReference,
              centroid: prevGeo,
              rings: [
                [
                  [prevGeo.x - halfWidth, prevGeo.y - halfWidth],
                  [prevGeo.x - halfWidth, prevGeo.y + halfWidth],
                  [prevGeo.x + halfWidth, prevGeo.y + halfWidth],
                  [prevGeo.x + halfWidth, prevGeo.y - halfWidth],
                ],
              ],
            });
          }

          // save the graphic
          sketchViewModel.update(graphic);
          setUpdateSketchEvent(event);

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
        let isActive = true;
        // the updates have completed add them to the edits variable
        if (event.state === 'complete' || event.state === 'cancel') {
          // fire the update event if event.state is complete.
          if (event.state === 'complete') {
            event.graphics.forEach((graphic) => {
              graphic.attributes.UPDATEDDATE = getCurrentDateTime();
            });
            setUpdateSketchEvent(event);
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

        // Swab, Micro Vac, Wet Vac, etc.
        const firstGraphicType =
          event.graphics[0].attributes && event.graphics[0].attributes.TYPE;

        const isShapeChange =
          event.toolEventInfo &&
          (event.toolEventInfo.type.includes('reshape') ||
            event.toolEventInfo.type.includes('scale'));

        // prevent scale and reshape changes on the predefined graphics
        // allow moves and rotates
        if (isShapeChange && predefinedBoxTypes.includes(firstGraphicType)) {
          // workaround for an error that said "target" does not exist on
          // type 'SketchViewModelUpdateEvent'.
          const tempEvent = event as any;
          tempEvent.target.cancel();
        }

        // get the number of selected graphics
        let selectedGraphicsIds: Array<string> = [];
        if (event.state !== 'cancel' && event.graphics) {
          event.graphics.forEach((graphic) => {
            selectedGraphicsIds.push(graphic.attributes.PERMANENT_IDENTIFIER);
          });
        }
        setSelectedGraphicsIds(selectedGraphicsIds);
        setter(isActive);
      });

      // handles deleting when the delete key is pressed
      // Workaround for an error that said Argument of type '"delete"' is
      // not assignable to parameter of type '"undo"'.
      // This issue looks like the types haven't been updated, because delete
      // is now an option.
      const tempSketchVM = sketchViewModel as any;
      tempSketchVM.on('delete', (event: any) => {
        setUpdateSketchEvent(event);
      });
    },
    [Polygon, PopupTemplate, map],
  );

  // Setup the sketch view model events for the base sketchVM
  const [sketchVMActive, setSketchVMActive] = React.useState(false);
  const [
    sketchEventsInitialized,
    setSketchEventsInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (!sketchVM || sketchEventsInitialized) return;
    setupEvents(sketchVM, setSketchVMActive);

    setSketchEventsInitialized(true);
  }, [
    sketchVM,
    setupEvents,
    sketchEventsInitialized,
    setSketchEventsInitialized,
  ]);

  // Setup the sketch view model events for the Area of Interest (AOI) sketchVM
  const [aoiSketchVMActive, setAoiSketchVMActive] = React.useState(false);
  const [
    aoiSketchEventsInitialized,
    setAoiSketchEventsInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (!aoiSketchVM || aoiSketchEventsInitialized) return;
    setupEvents(aoiSketchVM, setAoiSketchVMActive);

    setAoiSketchEventsInitialized(true);
  }, [
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

  // save the updated graphic to the edits data structure for later publishing
  React.useEffect(() => {
    if (layers.length === 0 || !updateSketchEvent) return;
    setUpdateSketchEvent(null);

    const type =
      updateSketchEvent.type === 'create' ? 'add' : updateSketchEvent.type;
    const changes =
      type === 'add' ? [updateSketchEvent.graphic] : updateSketchEvent.graphics;

    // look up the layer for this event
    let updateLayer: LayerType | null = null;
    let updateLayerIndex = -1;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (layer.layerId === changes[0].layer.id) {
        updateLayer = layer;
        updateLayerIndex = i;
        break;
      }
    }

    // save the layer changes
    if (updateLayer) {
      // make a copy of the edits context variable
      const editsCopy = updateLayerEdits({
        edits,
        layer: updateLayer,
        type,
        changes,
      });

      // update the edits state
      setEdits(editsCopy);

      // updated the edited layer
      setLayers([
        ...layers.slice(0, updateLayerIndex),
        updateLayer,
        ...layers.slice(updateLayerIndex + 1),
      ]);
    }
  }, [edits, setEdits, updateSketchEvent, layers, setLayers]);

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
    const handleClick = (ev: React.MouseEvent<HTMLElement>, type: string) => {
      if (!localSketchVM || !localSketchLayer) return;

      // set the clicked button as active until the drawing is complete
      deactivateButtons();

      const target = ev.target as HTMLElement;
      target.classList.add('sketch-button-selected');

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
        // Workaround for activeComponent not existing on the SketchViewModel type.
        const tempSketchVM = localSketchVM as any;
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
    };

    let featureToolContent = (
      <FeatureTool
        sketchVM={localSketchVM}
        selectedGraphicsIds={selectedGraphicsIds}
        onClick={handleClick}
      />
    );
    ReactDOM.render(featureToolContent, featureTool);
  }, [
    featureTool,
    sketchVM,
    aoiSketchVM,
    sketchLayer,
    aoiSketchLayer,
    selectedGraphicsIds,
    edits,
    setEdits,
    targetSketchVM,
    lastTargetSketchVM,
  ]);

  // Gets the graphics to be highlighted and highlights them
  const [
    nextHighlight,
    setNextHighlight,
  ] = React.useState<__esri.Handle | null>(null);
  const [
    highlightGraphics,
    setHighlightGraphics, //
  ] = React.useState<__esri.Graphic[]>([]);
  React.useEffect(() => {
    if (
      !sketchLayer?.sketchLayer ||
      sketchLayer.sketchLayer.type !== 'graphics'
    ) {
      return;
    }

    // Get any graphics that have a contam value
    const highlightGraphics: __esri.Graphic[] = [];
    sketchLayer.sketchLayer.graphics.forEach((graphic) => {
      if (graphic.attributes.CONTAMVAL) {
        highlightGraphics.push(graphic);
      }
    });
    setHighlightGraphics(highlightGraphics);

    // Highlight the graphics with a contam value
    if (highlightGraphics.length > 0) {
      mapView.whenLayerView(sketchLayer.sketchLayer).then((layerView) => {
        setNextHighlight(layerView.highlight(highlightGraphics));
      });
    } else {
      setNextHighlight(null);
    }
  }, [edits, sketchLayer, mapView]);

  // Remove any old highlights if the highlighted graphics list changed
  const [highlight, setHighlight] = React.useState<__esri.Handle | null>(null);
  const [
    lastHighlightGraphics,
    setLastHighlightGraphics, //
  ] = React.useState<__esri.Graphic[]>([]);
  React.useEffect(() => {
    // exit if the highlightGraphics list is the same
    if (
      JSON.stringify(highlightGraphics) ===
      JSON.stringify(lastHighlightGraphics)
    ) {
      return;
    }

    // remove old highlights
    if (highlight) {
      highlight.remove();
    }

    setLastHighlightGraphics(highlightGraphics);
    setHighlight(nextHighlight);
  }, [highlightGraphics, lastHighlightGraphics, highlight, nextHighlight]);

  return null;
}

export default MapWidgets;
