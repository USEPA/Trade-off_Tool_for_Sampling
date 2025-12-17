/** @jsxImportSource @emotion/react */

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
import { useWindowSize } from '@reach/window-size';
// components
import NavBar from 'components/NavBar';
import Toolbar from 'components/Toolbar';
import SplashScreen from 'components/SplashScreen';
import TestingToolbar from 'components/TestingToolbar';
import Map from 'components/Map';
import { ReactTable } from 'components/ReactTable';
// contexts
import { CalculateContext } from 'contexts/Calculate';
import { DialogContext } from 'contexts/Dialog';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// utilities
import { useSessionStorage } from 'utils/browserStorage';
import {
  getBuildingTableColumns,
  getSampleTableColumns,
} from 'utils/sketchUtils';
import { parseSmallFloat } from 'utils/utils';
// config
import { navPanelWidth } from 'config/appConfig';
import { isDecon } from 'config/navigation';
// types
import { LayerAoiAnalysisEditsType, LayerDeconEditsType } from 'types/Edits';
import { AppType } from 'types/Navigation';

const resizerHeight = 10;
const esrifooterheight = 16;
const expandButtonHeight = 32;
const minMapHeight = 180;
let startY = 0;

const appStyles = (offset: number) => css`
  display: flex;
  flex-direction: column;
  height: calc(100vh - ${offset}px);
  min-height: 675px;
  width: 100%;
`;

const containerStyles = css`
  height: 100%;
  position: relative;
`;

const mapPanelStyles = (tableHeight: number) => css`
  float: right;
  position: relative;
  height: calc(100% - ${tableHeight}px);
  width: calc(100% - ${navPanelWidth});
`;

const mapHeightStyles = css`
  height: 100%;
`;

const floatPanelStyles = ({
  width,
  height,
  left,
  expanded,
  zIndex,
}: {
  width: number;
  height: number;
  left: string;
  expanded: boolean;
  zIndex: number;
}) => {
  return css`
    display: ${expanded ? 'block' : 'none'};
    z-index: ${zIndex};
    position: absolute;
    height: ${height}px;
    bottom: 0;
    left: ${left};
    width: calc(100% - ${width}px);
    pointer-events: none;
    overflow: hidden;
  `;
};

const floatButtonPanelStyles = ({
  width,
  height,
  left,
  expanded,
  zIndex,
}: {
  width: number;
  height: number;
  left: string;
  expanded: boolean;
  zIndex: number;
}) => {
  return css`
    display: flex;
    z-index: ${zIndex};
    position: absolute;
    height: 32px;
    bottom: ${(expanded ? height : 0) + esrifooterheight}px;
    left: ${left};
    width: calc(100% - ${width}px);
    pointer-events: none;
    justify-content: center;
  `;
};

const floatPanelContentStyles = (includeOverflow: boolean = true) => {
  return css`
    float: left;
    position: relative;
    height: 100%;
    ${includeOverflow ? 'overflow: auto;' : ''}
    pointer-events: all;

    /* styles to be overridden */
    width: 100%;
    color: black;
    background-color: white;
  `;
};

const floatPanelScrollContainerStyles = css`
  height: 100%;
`;

const collapsePanelButton = css`
  margin: 0;
  height: ${expandButtonHeight}px;
  width: 64px;
  border-radius: 0;
  background-color: white;
  color: black;
  pointer-events: all;
`;

const resizerContainerStyles = css`
  height: ${resizerHeight}px;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: auto;
  cursor: row-resize;
`;

const resizerButtonStyles = css`
  height: 2px;
  width: 25px;
  margin-top: 4px;
  background: #b0b0b0 none;
`;

const tablePanelHeaderStyles = css`
  height: 30px;
  width: 100%;
  color: #444;
  background-color: #efefef;
  border: 1px solid #afafaf;
  padding: 0;
`;

const sampleTableHeaderStyles = css`
  margin: 0 10px;
  font-weight: bold;
`;

const zoomButtonContainerStyles = css`
  text-align: center;
`;

const zoomButtonStyles = css`
  background-color: transparent;
  color: black;
  margin: 0;
  padding: 0;
  font-size: 16px;
`;

// --- components (NavBar) ---
type Props = {
  appType: AppType;
};

function App({ appType }: Props) {
  const { calculateResults } = useContext(CalculateContext);
  const {
    currentPanel,
    panelExpanded,
    resultsExpanded,
    tablePanelExpanded,
    setTablePanelExpanded,
    tablePanelHeight,
    setTablePanelHeight,
    trainingMode,
  } = useContext(NavigationContext);
  const {
    displayDimensions,
    edits,
    layers,
    mapView,
    sceneView,
    selectedSampleIds,
    setSelectedSampleIds,
    selectedScenario,
  } = useContext(SketchContext);

  useSessionStorage(appType);

  const { height, width } = useWindowSize();

  const [mapDiv, setMapDiv] = useState<HTMLDivElement | null>(null);
  const mapRef = useCallback((node: HTMLDivElement) => {
    if (node === null) return;
    setMapDiv(node);
  }, []);

  // calculate height of div holding actions info
  const [contentHeight, setContentHeight] = useState(0);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  useEffect(() => {
    if (!mapDiv) return;

    // adjust the table height if necessary
    const maxTableHeight =
      contentHeight - esrifooterheight - toolbarHeight - expandButtonHeight;
    if (maxTableHeight > 0 && tablePanelHeight >= maxTableHeight) {
      setTablePanelHeight(maxTableHeight);
    }
  }, [
    width,
    height,
    mapDiv,
    contentHeight,
    tablePanelHeight,
    setTablePanelHeight,
    toolbarHeight,
  ]);

  // calculate height of div holding actions info
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!toolbarRef?.current) return;

    const barHeight = toolbarRef.current.getBoundingClientRect().height;
    if (toolbarHeight !== barHeight) setToolbarHeight(barHeight);
  }, [width, height, toolbarRef, toolbarHeight]);

  const [
    sizeCheckInitialized,
    setSizeCheckInitialized, //
  ] = useState(false);
  const { setOptions } = useContext(DialogContext);
  useEffect(() => {
    if (sizeCheckInitialized) return;

    if (width < 1024 || height < 600) {
      setOptions({
        title: '',
        ariaLabel: 'Small Screen Warning',
        description:
          'This site contains data uploading and map editing features best used in a desktop web browser.',
      });
    }

    setSizeCheckInitialized(true);
  }, [width, height, sizeCheckInitialized, setOptions]);

  const [totsDiv, setTotsDiv] = useState<HTMLDivElement | null>(null);
  const totsRef = useCallback((node: HTMLDivElement) => {
    if (node === null) return;
    setTotsDiv(node);
  }, []);

  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!totsDiv) return;

    const offsetTop = totsDiv.offsetTop;
    const clientHeight = totsDiv.clientHeight;
    if (contentHeight !== clientHeight) setContentHeight(clientHeight);
    if (offset !== offsetTop) setOffset(offsetTop);
  }, [contentHeight, height, offset, totsDiv, width]);

  // count the number of samples
  const tableData: any[] = [];
  if (isDecon()) {
    if (selectedScenario && selectedScenario.type === 'scenario-decon') {
      const aoiLayersProcessed: string[] = [];
      selectedScenario.linkedLayerIds.forEach((layerId) => {
        const deconLayer = edits.edits.find(
          (l) => l.type === 'layer-decon' && l.layerId === layerId,
        ) as LayerDeconEditsType | undefined;
        const layer = edits.edits.find(
          (l) =>
            l.type === 'layer-aoi-analysis' &&
            l.layerId === deconLayer?.analysisLayerId,
        ) as LayerAoiAnalysisEditsType | undefined;
        if (!layer) return;

        const aoiAssessed = layer.layers.find(
          (l) => l.layerType === 'AOI Assessed',
        );
        const aoiAssessedLayer = layers.find(
          (l) =>
            l.layerType === 'AOI Assessed' &&
            l.layerId === aoiAssessed?.layerId,
        );
        if (!aoiAssessedLayer) return;
        if (aoiLayersProcessed.includes(aoiAssessedLayer.layerId)) return;

        aoiLayersProcessed.push(aoiAssessedLayer.layerId);
        (aoiAssessedLayer.sketchLayer as __esri.GraphicsLayer).graphics.forEach(
          (building) => {
            tableData.push({
              graphic: building,
              ...building.attributes,
              layerName:
                aoiAssessedLayer.parentLayer?.title ?? aoiAssessedLayer.label,
              H_ADJ_ELEV:
                parseSmallFloat(
                  building.attributes.H_ADJ_ELEV,
                  2,
                )?.toLocaleString() ?? '',
              L_ADJ_ELEV:
                parseSmallFloat(
                  building.attributes.L_ADJ_ELEV,
                  2,
                )?.toLocaleString() ?? '',
              HEIGHT:
                parseSmallFloat(
                  building.attributes.HEIGHT,
                  2,
                )?.toLocaleString() ?? '',
              SQMETERS:
                parseSmallFloat(
                  building.attributes.SQMETERS,
                  2,
                )?.toLocaleString() ?? '',
              footprintSqM:
                parseSmallFloat(
                  building.attributes.footprintSqM,
                  2,
                )?.toLocaleString() ?? '',
              floorsSqM:
                parseSmallFloat(
                  building.attributes.floorsSqM,
                  2,
                )?.toLocaleString() ?? '',
              totalSqM:
                parseSmallFloat(
                  building.attributes.totalSqM,
                  2,
                )?.toLocaleString() ?? '',
              extWallsSqM:
                parseSmallFloat(
                  building.attributes.extWallsSqM,
                  2,
                )?.toLocaleString() ?? '',
              intWallsSqM:
                parseSmallFloat(
                  building.attributes.intWallsSqM,
                  2,
                )?.toLocaleString() ?? '',
              extSqM:
                parseSmallFloat(
                  building.attributes.extSqM,
                  2,
                )?.toLocaleString() ?? '',
              intSqM:
                parseSmallFloat(
                  building.attributes.intSqM,
                  2,
                )?.toLocaleString() ?? '',
              roofSqM:
                parseSmallFloat(
                  building.attributes.roofSqM,
                  2,
                )?.toLocaleString() ?? '',
              ceilingsSqM:
                parseSmallFloat(
                  building.attributes.ceilingsSqM,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeCubM:
                parseSmallFloat(
                  building.attributes.extVolumeCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeCubM:
                parseSmallFloat(
                  building.attributes.intVolumeCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeContentsCubM:
                parseSmallFloat(
                  building.attributes.intVolumeContentsCubM,
                  2,
                )?.toLocaleString() ?? '',
              footprintSqFt:
                parseSmallFloat(
                  building.attributes.footprintSqFt,
                  2,
                )?.toLocaleString() ?? '',
              SQFEET:
                parseSmallFloat(
                  building.attributes.SQFEET,
                  2,
                )?.toLocaleString() ?? '',
              heightFt:
                parseSmallFloat(
                  building.attributes.heightFt,
                  2,
                )?.toLocaleString() ?? '',
              floorsSqFt:
                parseSmallFloat(
                  building.attributes.floorsSqFt,
                  2,
                )?.toLocaleString() ?? '',
              totalSqFt:
                parseSmallFloat(
                  building.attributes.totalSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extWallsSqFt:
                parseSmallFloat(
                  building.attributes.extWallsSqFt,
                  2,
                )?.toLocaleString() ?? '',
              intWallsSqFt:
                parseSmallFloat(
                  building.attributes.intWallsSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extSqFt:
                parseSmallFloat(
                  building.attributes.extSqFt,
                  2,
                )?.toLocaleString() ?? '',
              intSqFt:
                parseSmallFloat(
                  building.attributes.intSqFt,
                  2,
                )?.toLocaleString() ?? '',
              roofSqFt:
                parseSmallFloat(
                  building.attributes.roofSqFt,
                  2,
                )?.toLocaleString() ?? '',
              ceilingsSqFt:
                parseSmallFloat(
                  building.attributes.ceilingsSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeCubFt:
                parseSmallFloat(
                  building.attributes.extVolumeCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeContentsCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeContentsCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intBrickSqM:
                parseSmallFloat(
                  building.attributes.intBrickSqM,
                  2,
                )?.toLocaleString() ?? '',
              extBrickSqM:
                parseSmallFloat(
                  building.attributes.extBrickSqM,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeBrickCubM:
                parseSmallFloat(
                  building.attributes.extVolumeBrickCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeBrickCubM:
                parseSmallFloat(
                  building.attributes.intVolumeBrickCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeBrickContentsCubM:
                parseSmallFloat(
                  building.attributes.intVolumeBrickContentsCubM,
                  2,
                )?.toLocaleString() ?? '',
              intConcreteSqM:
                parseSmallFloat(
                  building.attributes.intConcreteSqM,
                  2,
                )?.toLocaleString() ?? '',
              extConcreteSqM:
                parseSmallFloat(
                  building.attributes.extConcreteSqM,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeConcreteCubM:
                parseSmallFloat(
                  building.attributes.extVolumeConcreteCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeConcreteCubM:
                parseSmallFloat(
                  building.attributes.intVolumeConcreteCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeConcreteContentsCubM:
                parseSmallFloat(
                  building.attributes.intVolumeConcreteContentsCubM,
                  2,
                )?.toLocaleString() ?? '',
              intSteelSqM:
                parseSmallFloat(
                  building.attributes.intSteelSqM,
                  2,
                )?.toLocaleString() ?? '',
              extSteelSqM:
                parseSmallFloat(
                  building.attributes.extSteelSqM,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeSteelCubM:
                parseSmallFloat(
                  building.attributes.extVolumeSteelCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeSteelCubM:
                parseSmallFloat(
                  building.attributes.intVolumeSteelCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeSteelContentsCubM:
                parseSmallFloat(
                  building.attributes.intVolumeSteelContentsCubM,
                  2,
                )?.toLocaleString() ?? '',
              intWoodSqM:
                parseSmallFloat(
                  building.attributes.intWoodSqM,
                  2,
                )?.toLocaleString() ?? '',
              extWoodSqM:
                parseSmallFloat(
                  building.attributes.extWoodSqM,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeWoodCubM:
                parseSmallFloat(
                  building.attributes.extVolumeWoodCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeWoodCubM:
                parseSmallFloat(
                  building.attributes.intVolumeWoodCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeWoodContentsCubM:
                parseSmallFloat(
                  building.attributes.intVolumeWoodContentsCubM,
                  2,
                )?.toLocaleString() ?? '',
              intOtherSqM:
                parseSmallFloat(
                  building.attributes.intOtherSqM,
                  2,
                )?.toLocaleString() ?? '',
              extOtherSqM:
                parseSmallFloat(
                  building.attributes.extOtherSqM,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeOtherCubM:
                parseSmallFloat(
                  building.attributes.extVolumeOtherCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeOtherCubM:
                parseSmallFloat(
                  building.attributes.intVolumeOtherCubM,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeOtherContentsCubM:
                parseSmallFloat(
                  building.attributes.intVolumeOtherContentsCubM,
                  2,
                )?.toLocaleString() ?? '',

              intBrickSqFt:
                parseSmallFloat(
                  building.attributes.intBrickSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extBrickSqFt:
                parseSmallFloat(
                  building.attributes.extBrickSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeBrickCubFt:
                parseSmallFloat(
                  building.attributes.extVolumeBrickCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeBrickCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeBrickCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeBrickContentsCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeBrickContentsCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intConcreteSqFt:
                parseSmallFloat(
                  building.attributes.intConcreteSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extConcreteSqFt:
                parseSmallFloat(
                  building.attributes.extConcreteSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeConcreteCubFt:
                parseSmallFloat(
                  building.attributes.extVolumeConcreteCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeConcreteCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeConcreteCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeConcreteContentsCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeConcreteContentsCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intSteelSqFt:
                parseSmallFloat(
                  building.attributes.intSteelSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extSteelSqFt:
                parseSmallFloat(
                  building.attributes.extSteelSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeSteelCubFt:
                parseSmallFloat(
                  building.attributes.extVolumeSteelCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeSteelCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeSteelCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeSteelContentsCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeSteelContentsCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intWoodSqFt:
                parseSmallFloat(
                  building.attributes.intWoodSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extWoodSqFt:
                parseSmallFloat(
                  building.attributes.extWoodSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeWoodCubFt:
                parseSmallFloat(
                  building.attributes.extVolumeWoodCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeWoodCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeWoodCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeWoodContentsCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeWoodContentsCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intOtherSqFt:
                parseSmallFloat(
                  building.attributes.intOtherSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extOtherSqFt:
                parseSmallFloat(
                  building.attributes.extOtherSqFt,
                  2,
                )?.toLocaleString() ?? '',
              extVolumeOtherCubFt:
                parseSmallFloat(
                  building.attributes.extVolumeOtherCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeOtherCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeOtherCubFt,
                  2,
                )?.toLocaleString() ?? '',
              intVolumeOtherContentsCubFt:
                parseSmallFloat(
                  building.attributes.intVolumeOtherContentsCubFt,
                  2,
                )?.toLocaleString() ?? '',
            });
          },
        );
      });
    }
  } else {
    layers.forEach((layer) => {
      if (!layer.sketchLayer || layer.sketchLayer.type !== 'graphics') return;
      if (layer?.parentLayer?.id !== selectedScenario?.layerId) return;
      if (layer.layerType === 'Samples' || layer.layerType === 'VSP') {
        const graphics = layer.sketchLayer.graphics.toArray();
        graphics.sort((a, b) =>
          a.attributes.PERMANENT_IDENTIFIER.localeCompare(
            b.attributes.PERMANENT_IDENTIFIER,
          ),
        );
        graphics.forEach((sample) => {
          tableData.push({
            graphic: sample,
            ...sample.attributes,
          });
        });
      }
    });
  }

  // calculate the width of the table
  let tablePanelWidth = 150;
  if (currentPanel && panelExpanded) tablePanelWidth += 325;
  if (
    resultsExpanded &&
    currentPanel?.value === 'calculate' &&
    calculateResults.panelOpen === true
  ) {
    tablePanelWidth += 500;
  }

  return (
    <div className="tots" ref={totsRef}>
      <SplashScreen />
      <div css={appStyles(offset)}>
        <div css={containerStyles}>
          <div ref={toolbarRef}>
            {window.location.search.includes('devMode=true') && (
              <TestingToolbar />
            )}
            <Toolbar appType={appType} />
          </div>
          <NavBar height={contentHeight - toolbarHeight} appType={appType} />
          <div
            css={mapPanelStyles(
              toolbarHeight + (tablePanelExpanded ? tablePanelHeight : 0),
            )}
            ref={mapRef}
          >
            <div id="tots-map-div" css={mapHeightStyles}>
              {toolbarHeight ? (
                <Map
                  appType={appType}
                  height={
                    contentHeight -
                    (tablePanelExpanded ? tablePanelHeight : 0) -
                    toolbarHeight
                  }
                />
              ) : (
                ''
              )}
            </div>
          </div>
          {tableData.length > 0 && (
            <div
              id="tots-table-button-div"
              css={floatButtonPanelStyles({
                width: tablePanelWidth,
                height: tablePanelHeight,
                left: `${tablePanelWidth}px`,
                expanded: tablePanelExpanded,
                zIndex: 1,
              })}
            >
              <button
                css={collapsePanelButton}
                aria-label={`${
                  tablePanelExpanded ? 'Collapse' : 'Expand'
                } Table Panel`}
                onClick={() => setTablePanelExpanded(!tablePanelExpanded)}
              >
                <i
                  className={
                    tablePanelExpanded
                      ? 'fas fa-chevron-down'
                      : 'fas fa-chevron-up'
                  }
                />
              </button>
            </div>
          )}
          {tablePanelExpanded && (
            <div
              id="tots-table-div"
              css={floatPanelStyles({
                width: tablePanelWidth,
                height: tablePanelHeight,
                left: `${tablePanelWidth}px`,
                expanded: true,
                zIndex: 2,
              })}
            >
              <div css={floatPanelContentStyles(false)}>
                <div
                  css={resizerContainerStyles}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startY = e.clientY;

                    const mapDiv = document.getElementById('tots-map-div'); // adjust height
                    const tableDiv = document.getElementById('tots-table-div'); // adjust height
                    const reactTableElm =
                      document.getElementById('tots-samples-table');
                    const buttonDiv = document.getElementById(
                      'tots-table-button-div',
                    ); // move top

                    let mapHeight = 0;
                    let tableHeight = 0;
                    if (!mapDiv || !tableDiv || !buttonDiv) return;

                    mapHeight = mapDiv.clientHeight;
                    tableHeight = tableDiv.clientHeight;

                    document.onmouseup = () => {
                      /* stop moving when mouse button is released:*/
                      document.onmouseup = null;
                      document.onmousemove = null;

                      // clear the styles set
                      tableDiv.style.height = '';
                      mapDiv.style.height = '';
                      buttonDiv.style.bottom = '';
                    };
                    // call a function whenever the cursor moves:
                    document.onmousemove = (e: MouseEvent) => {
                      e.preventDefault();

                      if (!mapDiv || !tableDiv || !buttonDiv) return;

                      // get size info
                      const panelHeight = contentHeight - toolbarHeight;
                      const mouseOffset = startY - e.clientY;
                      let newMapHeight = mapHeight - mouseOffset;
                      let newTableHeight = tableHeight + mouseOffset;
                      const maxTableHeight = panelHeight - minMapHeight;

                      // prevent map being taller then content box
                      if (newMapHeight + resizerHeight >= contentHeight) {
                        newMapHeight = contentHeight - resizerHeight;
                        newTableHeight = resizerHeight;
                      }

                      // prevent table being taller then content box
                      if (newTableHeight >= maxTableHeight) {
                        newMapHeight = contentHeight - maxTableHeight;
                        newTableHeight = maxTableHeight;
                      }

                      // set the height directly for faster performance
                      mapDiv.style.height = `${newMapHeight}px`;
                      tableDiv.style.height = `${newTableHeight}px`;
                      buttonDiv.style.bottom = `${
                        newTableHeight + esrifooterheight
                      }px`;

                      if (reactTableElm) {
                        reactTableElm.style.height = `${
                          newTableHeight - resizerHeight - 30
                        }px`;
                      }

                      setTablePanelHeight(tableDiv.clientHeight);
                    };
                  }}
                >
                  <div css={resizerButtonStyles}></div>
                </div>
                <div
                  id="tots-attributes-panel-scroll-container"
                  css={floatPanelScrollContainerStyles}
                >
                  <div css={tablePanelHeaderStyles}>
                    <span css={sampleTableHeaderStyles}>
                      {appType === 'decon' ? 'Buildings' : 'Samples'} (Count:{' '}
                      {tableData.length})
                    </span>
                  </div>
                  <div>
                    <ReactTable
                      id="tots-samples-table"
                      data={tableData}
                      striped={true}
                      height={tablePanelHeight - resizerHeight - 30}
                      initialSelectedRowIds={selectedSampleIds}
                      onSelectionChange={(row: any) => {
                        const PERMANENT_IDENTIFIER =
                          row.original.PERMANENT_IDENTIFIER;
                        const DECISIONUNITUUID = row.original.DECISIONUNITUUID;
                        setSelectedSampleIds((selectedSampleIds) => {
                          if (
                            selectedSampleIds.findIndex(
                              (item) =>
                                item.PERMANENT_IDENTIFIER ===
                                PERMANENT_IDENTIFIER,
                            ) !== -1
                          ) {
                            const samples = selectedSampleIds.filter(
                              (item) =>
                                item.PERMANENT_IDENTIFIER !==
                                PERMANENT_IDENTIFIER,
                            );

                            return samples.map((sample) => {
                              return {
                                PERMANENT_IDENTIFIER,
                                DECISIONUNITUUID,
                                selection_method: 'row-click',
                                graphic: sample.graphic,
                              };
                            });
                          }

                          return [
                            // ...selectedSampleIds, // Uncomment this line to allow multiple selections
                            {
                              PERMANENT_IDENTIFIER,
                              DECISIONUNITUUID,
                              selection_method: 'row-click',
                              graphic: row.original.graphic,
                            },
                          ];
                        });
                      }}
                      sortBy={
                        appType === 'decon'
                          ? [
                              {
                                id: 'layerName',
                                desc: false,
                              },
                              {
                                id: 'OCC_CLS',
                                desc: false,
                              },
                              {
                                id: 'PRIM_OCC',
                                desc: false,
                              },
                            ]
                          : [
                              {
                                id: 'DECISIONUNIT',
                                desc: false,
                              },
                              {
                                id: 'TYPE',
                                desc: false,
                              },
                            ]
                      }
                      getColumns={(tableWidth: any) => {
                        const tableColumns =
                          appType === 'decon'
                            ? getBuildingTableColumns({
                                tableWidth,
                                trainingMode,
                              })
                            : getSampleTableColumns({
                                tableWidth,
                                includeContaminationFields: trainingMode,
                              });

                        return [
                          {
                            header: () => <span className="sr-only">Zoom</span>,
                            id: 'zoom-button',
                            size: 30,
                            cell: ({ row }: { row: any }) => (
                              <div css={zoomButtonContainerStyles}>
                                <button
                                  css={zoomButtonStyles}
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    // select the sample
                                    setSelectedSampleIds([
                                      {
                                        PERMANENT_IDENTIFIER:
                                          row.original.PERMANENT_IDENTIFIER,
                                        DECISIONUNITUUID:
                                          row.original.DECISIONUNITUUID,
                                        selection_method: 'row-click',
                                        graphic: row.original.grpahic,
                                      },
                                    ]);

                                    // zoom to the graphic
                                    if (displayDimensions === '2d' && mapView) {
                                      mapView.goTo(row.original.graphic);
                                      mapView.zoom =
                                        appType === 'decon'
                                          ? 16
                                          : mapView.zoom - 1;
                                    } else if (
                                      displayDimensions === '3d' &&
                                      sceneView
                                    ) {
                                      sceneView.goTo(row.original.graphic);
                                    }
                                  }}
                                >
                                  <i className="fas fa-search-plus" />
                                  <span className="sr-only">
                                    Zoom to sample
                                  </span>
                                </button>
                              </div>
                            ),
                          },
                          ...tableColumns,
                        ];
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
