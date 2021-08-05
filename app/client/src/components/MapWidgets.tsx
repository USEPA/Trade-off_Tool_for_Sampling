/** @jsxImportSource @emotion/react */

import React from 'react';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType, LayerTypeName } from 'types/Layer';
// utils
import { useDynamicPopup, useGeometryTools } from 'utils/hooks';
import {
  convertToPoint,
  generateUUID,
  getCurrentDateTime,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { ScenarioEditsType } from 'types/Edits';

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
  const eventLayer = type === 'delete' ? event.target?.layer : changes[0].layer;

  // look up the layer for this event
  let updateLayer: LayerType | null = null;
  let updateLayerIndex = -1;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (
      (eventLayer && layer.layerId === eventLayer.id) ||
      (!eventLayer && layer.layerId === changes[0].attributes?.DECISIONUNITUUID)
    ) {
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

// --- components (MapWidgets) ---
type Props = {
  mapView: __esri.MapView;
};

function MapWidgets({ mapView }: Props) {
  const { currentPanel, trainingMode, getTrainingMode } = React.useContext(
    NavigationContext,
  );
  const {
    defaultSymbols,
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
    setSelectedScenario,
    showAsPoints,
    layers,
    setLayers,
    map,
  } = React.useContext(SketchContext);
  const {
    Graphic,
    Handles,
    Home,
    Locate,
    PopupTemplate,
    ScaleBar,
    SketchViewModel,
  } = useEsriModulesContext();
  const { createBuffer, loadedProjection } = useGeometryTools();
  const getPopupTemplate = useDynamicPopup();

  // Creates and adds the home widget to the map.
  // Also moves the zoom widget to the top-right
  React.useEffect(() => {
    if (!mapView || !setHomeWidget || homeWidget) return;

    const widget = new Home({ view: mapView });

    mapView.ui.add(widget, { position: 'top-right', index: 1 });
    mapView.ui.move('zoom', 'top-right');

    setHomeWidget(widget);
  }, [mapView, Home, homeWidget, setHomeWidget]);

  // Creates and adds the scale bar widget to the map
  const [scaleBar, setScaleBar] = React.useState<__esri.ScaleBar | null>(null);
  React.useEffect(() => {
    if (!mapView || scaleBar) return;

    const newScaleBar = new ScaleBar({
      view: mapView,
      unit: 'dual',
    });
    mapView.ui.add(newScaleBar, { position: 'bottom-right', index: 1 });
    setScaleBar(newScaleBar);
  }, [ScaleBar, mapView, scaleBar]);

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
      polygonSymbol: defaultSymbols.symbols['Samples'],
      pointSymbol: defaultSymbols.symbols['Samples'],
    });

    const tempSvm = svm as any;
    const tempWindow = window as any;
    tempWindow.sampleSketchVmInternalLayerId =
      tempSvm._internalGraphicsLayer.id;

    setSketchVM(svm);
  }, [
    SketchViewModel,
    defaultSymbols,
    mapView,
    sketchVM,
    setSketchVM,
    sketchLayer,
  ]);

  // Creates the SketchViewModel
  React.useEffect(() => {
    if (!aoiSketchLayer) return;
    if (aoiSketchVM) return;
    const svm = new SketchViewModel({
      layer: aoiSketchLayer.sketchLayer,
      view: mapView,
      polygonSymbol: defaultSymbols.symbols['Area of Interest'],
      pointSymbol: defaultSymbols.symbols['Area of Interest'],
    });

    const tempSvm = svm as any;
    const tempWindow = window as any;
    tempWindow.aoiSketchVmInternalLayerId = tempSvm._internalGraphicsLayer.id;

    setAoiSketchVM(svm);
  }, [
    SketchViewModel,
    defaultSymbols,
    mapView,
    aoiSketchVM,
    setAoiSketchVM,
    aoiSketchLayer,
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
  }, [currentPanel, defaultSymbols, sketchVM, sketchLayer]);

  // Updates the selected layer of the aoiSketchViewModel
  React.useEffect(() => {
    if (!aoiSketchVM) return;

    if (
      currentPanel?.value === 'locateSamples' &&
      aoiSketchLayer?.sketchLayer?.type === 'graphics'
    ) {
      aoiSketchVM.layer = aoiSketchLayer.sketchLayer;

      aoiSketchVM.polygonSymbol = defaultSymbols.symbols[
        'Area of Interest'
      ] as any;
      aoiSketchVM.pointSymbol = defaultSymbols.symbols[
        'Area of Interest'
      ] as any;
    } else {
      // disable the sketch vm for any panel other than locateSamples
      aoiSketchVM.layer = (null as unknown) as __esri.GraphicsLayer;
    }
  }, [currentPanel, defaultSymbols, aoiSketchVM, aoiSketchLayer]);

  // Creates the sketchVM events for placing the graphic on the map
  const setupEvents = React.useCallback(
    (
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
            sketchViewModel.cancel();
            return;
          }

          // get the predefined attributes using the id of the clicked button
          const uuid = generateUUID();
          let layerType: LayerTypeName = 'Samples';
          if (id === 'sampling-mask') {
            layerType = 'Sampling Mask';
            graphic.attributes = {
              DECISIONUNITUUID: graphic.layer.id,
              DECISIONUNIT: graphic.layer.title,
              DECISIONUNITSORT: 0,
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              OBJECTID: -1,
              TYPE: layerType,
            };
          } else {
            graphic.attributes = {
              ...(window as any).totsSampleAttributes[id],
              DECISIONUNITUUID: graphic.layer.id,
              DECISIONUNIT: graphic.layer.title,
              DECISIONUNITSORT: 0,
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              OBJECTID: -1,
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
            createBuffer(graphic);
          }

          if (id !== 'sampling-mask') {
            // find the points version of the layer
            const layerId = graphic.layer.id;
            const pointLayer = (graphic.layer as any).parent.layers.find(
              (layer: any) => `${layerId}-points` === layer.id,
            );
            if (pointLayer) {
              pointLayer.add(convertToPoint(Graphic, graphic));
            }
          }

          // save the graphic
          sketchViewModel.complete();
          sketchEventSetter(event);

          if (id !== 'sampling-mask') {
            // start next graphic
            sketchViewModel.create(graphic.attributes.ShapeType);
          }
        }
      });

      sketchViewModel.on('update', (event) => {
        // dock the popup when sketch tools are active
        sketchViewModel.view.popup.dockEnabled =
          event.state === 'complete' ? false : true;

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

          isActive = false;
        }

        if (event.state === 'active') {
          // find the points version of the layer
          event.graphics.forEach((graphic) => {
            const layerId = graphic.layer?.id;
            const pointLayer: __esri.GraphicsLayer = (graphic.layer as any).parent.layers.find(
              (layer: __esri.GraphicsLayer) => `${layerId}-points` === layer.id,
            );
            if (!pointLayer) return;

            // Find the original point graphic and remove it
            const graphicsToRemove: __esri.Graphic[] = [];
            pointLayer.graphics.forEach((pointVersion) => {
              if (
                graphic.attributes.PERMANENT_IDENTIFIER ===
                pointVersion.attributes.PERMANENT_IDENTIFIER
              ) {
                graphicsToRemove.push(pointVersion);
              }
            });
            pointLayer.removeMany(graphicsToRemove);

            // Re-add the point version of the graphic
            const symbol = graphic.symbol as __esri.SimpleFillSymbol;
            (pointLayer as any).add({
              attributes: graphic.attributes,
              geometry: (graphic.geometry as __esri.Polygon).centroid,
              popupTemplate: graphic.popupTemplate,
              symbol: {
                color: symbol.color,
                outline: symbol.outline,
                type: 'simple-marker',
              },
            });
          });
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
          sketchViewModel.cancel();
        }

        setter(isActive);
      });

      // handles deleting when the delete key is pressed
      // Workaround for an error that said Argument of type '"delete"' is
      // not assignable to parameter of type '"undo"'.
      // This issue looks like the types haven't been updated, because delete
      // is now an option.
      const tempSketchVM = sketchViewModel as any;
      tempSketchVM.on('delete', (event: any) => {
        // find the points version of the layer
        event.graphics.forEach((graphic: any) => {
          const layerId = tempSketchVM.layer?.id;
          const pointLayer: __esri.GraphicsLayer = (tempSketchVM.layer as any).parent.layers.find(
            (layer: __esri.GraphicsLayer) => `${layerId}-points` === layer.id,
          );
          if (!pointLayer) return;

          // Find the original point graphic and remove it
          const graphicsToRemove: __esri.Graphic[] = [];
          pointLayer.graphics.forEach((pointVersion) => {
            if (
              graphic.attributes.PERMANENT_IDENTIFIER ===
              pointVersion.attributes.PERMANENT_IDENTIFIER
            ) {
              graphicsToRemove.push(pointVersion);
            }
          });
          pointLayer.removeMany(graphicsToRemove);
        });

        sketchEventSetter(event);
      });
    },
    [createBuffer, getPopupTemplate, getTrainingMode, Graphic, PopupTemplate],
  );

  // Setup the sketch view model events for the base sketchVM
  const [sketchVMActive, setSketchVMActive] = React.useState(false);
  const [
    sketchEventsInitialized,
    setSketchEventsInitialized, //
  ] = React.useState(false);
  const [updateSketchEvent, setUpdateSketchEvent] = React.useState<any>(null);
  React.useEffect(() => {
    if (!sketchVM || !loadedProjection || sketchEventsInitialized) return;
    setupEvents(sketchVM, setSketchVMActive, setUpdateSketchEvent);

    setSketchEventsInitialized(true);
  }, [
    sketchVM,
    setupEvents,
    sketchEventsInitialized,
    setSketchEventsInitialized,
    loadedProjection,
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
    if (!aoiSketchVM || !loadedProjection || aoiSketchEventsInitialized) return;
    setupEvents(aoiSketchVM, setAoiSketchVMActive, setAoiUpdateSketchEvent);

    setAoiSketchEventsInitialized(true);
  }, [
    aoiSketchVM,
    setupEvents,
    aoiSketchEventsInitialized,
    setAoiSketchEventsInitialized,
    loadedProjection,
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

    const newScenario = editsCopy.edits.find((e) => 
      e.type === 'scenario' && e.layerId === selectedScenario?.layerId
    ) as ScenarioEditsType;
    if(newScenario) setSelectedScenario(newScenario);

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
  }, [edits, setEdits, updateLayer, layers, setLayers, selectedScenario, setSelectedScenario]);

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
      if (layer.layerType === 'Samples' || layer.layerType === 'VSP') {
        if (layer.sketchLayer.type === 'graphics') {
          layer.sketchLayer.graphics.forEach((graphic) => {
            graphic.popupTemplate = popupTemplate;
          });
        }
        if (layer.pointsLayer?.type === 'graphics') {
          layer.pointsLayer.graphics.forEach((graphic) => {
            graphic.popupTemplate = popupTemplate;
          });
        }
      }
    });
  }, [PopupTemplate, getPopupTemplate, trainingMode, layers]);

  // Gets the graphics to be highlighted and highlights them
  const [handles] = React.useState(new Handles());
  React.useEffect(() => {
    if (!map || !selectedScenario || selectedScenario.layers.length === 0) {
      return;
    }

    const group = 'contamination-highlights-group';
    try {
      handles.remove(group);
    } catch (e) {}

    // find the group layer
    const groupLayer = map.findLayerById(
      selectedScenario.layerId,
    ) as __esri.GroupLayer;

    // Get any graphics that have a contam value
    if (trainingMode && groupLayer) {
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
    try {
      handles.remove(group);
    } catch (e) {}

    // Highlights graphics on the provided layer that matches the provided 
    // list of uuids.
    function highlightGraphics(
      layer: __esri.GraphicsLayer | __esri.FeatureLayer | null, 
      uuids: any,
    ) {
      if(!layer) return;

      const itemsToHighlight: __esri.Graphic[] = [];
      const tempLayer = layer as __esri.GraphicsLayer;
      tempLayer.graphics.forEach((graphic) => {
        if (uuids.includes(graphic.attributes.PERMANENT_IDENTIFIER)) {
          itemsToHighlight.push(graphic);
        }
      });
      
      // Highlight the graphics with a contam value
      if (itemsToHighlight.length === 0) return;

      mapView.whenLayerView(tempLayer).then((layerView) => {
        const handle = layerView.highlight(itemsToHighlight);
        handles.add(handle, group);
      });
    }

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

      highlightGraphics(layer.sketchLayer, sampleUuids);
      highlightGraphics(layer.pointsLayer, sampleUuids);
    });
  }, [map, handles, layers, mapView, selectedSampleIds, showAsPoints]);

  return null;
}

export default MapWidgets;
