/** @jsx jsx */

import React from 'react';
import ReactDOM from 'react-dom';
import { jsx, css } from '@emotion/core';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { AuthenticationContext } from 'contexts/Authentication';
import { CalculateContext } from 'contexts/Calculate';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import { findLayerInEdits, getNextScenarioLayer } from 'utils/sketchUtils';
// types
import { ScenarioEditsType, LayerEditsType } from 'types/Edits';
// styles
import { colors } from 'styles';

const toolBarHeight = '40px';

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

// --- styles (Toolbar) ---
const toolBarTitle = css`
  color: white;
  margin: 0;
  padding: 0 16px;
  font-size: 100%;
  font-weight: bold;
  line-height: 1.3;
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
  margin-left: auto;
  display: flex;
  justify-content: flex-end;
`;

const toolBarButtonStyles = css`
  height: ${toolBarHeight};
  margin-bottom: 0;
  padding: 0.75em 1em;
  color: white;
  background-color: ${colors.darkblue()};
  border-radius: 0;
  line-height: 16px;
  text-decoration: none;
  font-weight: bold;

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

const floatContainerStyles = (containerVisible: boolean) => {
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
    right: 60px;
  `;
};

const legendStyles = (legendVisible: boolean) => {
  return css`
    ${floatContainerStyles(legendVisible)}

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

const graphicsIconStyles = css`
  opacity: 1;
`;

// --- components (Toolbar) ---
function Toolbar() {
  const {
    BasemapGallery,
    Collection,
    IdentityManager,
    LayerList,
    Legend,
    OAuthInfo,
    Portal,
    PortalBasemapsSource,
    Slider,
  } = useEsriModulesContext();
  const { setContaminationMap } = React.useContext(CalculateContext);
  const { trainingMode } = React.useContext(NavigationContext);
  const {
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
  } = React.useContext(SketchContext);
  const {
    signedIn,
    setSignedIn,
    oAuthInfo,
    setOAuthInfo,
    portal,
    setPortal,
    userInfo,
    setUserInfo,
  } = React.useContext(AuthenticationContext);

  // Initialize the OAuth
  React.useEffect(() => {
    if (oAuthInfo) return;

    const info = new OAuthInfo({
      // Swap this ID out with registered application ID
      // TODO: We need to get the app id that will be using for development and or production
      appId: process.env.REACT_APP_ARCGIS_APP_ID,
      // Uncomment the next line and update if using your own portal
      // portalUrl: "https://<host>:<port>/arcgis"
      // Uncomment the next line to prevent the user's signed in state from being shared with other apps on the same domain with the same authNamespace value.
      // authNamespace: "portal_oauth_inline",
      popup: false,
    });
    IdentityManager.registerOAuthInfos([info]);

    setOAuthInfo(info);
  }, [IdentityManager, OAuthInfo, setOAuthInfo, oAuthInfo]);

  // Check the user's sign in status
  const [
    hasCheckedSignInStatus,
    setHasCheckedSignInStatus, //
  ] = React.useState(false);
  React.useEffect(() => {
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
  }, [
    IdentityManager,
    oAuthInfo,
    Portal,
    setSignedIn,
    setPortal,
    hasCheckedSignInStatus,
  ]);

  // Get the user information
  React.useEffect(() => {
    if (!portal || userInfo) return;

    const tempPortal: any = portal;
    fetchCheck(
      `${tempPortal.user.url}?f=json&token=${tempPortal.credential.token}`,
    )
      .then((res) => {
        setUserInfo(res);
      })
      .catch((err) => console.error(err));
  }, [portal, userInfo, setUserInfo]);

  // Create the layer list toolbar widget
  const [legendVisible, setLegendVisible] = React.useState(false);
  const [legendInitialized, setLegendInitialized] = React.useState(false);
  const [
    layerToRemove,
    setLayerToRemove, //
  ] = React.useState<__esri.Layer | null>(null);
  React.useEffect(() => {
    if (!mapView || legendInitialized) return;

    // create the layer list using the same styles and structure as the
    // esri version.
    const layerList = new LayerList({
      view: mapView,
      container: 'legend-container',
      listItemCreatedFunction: function (event) {
        const item = event.item;

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

        const container = document.createElement('div');
        container.append(slider.domNode);

        // item is a sub layer, just add the legend
        if (item.parent) {
          if (item.layer.type === 'graphics') {
            const legendContainer = document.createElement('div');
            const content = (
              <div className="esri-legend esri-widget--panel esri-widget">
                <div className="esri-legend__layer">
                  <div className="esri-legend__layer-table esri-legend__layer-table--size-ramp">
                    <div className="esri-legend__layer-body">
                      <div className="esri-legend__layer-row">
                        <div className="esri-legend__layer-cell esri-legend__layer-cell--symbols">
                          <div className="esri-legend__symbol">
                            <div css={graphicsIconStyles}>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="22"
                                height="22"
                              >
                                <defs></defs>
                                <g transform="matrix(1.047619104385376,0,0,1.047619104385376,11.000000953674316,11.000000953674316)">
                                  <path
                                    fill={`rgba(${defaultSymbols.symbols[
                                      'Samples'
                                    ].color.toString()})`}
                                    fillRule="evenodd"
                                    stroke={`rgba(${defaultSymbols.symbols[
                                      'Samples'
                                    ].outline.color.toString()})`}
                                    strokeWidth={
                                      defaultSymbols.symbols['Samples'].outline
                                        .width
                                    }
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray="none"
                                    strokeMiterlimit="4"
                                    d="M -10,-10 L 10,0 L 10,10 L -10,10 L -10,-10 Z"
                                  />
                                </g>
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="esri-legend__layer-cell esri-legend__layer-cell--info"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
            ReactDOM.render(content, legendContainer);
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
          const content = (
            <div className="esri-legend esri-widget--panel esri-widget">
              <div className="esri-legend__layer">
                <div className="esri-legend__layer-table esri-legend__layer-table--size-ramp">
                  <div className="esri-legend__layer-body">
                    <div className="esri-legend__layer-row">
                      <div className="esri-legend__layer-cell esri-legend__layer-cell--symbols">
                        <div className="esri-legend__symbol">
                          <div css={graphicsIconStyles}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="22"
                              height="22"
                            >
                              <defs></defs>
                              <g transform="matrix(1.047619104385376,0,0,1.047619104385376,11.000000953674316,11.000000953674316)">
                                <path
                                  fill={`rgba(${defaultSymbols.symbols[
                                    'Samples'
                                  ].color.toString()})`}
                                  fillRule="evenodd"
                                  stroke={`rgba(${defaultSymbols.symbols[
                                    'Samples'
                                  ].outline.color.toString()})`}
                                  strokeWidth={
                                    defaultSymbols.symbols['Samples'].outline
                                      .width
                                  }
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeDasharray="none"
                                  strokeMiterlimit="4"
                                  d="M -10,-10 L 10,0 L 10,10 L -10,10 L -10,-10 Z"
                                />
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="esri-legend__layer-cell esri-legend__layer-cell--info"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
          ReactDOM.render(content, legendContainer);
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
            view: mapView,
            layerInfos: [
              {
                layer: item.layer,
                title: item.layer.title,
                hideLayers: [],
              },
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
      },
    });

    // add the delete layer button action
    layerList.on('trigger-action', (event) => {
      const id = event.action.id;
      const tempLayer = event.item.layer as any;

      if (id === 'zoom-layer') {
        if (event.item.layer.type === 'graphics') {
          const graphicsLayer = event.item.layer as __esri.GraphicsLayer;
          mapView.goTo(graphicsLayer.graphics);
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

            if (fullExtent) mapView.goTo(fullExtent);
          } else {
            const groupLayer = event.item.layer as __esri.GroupLayer;
            const graphics = new Collection<__esri.Graphic>();
            groupLayer.layers.forEach((layer) => {
              if (layer.type !== 'graphics') return;

              const tempLayer = layer as __esri.GraphicsLayer;
              graphics.addMany(tempLayer.graphics);
            });

            if (graphics.length > 0) mapView.goTo(graphics);
          }
          return;
        }

        const fullExtent = event.item.layer.fullExtent;
        if (fullExtent) mapView.goTo(fullExtent);
      }
      if (id === 'delete-layer') {
        // remove the layer from the map
        setLayerToRemove(event.item.layer);
      }
    });

    setLegendInitialized(true);
  }, [
    Collection,
    LayerList,
    Legend,
    Slider,
    mapView,
    legendInitialized,
    defaultSymbols,
  ]);

  // Deletes layers from the map and session variables when the delete button is clicked
  React.useEffect(() => {
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
  const [basemapVisible, setBasemapVisible] = React.useState(false);
  const [basemapInitialized, setBasemapInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!mapView || basemapInitialized) return;

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

    setBasemapWidget(
      new BasemapGallery({
        container: 'basemap-container',
        view: mapView,
        source: basemapsSource,
      }),
    );
    setBasemapInitialized(true);
  }, [
    BasemapGallery,
    PortalBasemapsSource,
    mapView,
    basemapInitialized,
    setBasemapWidget,
  ]);

  return (
    <div css={toolBarStyles} data-testid="tots-toolbar">
      <h2 css={toolBarTitle}>
        Trade-off Tool for Sampling (TOTS) {trainingMode && ' - TRAINING MODE'}
      </h2>
      <div css={toolBarButtonsStyles}>
        <div>
          <button
            css={toolBarButtonStyles}
            disabled={!legendInitialized}
            className={basemapVisible ? 'tots-button-selected' : ''}
            onClick={(ev) => {
              setBasemapVisible(!basemapVisible);
              setLegendVisible(false);
            }}
          >
            Basemap{' '}
          </button>
          <div
            css={floatContainerStyles(basemapVisible)}
            id="basemap-container"
          />
        </div>
        <div>
          <button
            css={toolBarButtonStyles}
            disabled={!legendInitialized}
            className={legendVisible ? 'tots-button-selected' : ''}
            onClick={(ev) => {
              setLegendVisible(!legendVisible);
              setBasemapVisible(false);
            }}
          >
            Legend{' '}
          </button>
          <div css={legendStyles(legendVisible)} id="legend-container" />
        </div>
        {oAuthInfo && (
          <button
            css={toolBarButtonStyles}
            onClick={(ev) => {
              if (signedIn) {
                IdentityManager.destroyCredentials();
                window.location.reload();
              } else {
                IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`);
              }
            }}
          >
            {signedIn ? 'Logout' : 'Login'}
          </button>
        )}
        <a
          href={
            'https://www.epa.gov/homeland-security-research/forms/contact-us-about-homeland-security-research'
          }
          target="_blank"
          rel="noopener noreferrer"
          css={toolBarButtonStyles}
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}

export default Toolbar;
