/** @jsxImportSource @emotion/react */

import React, { useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { css } from '@emotion/react';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import Collection from '@arcgis/core/core/Collection';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import LayerList from '@arcgis/core/widgets/LayerList';
import Legend from '@arcgis/core/widgets/Legend';
import OAuthInfo from '@arcgis/core/identity/OAuthInfo';
import Portal from '@arcgis/core/portal/Portal';
import PortalBasemapsSource from '@arcgis/core/widgets/BasemapGallery/support/PortalBasemapsSource';
import Slider from '@arcgis/core/widgets/Slider';
// components
import InfoIcon from 'components/InfoIcon';
import Switch from 'components/Switch';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { CalculateContext } from 'contexts/Calculate';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// utils
import { getEnvironmentStringParam } from 'utils/arcGisRestUtils';
import { fetchCheck } from 'utils/fetchUtils';
import { findLayerInEdits, getNextScenarioLayer } from 'utils/sketchUtils';
// types
import { ScenarioEditsType, LayerEditsType } from 'types/Edits';
// styles
import { colors } from 'styles';
import {
  DefaultSymbolsType,
  PolygonSymbol,
  SampleSelectType,
} from 'config/sampleAttributes';
import { LayerType } from 'types/Layer';

const toolBarHeight = '40px';

// Builds the legend item for a layer
function buildLegendListItem(event: any) {
  const item = event.item;
  const view = event.view;

  // create the slider
  const sliderContainer = document.createElement('div');
  const slider: any = new Slider({
    container: sliderContainer,
    min: 0,
    max: 100,
    values: [100],
  });

  // create the slider events, which change the layer's opacity
  function sliderChange(
    event: __esri.SliderThumbChangeEvent | __esri.SliderThumbDragEvent,
  ) {
    item.layer.opacity = event.value / 100;
  }
  slider.on('thumb-change', sliderChange);
  slider.on('thumb-drag', sliderChange);

  // find the layer type (i.e., Samples, VSP, AOI, etc.)
  let subtitle = '';
  const legendItems: LegendRowType[] = [];
  const layer = (window as any).totsLayers?.find(
    (layer: LayerType) =>
      layer.layerId === item?.layer?.id ||
      layer.pointsLayer?.id === item?.layer?.id,
  );

  const isPoints = item.layer.id?.toString().includes('-points');

  const defaultSymbols: DefaultSymbolsType = (window as any).totsDefaultSymbols;

  // build the data for building the legend
  if (
    layer?.layerType === 'Area of Interest' ||
    layer?.layerType === 'Sampling Mask'
  ) {
    legendItems.push({
      value: 'Area of Interest',
      title: 'Area of Interest',
      symbol: defaultSymbols.symbols['Area of Interest'],
      style: null,
    });
  }
  if (layer?.layerType === 'Contamination Map') {
    legendItems.push({
      value: 'Contamination Map',
      title: 'Contamination Map',
      symbol: defaultSymbols.symbols['Contamination Map'],
      style: null,
    });
  }
  if (layer?.layerType === 'Samples' || layer?.layerType === 'VSP') {
    subtitle = 'Sample Type';

    (window as any).totsAllSampleOptions?.forEach(
      (option: SampleSelectType) => {
        const style = isPoints
          ? (window as any).totsSampleAttributes[option.value]?.POINT_STYLE ||
            null
          : null;
        if (defaultSymbols.symbols.hasOwnProperty(option.value)) {
          legendItems.push({
            value: option.value,
            title: option.label,
            symbol: defaultSymbols.symbols[option.value],
            style,
          });
        } else {
          legendItems.push({
            value: 'Samples',
            title: option.label,
            symbol: defaultSymbols.symbols['Samples'],
            style,
          });
        }
      },
    );
  }

  // sort the legend items
  legendItems.sort((a, b) => a.title.localeCompare(b.title));

  const container = document.createElement('div');
  container.append(slider.domNode);
  const content = (
    <div className="esri-legend esri-widget--panel esri-widget">
      <div className="esri-legend__layer">
        <div className="esri-legend__layer-table esri-legend__layer-table--size-ramp">
          {subtitle && (
            <div className="esri-legend__layer-caption">{subtitle}</div>
          )}
          <div className="esri-legend__layer-body">
            {legendItems.map((row: LegendRowType, index) => {
              return (
                <div key={index} className="esri-legend__layer-row">
                  <div className="esri-legend__layer-cell esri-legend__layer-cell--symbols">
                    <div className="esri-legend__symbol">
                      <div
                        css={css`
                          opacity: 1;
                        `}
                      >
                        <ShapeStyle
                          color={row.symbol.color}
                          outline={row.symbol.outline}
                          style={row.style}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="esri-legend__layer-cell esri-legend__layer-cell--info">
                    {row.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // item is a sub layer, just add the legend
  if (item.parent) {
    if (item.layer.type === 'graphics') {
      const legendContainer = document.createElement('div');
      createRoot(legendContainer).render(content);
      container.append(legendContainer);

      item.panel = {
        content: container,
        className: 'esri-icon-layer-list',
        open: true,
      };
    } else {
      item.panel = {
        content: 'legend',
        open: true,
      };
    }
    return;
  }

  // create a custom legend item for graphics layers
  if (item.layer.type === 'graphics') {
    const legendContainer = document.createElement('div');
    createRoot(legendContainer).render(content);
    container.append(legendContainer);

    item.panel = {
      content: container,
      className: 'esri-icon-layer-list',
      open: true,
    };
  } else if (item.layer.type === 'group') {
    item.panel = {
      content: container,
      className: 'esri-icon-layer-list',
      open: true,
    };
  } else {
    const legendContainer = document.createElement('div');
    const legend: any = new Legend({
      container: legendContainer,
      view,
      layerInfos: [
        {
          layer: item.layer,
          title: item.layer.title,
          hideLayers: [],
        } as any,
      ],
    });
    container.append(legend.domNode);

    // don't show legend twice
    item.panel = {
      content: container,
      className: 'esri-icon-layer-list',
      open: true,
    };
  }

  // add a delete button for each layer, but don't add it to sublayers
  item.actionsOpen = true;
  item.actionsSections = [
    [
      {
        title: 'Zoom to Layer',
        className: 'esri-icon-zoom-in-magnifying-glass',
        id: 'zoom-layer',
      },
      {
        title: 'Delete Layer',
        className: 'esri-icon-trash',
        id: 'delete-layer',
      },
    ],
  ];
}

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

type LegendRowType = {
  title: string;
  value: string;
  symbol: PolygonSymbol;
  style: string | null;
};

// --- styles (Toolbar) ---
const toolBarTitle = css`
  color: white;
  margin: 0;
  padding: 0 16px;
  font-size: 100%;
  font-weight: bold;
  line-height: 1.3;
`;

const settingContainerStyles = css`
  margin: 0;
  margin-bottom: 10px;
`;

const switchLabel = css`
  margin-right: 10px;
`;

const switchLabelContainer = css`
  ${settingContainerStyles}
  display: flex;
  align-items: center;
  font-weight: bold;
`;

const infoIconStyles = css`
  margin-left: 10px;
`;

const toolBarStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  padding-right: 0;
  background-color: ${colors.darkblue()};
`;

const toolBarButtonsStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const toolBarButtonStyles = (width?: string) => {
  return css`
    height: ${toolBarHeight};
    margin-bottom: 0;
    padding: 0.75em 1em;
    color: white;
    background-color: ${colors.darkblue()};
    border-radius: 0;
    line-height: 16px;
    text-decoration: none;
    font-weight: bold;
    ${width ? `width: ${width};` : ''}

    &:hover {
      background-color: ${colors.darkblue()};
    }

    &:visited {
      color: white;
    }

    &.tots-button-selected {
      background-color: #004f83;
      border-top: 2px solid #8491a1;
    }
  `;
};

const floatContainerStyles = (containerVisible: boolean, right: string) => {
  return css`
    display: ${containerVisible ? 'block' : 'none'} !important;
    width: 310px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    padding: 0.5em;
    z-index: 50;
    max-height: 50%;
    overflow: auto;

    /* Float the menu over the map */
    position: absolute;
    right: ${right};

    input {
      margin-left: 5px;
      margin-right: 5px;
    }

    h3 {
      padding-top: 10px;
      padding-bottom: 0;
    }
  `;
};

const legendStyles = (legendVisible: boolean) => {
  return css`
    ${floatContainerStyles(legendVisible, '0')}

    /* Hide/show the actions panel */
    .esri-layer-list__item-actions[hidden] {
      display: none !important;
    }

    /* Styles for the opacity slider */
    .esri-slider {
      margin-bottom: 12px;
    }

    .esri-slider__thumb:hover {
      width: 18px;
      height: 18px;
    }
  `;
};

const navIconStyles = css`
  color: white;
  width: 10px;
  margin-left: -2px;
  margin-right: 10px;
`;

// --- components (Toolbar) ---
function Toolbar() {
  const { setContaminationMap } = useContext(CalculateContext);
  const { trainingMode, setTrainingMode } = useContext(NavigationContext);
  const {
    autoZoom,
    setAutoZoom,
    basemapWidget,
    setBasemapWidget,
    defaultSymbols,
    edits,
    setEdits,
    map,
    mapView,
    layers,
    setLayers,
    portalLayers,
    setPortalLayers,
    referenceLayers,
    setReferenceLayers,
    selectedScenario,
    setSelectedScenario,
    urlLayers,
    setUrlLayers,
    sketchLayer,
    setSketchLayer,
    displayGeometryType,
    setDisplayGeometryType,
    userDefinedAttributes,
    sceneView,
    displayDimensions,
    setDisplayDimensions,
  } = useContext(SketchContext);
  const {
    signedIn,
    setSignedIn,
    oAuthInfo,
    setOAuthInfo,
    portal,
    setPortal,
    userInfo,
    setUserInfo,
  } = useContext(AuthenticationContext);

  // Initialize the OAuth
  useEffect(() => {
    if (oAuthInfo) return;

    const info = new OAuthInfo({
      appId: process.env.REACT_APP_ARCGIS_APP_ID,
      popup: false,
    });
    IdentityManager.registerOAuthInfos([info]);

    setOAuthInfo(info);
  }, [setOAuthInfo, oAuthInfo]);

  // Check the user's sign in status
  const [
    hasCheckedSignInStatus,
    setHasCheckedSignInStatus, //
  ] = useState(false);
  useEffect(() => {
    if (!oAuthInfo || hasCheckedSignInStatus) return;

    setHasCheckedSignInStatus(true);
    IdentityManager.checkSignInStatus(`${oAuthInfo.portalUrl}/sharing`)
      .then(() => {
        setSignedIn(true);

        const portal = new Portal();
        portal.authMode = 'immediate';
        portal.load().then(() => {
          setPortal(portal);
        });
      })
      .catch(() => {
        setSignedIn(false);
      });
  }, [oAuthInfo, setSignedIn, setPortal, hasCheckedSignInStatus]);

  // Get the user information
  useEffect(() => {
    if (!portal || userInfo) return;

    const tempPortal: any = portal;
    fetchCheck(
      `${tempPortal.user.url}?f=json${getEnvironmentStringParam()}&token=${
        tempPortal.credential.token
      }`,
    )
      .then((res) => {
        setUserInfo(res);
      })
      .catch((err) => console.error(err));
  }, [portal, userInfo, setUserInfo]);

  const [settingsVisible, setSettingsVisible] = useState(false);

  // Create the layer list toolbar widget
  const [legendVisible, setLegendVisible] = useState(false);
  const [layerList, setLayerList] = useState<__esri.LayerList | null>(null);
  const [
    layerToRemove,
    setLayerToRemove, //
  ] = useState<__esri.Layer | null>(null);
  useEffect(() => {
    if (!mapView || layerList) return;

    // clear out the legend container
    const legendContainer: HTMLElement | null =
      document.getElementById('legend-container');
    if (legendContainer) legendContainer.innerHTML = '';

    // create the layer list using the same styles and structure as the
    // esri version.
    const newLayerList = new LayerList({
      view: mapView,
      container: 'legend-container',
      listItemCreatedFunction: (event) => {
        buildLegendListItem(event);
      },
    });

    // add the delete layer button action
    newLayerList.on('trigger-action', (event) => {
      const id = event.action.id;
      const tempLayer = event.item.layer as any;

      if (id === 'zoom-layer') {
        if (event.item.layer.type === 'graphics') {
          const graphicsLayer = event.item.layer as __esri.GraphicsLayer;
          newLayerList.view.goTo(graphicsLayer.graphics);
          return;
        }
        if (event.item.layer.type === 'group') {
          if (tempLayer.portalItem) {
            const groupLayer = event.item.layer as __esri.GroupLayer;
            let fullExtent: __esri.Extent | null = null;
            groupLayer.layers.forEach((layer) => {
              if (!fullExtent) fullExtent = layer.fullExtent;
              else fullExtent.union(layer.fullExtent);
            });

            if (fullExtent) newLayerList.view.goTo(fullExtent);
          } else {
            const groupLayer = event.item.layer as __esri.GroupLayer;
            const graphics = new Collection<__esri.Graphic>();
            groupLayer.layers.forEach((layer) => {
              if (layer.type !== 'graphics') return;

              const tempLayer = layer as __esri.GraphicsLayer;
              graphics.addMany(tempLayer.graphics);
            });

            if (graphics.length > 0) newLayerList.view.goTo(graphics);
          }
          return;
        }

        const fullExtent = event.item.layer.fullExtent;
        if (fullExtent) newLayerList.view.goTo(fullExtent);
      }
      if (id === 'delete-layer') {
        // remove the layer from the map
        setLayerToRemove(event.item.layer);
      }
    });

    setLayerList(newLayerList);
  }, [defaultSymbols, layerList, mapView]);

  // Rebuild the legend if the sample type definitions are changed
  useEffect(() => {
    if (!layerList) return;

    layerList.listItemCreatedFunction = (event) => {
      buildLegendListItem(event);
    };
  }, [defaultSymbols, layerList, userDefinedAttributes]);

  // Deletes layers from the map and session variables when the delete button is clicked
  useEffect(() => {
    if (!map || !layerToRemove) return;

    setLayerToRemove(null);

    // remove it from the map
    map.remove(layerToRemove);

    // Workaround for layer type specific properties
    const tempLayerToRemove = layerToRemove as any;

    // remove the layer from the session variable
    if (tempLayerToRemove.portalItem && tempLayerToRemove.portalItem.id) {
      // this one was added via search panel, remove it from portalLayers
      setPortalLayers(
        portalLayers.filter(
          (portalLayer) => portalLayer.id !== tempLayerToRemove.portalItem.id,
        ),
      );
    } else if (
      layerToRemove.type === 'graphics' ||
      layerToRemove.type === 'group'
    ) {
      const newEdits = {
        count: edits.count + 1,
        edits: edits.edits.filter(
          (layer) => layer.layerId !== layerToRemove.id,
        ),
      };

      // graphics layers are always put in edits
      setEdits(newEdits);

      // find the layer
      let totsLayerToRemove: ScenarioEditsType | LayerEditsType | null = null;
      const { editsScenario, editsLayer } = findLayerInEdits(
        edits.edits,
        layerToRemove.id,
      );
      if (editsLayer) totsLayerToRemove = editsLayer;
      if (editsScenario) totsLayerToRemove = editsScenario;

      // depending on the layer type, auto select the next available for the select
      // menus and sketch utility
      const layerType = totsLayerToRemove?.layerType;
      if (layerType === 'Samples' || layerType === 'VSP') {
        const { nextScenario, nextLayer } = getNextScenarioLayer(
          newEdits,
          layers,
          null,
          null,
        );
        if (nextScenario) setSelectedScenario(nextScenario);
        if (nextLayer) setSketchLayer(nextLayer);
      }
      if (layerType === 'Contamination Map') {
        const newContamLayer = layers.find(
          (layer) =>
            layer.layerId !== layerToRemove.id &&
            layer.layerType === 'Contamination Map',
        );
        setContaminationMap(newContamLayer ? newContamLayer : null);
      }

      // remove from layers
      setLayers((layers) =>
        layers.filter((layer) => layer.layerId !== layerToRemove.id),
      );

      // also remove the layer from portalLayers if this layer was added
      // from arcgis online
      if (totsLayerToRemove?.addedFrom === 'tots') {
        setPortalLayers(
          portalLayers.filter(
            (portalLayer) => portalLayer.id !== totsLayerToRemove?.portalId,
          ),
        );
      }
    } else {
      // first attempt to remove from url layers
      const newUrlLayers = urlLayers.filter(
        (layer) => layer.layerId !== layerToRemove.id,
      );
      if (newUrlLayers.length < urlLayers.length) {
        setUrlLayers(newUrlLayers);
        return;
      }

      // then attempt to remove from reference layers
      const newRefLayers = referenceLayers.filter(
        (layer: any) => layer.layerId !== layerToRemove.id,
      );
      if (newRefLayers.length < referenceLayers.length) {
        setReferenceLayers(newRefLayers);
        return;
      }
    }
  }, [
    map,
    layerToRemove,
    edits,
    setEdits,
    layers,
    setLayers,
    portalLayers,
    setPortalLayers,
    referenceLayers,
    setReferenceLayers,
    urlLayers,
    setUrlLayers,
    selectedScenario,
    setSelectedScenario,
    sketchLayer,
    setSketchLayer,
    setContaminationMap,
  ]);

  // Create the basemap toolbar widget
  const [basemapVisible, setBasemapVisible] = useState(false);
  const [basemapInitialized, setBasemapInitialized] = useState(false);
  useEffect(() => {
    if (!mapView || basemapInitialized) return;

    const basemapsSource = new PortalBasemapsSource({
      filterFunction: (basemap: __esri.Basemap) => {
        return basemapNames.indexOf(basemap.portalItem.title) !== -1;
      },
      updateBasemapsCallback: (basemaps: __esri.Basemap[]) => {
        // sort the basemaps based on the ordering of basemapNames
        return basemaps.sort((a, b) => {
          return (
            basemapNames.indexOf(a.portalItem.title) -
            basemapNames.indexOf(b.portalItem.title)
          );
        });
      },
    });

    setBasemapWidget(
      new BasemapGallery({
        container: 'basemap-container',
        view: mapView,
        source: basemapsSource,
      }),
    );
    setBasemapInitialized(true);
  }, [mapView, basemapInitialized, setBasemapWidget]);

  // Switches the layer list and basemap widgets between 2D and 3D
  useEffect(() => {
    if (!basemapWidget || !layerList || !mapView || !sceneView) return;

    layerList.view = displayDimensions === '2d' ? mapView : sceneView;
    basemapWidget.view = displayDimensions === '2d' ? mapView : sceneView;
  }, [basemapWidget, displayDimensions, layerList, mapView, sceneView]);

  // Switches between point and polygon representations
  useEffect(() => {
    // Loop through the layers and switch between point/polygon representations
    layers.forEach((layer) => {
      if (
        displayGeometryType === 'points' &&
        layer.pointsLayer &&
        layer.sketchLayer.listMode === 'show'
      ) {
        // make points layers visible
        layer.pointsLayer.listMode = layer.sketchLayer.listMode;
        layer.pointsLayer.visible = layer.sketchLayer.visible;
        layer.sketchLayer.listMode = 'hide';
        layer.sketchLayer.visible = false;
      } else if (
        displayGeometryType === 'polygons' &&
        layer.pointsLayer &&
        layer.pointsLayer.listMode === 'show'
      ) {
        // make polygons layer visible
        layer.sketchLayer.listMode = layer.pointsLayer.listMode;
        layer.sketchLayer.visible = layer.pointsLayer.visible;
        layer.pointsLayer.listMode = 'hide';
        layer.pointsLayer.visible = false;
      }
    });
  }, [displayGeometryType, layers]);

  // const [switchInit, setSwitchInit] = useState(false);
  useEffect(() => {
    if (!mapView || !sceneView) return;

    if (displayDimensions === '2d') {
      if (!sceneView.viewpoint || !sceneView.container || !sceneView.map)
        return;
      mapView.viewpoint = sceneView.viewpoint.clone();
      mapView.container = sceneView.container;
      mapView.map = sceneView.map;

      sceneView.container = null as any;
      sceneView.map = null as any;
    } else {
      if (!mapView.container || !mapView.map) return;
      if (mapView.viewpoint) sceneView.viewpoint = mapView.viewpoint?.clone();
      if (sceneView.camera) sceneView.camera.tilt = 0.5;
      sceneView.container = mapView.container;
      sceneView.map = mapView.map;

      mapView.container = null as any;
      mapView.map = null as any;
    }
  }, [mapView, sceneView, displayDimensions]);

  return (
    <div css={toolBarStyles} data-testid="tots-toolbar">
      <h2 css={toolBarTitle}>
        Trade-off Tool for Sampling (TOTS) {trainingMode && ' - TRAINING MODE'}
      </h2>
      <div css={toolBarButtonsStyles}>
        <div>
          <button
            css={toolBarButtonStyles()}
            className={settingsVisible ? 'tots-button-selected' : ''}
            onClick={(ev) => {
              setSettingsVisible(!settingsVisible);
              setBasemapVisible(false);
              setLegendVisible(false);
            }}
          >
            <i className="esri-icon-settings2" css={navIconStyles} />
            Settings{' '}
          </button>
          <div css={floatContainerStyles(settingsVisible, '223px')}>
            <fieldset css={settingContainerStyles}>
              <legend>
                Dimension
                <InfoIcon
                  cssStyles={infoIconStyles}
                  id="3d-view-switch"
                  tooltip={'3D view. Tooltip placeholder...'}
                  place="bottom"
                  type="info"
                />
              </legend>
              <input
                id="dimension-2d"
                type="radio"
                name="dimension"
                value="2d"
                checked={displayDimensions === '2d'}
                onChange={(ev) => setDisplayDimensions('2d')}
              />
              <label htmlFor="dimension-2d">2D</label>
              <br />

              <input
                id="dimension-3d"
                type="radio"
                name="dimension"
                value="3d"
                checked={displayDimensions === '3d'}
                onChange={(ev) => {
                  setDisplayDimensions('3d');
                  setDisplayGeometryType('points');
                }}
              />
              <label htmlFor="dimension-3d">3D</label>
            </fieldset>

            <fieldset css={settingContainerStyles}>
              <legend>
                Shape
                <InfoIcon
                  cssStyles={infoIconStyles}
                  id="poly-points-switch"
                  tooltip={
                    'The "Polygons" view displays samples on the map as their<br/>exact size which do not scale as you zoom out on the map.<br/>The "Points" view displays the samples as icons that scale<br/>as you zoom in/out and may be useful for viewing many<br/>samples over a large geographic area.'
                  }
                  place="bottom"
                  type="info"
                />
              </legend>
              <input
                id="shape-points"
                type="radio"
                name="shape"
                value="points"
                checked={displayGeometryType === 'points'}
                onChange={(ev) => setDisplayGeometryType('points')}
              />
              <label htmlFor="shape-points">Points</label>
              <br />

              <input
                id="shape-polygons"
                type="radio"
                name="shape"
                value="polygons"
                checked={displayGeometryType === 'polygons'}
                onChange={(ev) => setDisplayGeometryType('polygons')}
              />
              <label htmlFor="shape-polygons">Polygons</label>
            </fieldset>

            <div css={switchLabelContainer}>
              <label htmlFor="training-mode-toggle" css={switchLabel}>
                Training Mode
              </label>
              <Switch
                checked={trainingMode}
                onChange={(checked) => setTrainingMode(checked)}
                ariaLabel="Training Mode"
                onColor="#90ee90"
                onHandleColor="#129c12"
              />
            </div>

            <div css={switchLabelContainer}>
              <label htmlFor="training-mode-toggle" css={switchLabel}>
                Auto Zoom
              </label>
              <Switch
                checked={autoZoom}
                onChange={(checked) => setAutoZoom(checked)}
                ariaLabel="Auto Zoom"
                onColor="#90ee90"
                onHandleColor="#129c12"
              />
            </div>
          </div>
        </div>
        <div>
          <button
            css={toolBarButtonStyles()}
            className={basemapVisible ? 'tots-button-selected' : ''}
            onClick={(ev) => {
              setBasemapVisible(!basemapVisible);
              setLegendVisible(false);
              setSettingsVisible(false);
            }}
          >
            <i className="esri-icon-basemap" css={navIconStyles} />
            Basemap{' '}
          </button>
          <div
            css={floatContainerStyles(basemapVisible, '115px')}
            id="basemap-container"
          />
        </div>
        <div>
          <button
            css={toolBarButtonStyles()}
            className={legendVisible ? 'tots-button-selected' : ''}
            onClick={(ev) => {
              setLegendVisible(!legendVisible);
              setBasemapVisible(false);
              setSettingsVisible(false);
            }}
          >
            <i className="esri-icon-legend" css={navIconStyles} />
            Legend{' '}
          </button>
          <div css={legendStyles(legendVisible)} id="legend-container">
            <div className="esri-layer-list__no-items">
              There are currently no items to display.
            </div>
          </div>
        </div>
        {oAuthInfo && (
          <button
            css={toolBarButtonStyles('100px')}
            onClick={(ev) => {
              if (signedIn) {
                IdentityManager.destroyCredentials();
                window.location.reload();
              } else {
                IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`);
              }
            }}
          >
            <i
              className={`fas fa-sign-${signedIn ? 'out' : 'in'}-alt`}
              css={navIconStyles}
            />
            {signedIn ? 'Logout' : 'Login'}
          </button>
        )}
        <a
          href={
            'https://www.epa.gov/homeland-security-research/forms/contact-us-about-homeland-security-research'
          }
          target="_blank"
          rel="noopener noreferrer"
          css={toolBarButtonStyles()}
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}

type ShapeStyleProps = {
  color: any;
  outline: any;
  style?: string | null;
};

function ShapeStyle({ color, outline, style }: ShapeStyleProps) {
  const path =
    style && style.includes('path|') ? style.replace('path|', '') : '';

  const polygon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">
      <defs></defs>
      <g transform="matrix(1.047619104385376,0,0,1.047619104385376,11.000000953674316,11.000000953674316)">
        <path
          fill={`rgba(${color.toString()})`}
          fillRule="evenodd"
          stroke={`rgba(${outline.color.toString()})`}
          strokeWidth={outline.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeMiterlimit="4"
          d="M -10,-10 L 10,0 L 10,10 L -10,10 L -10,-10 Z"
        />
      </g>
    </svg>
  );

  const custom = (
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19">
      <defs></defs>
      <g transform="matrix(0.8382353186607361,0,0,0.8382353186607361,-1.3970588445663452,-1.3970588445663452)">
        <path
          fill={`rgba(${color.toString()})`}
          fillRule="evenodd"
          stroke={`rgba(${outline.color.toString()})`}
          strokeWidth={outline.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeMiterlimit="4"
          d={path}
        />
      </g>
    </svg>
  );

  const circle = (
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19">
      <defs></defs>
      <g transform="matrix(1,0,0,1,9.5,9.5)">
        <circle
          fill={`rgba(${color.toString()})`}
          fillRule="evenodd"
          stroke={`rgba(${outline.color.toString()})`}
          strokeWidth={outline.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeMiterlimit="4"
          cx="0"
          cy="0"
          r="8"
        />
      </g>
    </svg>
  );

  const cross = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <defs></defs>
      <g transform="matrix(0.8571428656578064,0,0,0.8571428656578064,1.1428571939468384,1.1428571939468384)">
        <path
          fill={`rgba(${color.toString()})`}
          fillRule="evenodd"
          stroke={`rgba(${outline.color.toString()})`}
          strokeWidth={outline.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeMiterlimit="4"
          d="M 0 8 L 16 8 M 8 0 L 8 16"
        />
      </g>
    </svg>
  );

  const diamond = (
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19">
      <defs></defs>
      <g transform="matrix(1,0,0,1,1.5,1.5)">
        <path
          fill={`rgba(${color.toString()})`}
          fillRule="evenodd"
          stroke={`rgba(${outline.color.toString()})`}
          strokeWidth={outline.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeMiterlimit="4"
          d="M 0 8 L 8 0 L 16 8 L 8 16 Z"
        />
      </g>
    </svg>
  );

  const square = (
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19">
      <defs></defs>
      <g transform="matrix(1,0,0,1,1.5,1.5)">
        <path
          fill={`rgba(${color.toString()})`}
          fillRule="evenodd"
          stroke={`rgba(${outline.color.toString()})`}
          strokeWidth={outline.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeMiterlimit="4"
          d="M 0 0 L 16 0 L 16 16 L 0 16 Z"
        />
      </g>
    </svg>
  );

  const triangle = (
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19">
      <defs></defs>
      <g transform="matrix(1,0,0,1,1.5,1.5)">
        <path
          fill={`rgba(${color.toString()})`}
          fillRule="evenodd"
          stroke={`rgba(${outline.color.toString()})`}
          strokeWidth={outline.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeMiterlimit="4"
          d="M 8 0 L 16 16 L 0 16 Z"
        />
      </g>
    </svg>
  );

  const x = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <defs></defs>
      <g transform="matrix(0.8571428656578064,0,0,0.8571428656578064,1.1428571939468384,1.1428571939468384)">
        <path
          fill={`rgba(${color.toString()})`}
          fillRule="evenodd"
          stroke={`rgba(${outline.color.toString()})`}
          strokeWidth={outline.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeMiterlimit="4"
          d="M 0 0 L 16 16 M 16 0 L 0 16"
        />
      </g>
    </svg>
  );

  if (style === 'circle') return circle;
  if (style === 'cross') return cross;
  if (style === 'diamond') return diamond;
  if (style === 'square') return square;
  if (style === 'triangle') return triangle;
  if (style === 'x') return x;
  if (path) return custom;
  return polygon;
}

export default Toolbar;
