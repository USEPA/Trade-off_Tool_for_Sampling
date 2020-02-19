/** @jsx jsx */

import React from 'react';
import ReactDOM from 'react-dom';
import { jsx, css } from '@emotion/core';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
// config
import { SampleType, sampleAttributes } from 'config/sampleAttributes';

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
  'Navigation',
  'Streets (Night)',
  'Oceans',
  'National Geographic Style Map',
  'OpenStreetMap',
  'Charted Territory Map',
  'Community Map',
  'Navigation (Dark Mode)',
  'Newspaper Map',
  'Human Geography Map',
  'Human Geography Dark Map',
  'Modern Antique Map',
  'Mid-Century Map',
  'Nova Map',
  'Colored Pencil Map',
  'Firefly Imagery Hybrid',
  'USA Topo Maps',
];

function deactivateButtons() {
  const buttons = document.querySelectorAll('.sketch-button');

  for (let i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('sketch-button-selected');
  }
}

const containerStyles = css`
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

const buttonStyles = css`
  display: table-cell;
  vertical-align: middle;
  height: 32px;
  width: 32px;
  background-color: white;
  text-align: center;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: #f0f0f0;
  }
`;

type SketchToolProps = {
  sketchVM: __esri.SketchViewModel;
  onClick: (ev: React.MouseEvent<HTMLDivElement>, type: string) => void;
};

type ButtonProps = {
  type: string;
  label: React.ReactNode;
  initiallyHidden?: boolean;
};

function SketchTool({ sketchVM, onClick }: SketchToolProps) {
  function Button({ type, label, initiallyHidden = false }: ButtonProps) {
    return (
      <div
        id={type}
        title={type}
        className={initiallyHidden ? 'sketch-button-hidden' : 'sketch-button'}
        onClick={(ev) => onClick(ev, type)}
        css={buttonStyles}
      >
        {label}
      </div>
    );
  }

  if (!sketchVM) return null;

  return (
    <div css={containerStyles}>
      <Button
        type="Delete"
        label={<i className="fas fa-trash-alt" />}
        initiallyHidden={true}
      />
      <Button type="Sponge" label="Sp" />
      <Button type="Micro Vac" label="M" />
      <Button type="Wet Vac" label="W" />
      <Button type="Robot" label="R" />
      <Button type="Aggressive Air" label="A" />
      <Button type="Swab" label="Sw" />
      <Button type="Delete All" label={<i className="fas fa-window-close" />} />
    </div>
  );
}

type Props = {
  mapView: __esri.MapView;
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
  } = useEsriModulesContext();

  // add the search widget to the map
  const [
    searchWidget,
    setSearchWidget,
  ] = React.useState<__esri.widgetsSearch | null>(null);

  React.useEffect(() => {
    if (searchWidget) return;

    const widget = new Search({ view: mapView });

    mapView.ui.add(widget, { position: 'top-left', index: 0 });

    setSearchWidget(widget);
  }, [mapView, Search, searchWidget]);

  // add the home widget to the map
  const [homeWidget, setHomeWidget] = React.useState<__esri.Home | null>(null);

  React.useEffect(() => {
    if (homeWidget) return;

    const widget = new Home({ view: mapView });

    mapView.ui.add(widget, { position: 'top-left', index: 2 });

    setHomeWidget(widget);
  }, [mapView, Home, homeWidget]);

  // add the basemap/layer list widget to the map
  const [
    basemapWidget,
    setBasemapWidget, //
  ] = React.useState<__esri.Expand | null>(null);

  React.useEffect(() => {
    if (basemapWidget) return;

    const basemapsSource = new PortalBasemapsSource({
      filterFunction: (basemap: __esri.Basemap) => {
        return basemapNames.indexOf(basemap.portalItem.title) !== -1;
      },
      updateBasemapsCallback: (basemaps: __esri.Collection<__esri.Basemap>) => {
        // sort the basemaps based on the ordering of basemapNames
        return basemaps.sort((a, b) => {
          return (
            basemapNames.indexOf(a.portalItem.title) -
            basemapNames.indexOf(b.portalItem.title)
          );
        });
      },
    });

    const container = document.createElement('div');

    new BasemapGallery({
      container,
      view: mapView,
      source: basemapsSource,
    });

    const widget = new Expand({
      expandIconClass: 'esri-icon-basemap',
      view: mapView,
      mode: 'floating',
      autoCollapse: true,
      content: container,
    });

    mapView.ui.add(widget, { position: 'top-right', index: 0 });

    setBasemapWidget(widget);
  }, [mapView, PortalBasemapsSource, BasemapGallery, Expand, basemapWidget]);

  // Get the graphics layer for drawing on
  const [
    sketchLayer,
    setSketchLayer, //
  ] = React.useState<__esri.Layer | null>(null);

  React.useEffect(() => {
    if (sketchLayer) return;

    mapView.map.layers.forEach((layer) => {
      if (layer.id === 'sketchLayer') setSketchLayer(layer);
    });
  }, [mapView, sketchLayer]);

  // Create the sketch view model for handling the drawing
  const [
    sketchVM,
    setSketchVM, //
  ] = React.useState<__esri.SketchViewModel | null>(null);

  React.useEffect(() => {
    if (!sketchLayer) return;
    if (sketchVM) return;

    // symbol used for polygons and points. Points are converted to polygons
    const polygonSymbol = {
      type: 'simple-fill',
      color: [150, 150, 150, 0.2],
      outline: {
        color: [50, 50, 50],
        width: 2,
      },
    };

    const svm = new SketchViewModel({
      layer: sketchLayer,
      view: mapView,
      polygonSymbol,
      pointSymbol: polygonSymbol,
    });

    setSketchVM(svm);
  }, [mapView, SketchViewModel, sketchLayer, sketchVM]);

  // Creates the sketchVM events for placing the graphic on the map
  const [
    sketchEventsInitialized,
    setSketchEventsInitialized, //
  ] = React.useState(false);

  React.useEffect(() => {
    if (!sketchVM) return;
    if (sketchEventsInitialized) return;

    sketchVM.on('create', (event) => {
      const { graphic } = event;

      // place the graphic on the map when the drawing is complete
      if (event.state === 'complete') {
        // get the button and it's id
        const button = document.querySelector('.sketch-button-selected');
        const id = button && (button.id as SampleType);

        deactivateButtons();

        graphic.attributes = id && sampleAttributes[id];

        // predefined boxes
        if (id === 'Sponge' || id === 'Micro Vac' || id === 'Swab') {
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
      }
    });

    sketchVM.on('update', (event) => {
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

    setSketchEventsInitialized(true);
  }, [mapView, Graphic, Polygon, sketchVM, sketchEventsInitialized]);

  // Creates and adds the custom sketch widget to the map
  const [
    sketchTool,
    setSketchTool, //
  ] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!sketchVM) return;
    if (sketchTool) return;

    // handles the sketch button clicks
    const handleClick = (ev: React.MouseEvent<HTMLElement>, type: string) => {
      if (!sketchVM) return;

      // set the clicked button as active until the drawing is complete
      deactivateButtons();

      const target = ev.target as HTMLElement;
      target.classList.add('sketch-button-selected');

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
        // TODO: activeComponent isn't in JS API docs?
        const svm = sketchVM as any;

        if (svm.activeComponent && svm.activeComponent.graphics) {
          sketchVM.layer.removeMany(svm.activeComponent.graphics);
        }
      }

      if (type === 'Delete All') {
        sketchVM.layer.removeAll();
      }
    };

    // Put the sketch toolbar on the map
    const container = document.createElement('div');

    mapView.ui.add(container, 'bottom-right');

    ReactDOM.render(
      <SketchTool sketchVM={sketchVM} onClick={handleClick} />,
      container,
    );

    setSketchTool(container);
  }, [mapView, sketchTool, sketchVM]);

  return null;
}

export default MapWidgets;
