/** @jsx jsx */

import React from 'react';
import ReactDOM from 'react-dom';
import { jsx, css } from '@emotion/core';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';
// utilities
// import { getFeatureService } from 'utils/arcGisRestUtils';
// config
import { polygonSymbol } from 'config/symbols';

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
  padding: 0 16px;
`;

const toolBarStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  padding-right: 0;
  background-color: #012e51;

  div:last-child {
    margin-left: auto;
    display: flex;
    justify-content: flex-end;
  }
`;

const toolBarButtonStyles = css`
  height: ${toolBarHeight};
  margin-bottom: 0;
  padding: 0.75em 1em;
  color: white;
  background-color: #012e51;
  border-radius: 0;
  line-height: 16px;
  text-decoration-line: none;
  font-weight: bold;

  &:hover {
    background-color: #012e51;
  }

  &:visited {
    color: white;
  }

  &.tots-button-selected {
    background-color: #004f83;
    border-top: 2px solid #8491a1;
  }
`;

const legendStyles = (legendVisible: boolean) => {
  return css`
    display: ${legendVisible ? 'block' : 'none'} !important;
    width: 310px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    padding: 0.5em;
    z-index: 99;
    max-height: 50%;
    overflow: auto;

    /* Float the menu over the map */
    position: absolute;
    right: 60px;
  `;
};

const graphicsIconStyles = css`
  opacity: 1;
`;

// --- components (Toolbar) ---
function Toolbar() {
  const {
    BasemapGallery,
    IdentityManager,
    //Legend,
    LayerList,
    OAuthInfo,
    Portal,
    PortalBasemapsSource,
  } = useEsriModulesContext();
  const {
    edits,
    setEdits,
    // layers,
    map,
    mapView,
    // setLayers,
    // setFeatureService,
    // setFeatureServiceUrl,
    portalLayers,
    setPortalLayers,
    referenceLayers,
    setReferenceLayers,
    urlLayers,
    setUrlLayers,
  } = React.useContext(SketchContext);
  const {
    signedIn,
    setSignedIn,
    oAuthInfo,
    setOAuthInfo,
    setPortal,
    // portal,
  } = React.useContext(AuthenticationContext);

  // Initialize the OAuth
  React.useEffect(() => {
    if (oAuthInfo) return;

    const info = new OAuthInfo({
      // Swap this ID out with registered application ID
      // TODO: We need to get the app id that will be using for development and or production
      appId: 'q244Lb8gDRgWQ8hM',
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

  /* // Get data associated with the portal
  const [hasPortalData, setHasPortalData] = React.useState(false);
  React.useEffect(() => {
    if (!portal || hasPortalData) return;
    setHasPortalData(true);

    // get/create the feature service
    getFeatureService(portal)
      .then((service: any) => {
        const { portalService, featureService } = service;

        setFeatureService(featureService);
        setFeatureServiceUrl(portalService.url);

        // // build the layers object
        // const newLayers: any[] = [];
        // featureService.layers.forEach((layer: any) => {
        //   // if this layer isn't in edits then add it
        //   const hasEdit = edits.edits.findIndex((edit: any) =>
        //     edit.id === layer.id
        //   ) !== -1;

        //   if(!hasEdit) {
        //     newLayers.push({
        //       ...layer,
        //       label: layer.name,
        //       value: `${layer.id} - ${layer.name}`,
        //       queried: false,
        //       sketchLayer: null,
        //     });
        //   }
        // });
        // setLayers([...layers, ...newLayers]);
      })
      .catch((err: any) => console.error(err));

    // get the layers on the feature service
  }, [
    portal,
    setFeatureService,
    setFeatureServiceUrl,
    edits,
    layers,
    setLayers,
    hasPortalData,
  ]); */

  // Create the layer list toolbar widget
  const [legendVisible, setLegendVisible] = React.useState(false);
  const [legendInitialized, setLegendInitialized] = React.useState(false);
  const [layerToRemove, setLayerToRemove] = React.useState<any>(null);
  React.useEffect(() => {
    if (!mapView || legendInitialized) return;

    // create the layer list using the same styles and structure as the
    // esri version.
    const layerList = new LayerList({
      view: mapView,
      container: 'legend-container',
      listItemCreatedFunction: function(event: any) {
        const item = event.item;
        // create a custom legend item for graphics layers
        if (item.layer.type === 'graphics') {
          const container = document.createElement('div');
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
                                  fill={`rgba(${polygonSymbol.color.toString()})`}
                                  fillRule="evenodd"
                                  stroke={`rgba(${polygonSymbol.outline.color.toString()})`}
                                  strokeWidth={polygonSymbol.outline.width}
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
          ReactDOM.render(content, container);
          item.panel = {
            content: container,
            className: 'esri-icon-layer-list',
            open: true,
          };
        } else if (item.layer.type !== 'group') {
          // don't show legend twice
          item.panel = {
            content: 'legend',
            open: true,
          };
        }

        // add a delete button for each layer
        item.actionsSections = [
          [
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
    layerList.on('trigger-action', (event: any) => {
      const id = event.action.id;

      if (id === 'delete-layer') {
        // remove the layer from the map
        setLayerToRemove(event.item.layer);
      }
    });

    setLegendInitialized(true);
  }, [LayerList, mapView, legendInitialized]);

  // Deletes layers from the map and session variables when the delete button is clicked
  React.useEffect(() => {
    if (!map || !layerToRemove) return;

    setLayerToRemove(null);

    // remove it from the map
    map.remove(layerToRemove);

    // remove the layer from the session variable
    if (layerToRemove.type === 'graphics') {
      // graphics layers are always put in edits
      setEdits({
        count: edits.count + 1,
        edits: edits.edits.filter(
          (layer: any) => layer.layerId !== layerToRemove.id,
        ),
      });
    } else if (layerToRemove.portalItem && layerToRemove.portalItem.id) {
      // this one was added via search panel, remove it from portalLayers
      setPortalLayers(
        portalLayers.filter((id: any) => id !== layerToRemove.portalItem.id),
      );
    } else if (layerToRemove.url) {
      // this one was added via url panel, remove it from urlLayers
      setUrlLayers(
        urlLayers.filter((layer: any) => layer.url !== layerToRemove.url),
      );
    } else {
      // everything else should be removed from referenceLayers
      setReferenceLayers(
        referenceLayers.filter(
          (layer: any) => layer.layerId !== layerToRemove.id,
        ),
      );
    }
  }, [
    map,
    layerToRemove,
    edits,
    setEdits,
    portalLayers,
    setPortalLayers,
    referenceLayers,
    setReferenceLayers,
    urlLayers,
    setUrlLayers,
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

    new BasemapGallery({
      container: 'basemap-container',
      view: mapView,
      source: basemapsSource,
    });
    setBasemapInitialized(true);
  }, [BasemapGallery, PortalBasemapsSource, mapView, basemapInitialized]);

  return (
    <div css={toolBarStyles}>
      <h4 css={toolBarTitle}>Trade-off Tool for Sampling (TOTS)</h4>
      <div>
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
          <div css={legendStyles(basemapVisible)} id="basemap-container" />
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
          href={'https://www.epa.gov/home/forms/contact-epa'}
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
