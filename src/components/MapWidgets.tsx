/** @jsx jsx */

import React from 'react';
import ReactDOM from 'react-dom';
import { jsx, css } from '@emotion/core';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';
// config
import {
  predefinedBoxTypes,
  SampleType,
  sampleAttributes,
} from 'config/sampleAttributes';
import { polygonSymbol } from 'config/symbols';
// utils
import { updateLayerEdits } from 'utils/sketchUtils';
const sponge_SA = 0.254 / 2;
const vac_SA = 0.3048 / 2;
const swab_SA = 0.0508 / 2;

// Makes all sketch buttons no longer active by removing
// the sketch-button-selected class.
function deactivateButtons() {
  const buttons = document.querySelectorAll('.sketch-button');

  for (let i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('sketch-button-selected');
  }
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

const saveButtonStyles = css`
  margin: 5px 0;
`;

// --- components (FeatureTool) ---
type FeatureToolProps = {
  sketchVM: any;
  selectedGraphicsIds: Array<string>;
  onClick: (ev: React.MouseEvent<HTMLDivElement>, type: string) => void;
};

function FeatureTool({
  sketchVM,
  selectedGraphicsIds,
  onClick,
}: FeatureToolProps) {
  // initializes the note and graphicNote whenever the graphic selection changes
  const [graphicNote, setGraphicNote] = React.useState('');
  const [note, setNote] = React.useState('');
  React.useEffect(() => {
    // Reset the note if either no graphics are selected or multiple graphics
    // are selected. The note field only works if one graphic is selected.
    if (selectedGraphicsIds.length !== 1) {
      if (graphicNote) setGraphicNote('');
      if (note) setNote('');
      return;
    }

    // Get the note from the graphics attributes
    if (
      sketchVM &&
      sketchVM.activeComponent &&
      sketchVM.activeComponent.graphics &&
      sketchVM.activeComponent.graphics.length > 0 &&
      sketchVM.activeComponent.graphics[0] &&
      sketchVM.activeComponent.graphics[0].attributes
    ) {
      const newNote = sketchVM.activeComponent.graphics[0].attributes.NOTES;
      if (graphicNote !== newNote) {
        setGraphicNote(newNote);
        setNote(newNote);
      }
    }
  }, [graphicNote, note, sketchVM, selectedGraphicsIds]);

  if (!sketchVM || selectedGraphicsIds.length === 0) return null;

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
            <label htmlFor="graphic-note">Note: </label>
            <br />
            <textarea
              id="graphic-note"
              css={noteStyles}
              value={note}
              onChange={(ev: any) => setNote(ev.target.value)}
            />
          </div>
          <div css={saveButtonContainerStyles}>
            <button
              css={saveButtonStyles}
              disabled={note === graphicNote}
              onClick={() => {
                if (
                  sketchVM.activeComponent &&
                  sketchVM.activeComponent.graphics
                ) {
                  const firstGraphic = sketchVM.activeComponent.graphics[0];
                  firstGraphic.attributes['NOTES'] = note;
                  setGraphicNote(note);
                }
              }}
            >
              Save
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
    selectedLayer,
    sketchVM,
    setSketchVM,
    sketchLayer,
    map,
  } = React.useContext(SketchContext);
  const {
    Graphic,
    Home,
    Locate,
    Polygon,
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

  // Updates the selected layer of the sketchViewModel
  React.useEffect(() => {
    if (!sketchVM || !sketchLayer) return;

    sketchVM.layer = sketchLayer.sketchLayer;
  }, [sketchVM, sketchLayer]);

  // Creates the sketchVM events for placing the graphic on the map
  const [
    sketchEventsInitialized,
    setSketchEventsInitialized, //
  ] = React.useState(false);
  const [updateSketchEvent, setUpdateSketchEvent] = React.useState<any>(null);
  const [
    selectedGraphicsIds,
    setSelectedGraphicsIds, //
  ] = React.useState<Array<string>>([]);
  React.useEffect(() => {
    if (!sketchVM) return;
    if (sketchEventsInitialized) return;

    let nextId = 1;

    sketchVM.on('create', (event: any) => {
      const { graphic } = event;

      // place the graphic on the map when the drawing is complete
      if (event.state === 'complete') {
        // get the button and it's id
        const button = document.querySelector('.sketch-button-selected');
        const id = button && (button.id as SampleType);
        deactivateButtons();

        if (!id) {
          // workaround for an error that said "target" does not exist on
          // type 'SketchViewModelUpdateEvent'.
          const tempEvent = event as any;
          tempEvent.target.cancel();
          return;
        }

        // get the predefined attributes using the id of the clicked button
        const attributes = sampleAttributes[id];
        attributes.OBJECTID = nextId.toString();
        nextId += 1;
        graphic.attributes = attributes;

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
        sketchVM.update(graphic);
        setUpdateSketchEvent(event);

        // re-enable layer popups
        if (map) {
          map.layers.items.forEach((layer: any) => {
            layer.popupEnabled = true;
          });
        }
      }
    });

    sketchVM.on('update', (event) => {
      // the updates have completed add them to the edits variable
      if (event.state === 'complete' || event.state === 'cancel') {
        // fire the update event if event.state is complete.
        if (event.state === 'complete') setUpdateSketchEvent(event);

        // re-enable layer popups
        if (map) {
          map.layers.items.forEach((layer: any) => {
            layer.popupEnabled = true;
          });
        }
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
      //let numSelectedGraphics = 0;
      let selectedGraphicsIds: Array<string> = [];
      if (event.state !== 'cancel' && event.graphics) {
        event.graphics.forEach((graphic) => {
          selectedGraphicsIds.push(graphic.attributes.OBJECTID);
        });
      }
      setSelectedGraphicsIds(selectedGraphicsIds);
    });

    // handles deleting when the delete key is pressed
    // Workaround for an error that said Argument of type '"delete"' is
    // not assignable to parameter of type '"undo"'.
    // This issue looks like the types haven't been updated, because delete
    // is now an option.
    const tempSketchVM = sketchVM as any;
    tempSketchVM.on('delete', (event: any) => {
      setUpdateSketchEvent(event);
    });

    setSketchEventsInitialized(true);
  }, [
    sketchVM,
    map,
    mapView,
    setSketchEventsInitialized,
    Graphic,
    Polygon,
    setEdits,
    sketchEventsInitialized,
  ]);

  // save the updated graphic to the edits data structure for later publishing
  React.useEffect(() => {
    if (!sketchLayer || !updateSketchEvent) return;
    setUpdateSketchEvent(null);

    const type =
      updateSketchEvent.type === 'create' ? 'add' : updateSketchEvent.type;
    const changes =
      type === 'add' ? [updateSketchEvent.graphic] : updateSketchEvent.graphics;

    // make a copy of the edits context variable
    const editsCopy = updateLayerEdits({
      edits,
      layer: sketchLayer,
      type,
      changes,
    });

    // update the edits state
    setEdits(editsCopy);
  }, [edits, setEdits, updateSketchEvent, sketchLayer]);

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
  React.useEffect(() => {
    if (!featureTool || !sketchVM) return;

    // handles the sketch button clicks
    const handleClick = (ev: React.MouseEvent<HTMLElement>, type: string) => {
      if (!sketchVM || !sketchLayer) return;

      // set the clicked button as active until the drawing is complete
      deactivateButtons();

      const target = ev.target as HTMLElement;
      target.classList.add('sketch-button-selected');

      if (type === 'Delete') {
        // Workaround for activeComponent not existing on the SketchViewModel type.
        const tempSketchVM = sketchVM as any;
        if (
          tempSketchVM.activeComponent &&
          tempSketchVM.activeComponent.graphics
        ) {
          // make a copy of the edits context variable
          const editsCopy = updateLayerEdits({
            edits,
            layer: sketchLayer,
            type: 'delete',
            changes: tempSketchVM.activeComponent.graphics,
          });

          setEdits(editsCopy);

          sketchVM.layer.removeMany(tempSketchVM.activeComponent.graphics);
        }
      }
    };

    let featureToolContent = (
      <FeatureTool
        sketchVM={sketchVM}
        selectedGraphicsIds={selectedGraphicsIds}
        onClick={handleClick}
      />
    );
    ReactDOM.render(featureToolContent, featureTool);
  }, [
    featureTool,
    sketchVM,
    sketchLayer,
    selectedGraphicsIds,
    selectedLayer,
    edits,
    setEdits,
  ]);
  return null;
}

export default MapWidgets;
