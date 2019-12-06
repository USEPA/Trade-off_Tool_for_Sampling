/** @jsx jsx */

import React from 'react';
import ReactDOM from 'react-dom';
import { jsx, css } from '@emotion/core';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
// config
import { typeAttributes } from 'config/typeAttributes';

const sponge_SA = 0.254 / 2;
const vac_SA = 0.3048 / 2;
const swab_SA = 0.0508 / 2;

const basemapNames = [
  'Streets',
  'Imagery',
  'Imagery Hybrid',
  'Topographic',
  'Terrain with Labels',
  'Light Gray Canvas',
  'Dark Gray Canvas',
  // 'Navigation',
  // 'Streets (Night)',
  // 'Oceans',
  // 'National Geographic Style Map',
  // 'OpenStreetMap',
  // 'Charted Territory Map',
  // 'Community Map',
  // 'Navigation (Dark Mode)',
  // 'Newspaper Map',
  // 'Human Geography Map',
  // 'Human Geography Dark Map',
  // 'Modern Antique Map',
  // 'Mid-Century Map',
  // 'Nova Map',
  // 'Colored Pencil Map',
  // 'Firefly Imagery Hybrid',
  // 'USA Topo Maps',
];

function deactivateButtons() {
  const buttons = document.getElementsByClassName('sketch-button');

  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    button.classList.remove('sketch-button-selected');
  }
}

// --- styled components ---

// --- components ---

type Props = {
  mapView: any;
};

function MapWidgets({ mapView }: Props) {
  const {
    BasemapGallery,
    Expand,
    Graphic,
    Home,
    Polygon,
    PortalBasemapsSource,
    Search,
    SketchViewModel,
  } = React.useContext(EsriModulesContext);

  // Creates and adds the home widget to the map
  const [searchWidget, setSearchWidget] = React.useState<any>(null);
  React.useEffect(() => {
    if (!mapView || !Search || searchWidget) return;

    // create the home widget
    const newSearchWidget = new Search({ view: mapView });
    // index of 0 puts this above the search widget above the zoom buttons that are automatically added
    mapView.ui.add(newSearchWidget, { position: 'top-left', index: 0 });
    setSearchWidget(newSearchWidget);
  }, [mapView, Search, searchWidget]);

  // Creates and adds the home widget to the map
  const [homeWidget, setHomeWidget] = React.useState<any>(null);
  React.useEffect(() => {
    if (!mapView || !Home || homeWidget) return;

    // create the home widget
    const newHomeWidget = new Home({ view: mapView });
    mapView.ui.add(newHomeWidget, { position: 'top-left', index: 2 });
    setHomeWidget(newHomeWidget);
  }, [mapView, Home, homeWidget]);

  // Creates and adds the basemap/layer list widget to the map
  const [basemapWidget, setBasemapWidget] = React.useState<any>(null);
  React.useEffect(() => {
    if (
      !mapView ||
      !BasemapGallery ||
      !Expand ||
      !PortalBasemapsSource ||
      basemapWidget
    )
      return;

    // create the basemap/layers widget
    const basemapsSource = new PortalBasemapsSource({
      filterFunction: function(basemap: any) {
        return basemapNames.indexOf(basemap.portalItem.title) !== -1;
      },
      updateBasemapsCallback: function(originalBasemaps: any) {
        // sort the basemaps based on the ordering of basemapNames
        return originalBasemaps.sort(
          (a: any, b: any) =>
            basemapNames.indexOf(a.portalItem.title) -
            basemapNames.indexOf(b.portalItem.title),
        );
      },
    });

    // basemaps
    const basemapContainer = document.createElement('div');
    new BasemapGallery({
      container: basemapContainer,
      view: mapView,
      source: basemapsSource,
    });

    const expandWidget = new Expand({
      expandIconClass: 'esri-icon-layers',
      view: mapView,
      mode: 'floating',
      autoCollapse: true,
      content: basemapContainer,
    });

    mapView.ui.add(expandWidget, { position: 'top-right', index: 0 });
    setBasemapWidget(expandWidget);
  }, [mapView, BasemapGallery, Expand, PortalBasemapsSource, basemapWidget]);

  // Get the graphics layer for drawing on
  const [sketchLayer, setSketchLayer] = React.useState<any>(null);
  React.useEffect(() => {
    if (!mapView || sketchLayer) return;

    mapView.map.layers.forEach((layer: any) => {
      if (layer.id === 'sketchLayer') {
        setSketchLayer(layer);
      }
    });
  }, [mapView, sketchLayer]);

  // Create the sketch view model for handling the drawing
  const [sketchVM, setSketchVM] = React.useState<any>(null);
  React.useEffect(() => {
    if (!mapView || !SketchViewModel || !sketchLayer || sketchVM) return;

    // symbol used for polygons and points. Points are converted to polygons
    const polygonSymbol = {
      type: 'simple-fill',
      color: [150, 150, 150, 0.2],
      outline: {
        color: [50, 50, 50],
        width: 2,
      },
    };

    const newSketchVM = new SketchViewModel({
      layer: sketchLayer,
      view: mapView,
      polygonSymbol,
      pointSymbol: polygonSymbol,
    });
    setSketchVM(newSketchVM);
  }, [mapView, SketchViewModel, sketchLayer, sketchVM]);

  // Creates the sketchVM events for placing the graphic on the map
  const [
    sketchEventsInitialized,
    setsketchEventsInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (
      !mapView ||
      !sketchVM ||
      !Graphic ||
      !Polygon ||
      sketchEventsInitialized
    )
      return;

    sketchVM.on('create', (event: any) => {
      // place the graphic on the map when the drawing is complete
      if (event.state === 'complete') {
        // get the button and it's id
        const button = document.getElementsByClassName(
          'sketch-button-selected',
        )[0];
        const id = button.id;

        deactivateButtons();

        const attributes = typeAttributes[id];

        // user drawn graphics
        if (id === 'Wet Vac' || id === 'Robot' || id === 'Aggressive Air') {
          const graphic = event.graphic;
          graphic.attributes = attributes;
          sketchVM.update(graphic);
        }

        // predefined boxes
        if (id === 'Sponge' || id === 'Micro Vac' || id === 'Swab') {
          let halfWidth = 0;
          if (id === 'Sponge') halfWidth = sponge_SA;
          if (id === 'Micro Vac') halfWidth = vac_SA;
          if (id === 'Swab') halfWidth = swab_SA;

          // create the graphic
          const graphic = event.graphic;
          const oldGeometry = graphic.geometry;

          const geometry = new Polygon({
            spatialReference: oldGeometry.spatialReference,
            centroid: oldGeometry,
            rings: [
              [oldGeometry.x - halfWidth, oldGeometry.y - halfWidth],
              [oldGeometry.x - halfWidth, oldGeometry.y + halfWidth],
              [oldGeometry.x + halfWidth, oldGeometry.y + halfWidth],
              [oldGeometry.x + halfWidth, oldGeometry.y - halfWidth],
            ],
          });

          graphic.geometry = geometry;
          graphic.attributes = attributes;

          // save the graphic
          sketchVM.update(graphic);
        }
      }
    });

    sketchVM.on('update', (event: any) => {
      let numSelectedGraphics = 0;
      if (event.state !== 'cancel' && event.graphics) {
        numSelectedGraphics = event.graphics.length;
      }

      const deleteButton = document.getElementById('Delete');
      if (deleteButton) {
        deleteButton.style.display =
          numSelectedGraphics === 0 ? 'none' : 'table-cell';
      }
    });

    setsketchEventsInitialized(true);
  }, [sketchVM, mapView, sketchEventsInitialized, Graphic, Polygon]);

  // Creates and adds the custom sketch widget to the map
  const [sketchTool, setSketchTool] = React.useState<any>(null);
  React.useEffect(() => {
    if (!mapView || !sketchVM || sketchTool) return;

    // handles the sketch button clicks
    const handleClick = (event: any, type: string) => {
      if (!sketchVM) return;

      // set the clicked button as active until the drawing is complete
      deactivateButtons();
      event.target.classList.add('sketch-button-selected');

      // tell the sketchVM what type of graphic is being drawn on the map.
      // Points will be converted to predefined polygons.
      if (type === 'Sponge') {
        sketchVM.create('point');
      }
      if (type === 'Micro Vac') {
        sketchVM.create('point');
      }
      if (type === 'Wet Vac') {
        sketchVM.create('polygon');
      }
      if (type === 'Robot') {
        sketchVM.create('polygon');
      }
      if (type === 'Aggressive Air') {
        sketchVM.create('polygon');
      }
      if (type === 'Swab') {
        sketchVM.create('point');
      }
      if (type === 'Delete') {
        if (sketchVM.activeComponent && sketchVM.activeComponent.graphics) {
          sketchVM.layer.removeMany(sketchVM.activeComponent.graphics);
        }
      }
      if (type === 'Delete All') {
        sketchVM.layer.removeAll();
      }
    };

    // Put the sketch toolbar on the map
    const sketchToolContainer = document.createElement('div');
    mapView.ui.add(sketchToolContainer, 'bottom-right');
    ReactDOM.render(
      <SketchTool sketchVM={sketchVM} onClick={handleClick} />,
      sketchToolContainer,
    );
    setSketchTool(sketchToolContainer);
  }, [mapView, sketchTool, sketchVM]);

  return <React.Fragment />;
}

const Container = css`
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

const ButtonStyle = css`
  height: 32px;
  width: 32px;
  background-color: white;
  display: table-cell;
  text-align: center;
  vertical-align: middle;

  &:hover {
    background-color: #f0f0f0;
    cursor: pointer;
  }
`;

type SketchToolProps = {
  sketchVM: any;
  onClick: Function;
};

function SketchTool({ sketchVM, onClick = () => {} }: SketchToolProps) {
  if (!sketchVM) return null;

  // builds the sketch button
  const sketchButton = (
    type: string,
    label: any,
    initiallyHidden: boolean = false,
  ) => {
    return (
      <div
        id={type}
        title={type}
        className={initiallyHidden ? 'sketch-button-hidden' : 'sketch-button'}
        css={ButtonStyle}
        onClick={(ev) => onClick(ev, type)}
      >
        {label}
      </div>
    );
  };

  return (
    <div css={Container}>
      {sketchButton('Delete', <i className="fas fa-trash-alt"></i>, true)}
      {sketchButton('Sponge', 'Sp')}
      {sketchButton('Micro Vac', 'M')}
      {sketchButton('Wet Vac', 'W')}
      {sketchButton('Robot', 'R')}
      {sketchButton('Aggressive Air', 'A')}
      {sketchButton('Swab', 'Sw')}
      {sketchButton('Delete All', <i className="fas fa-window-close"></i>)}
    </div>
  );
}

export default MapWidgets;
