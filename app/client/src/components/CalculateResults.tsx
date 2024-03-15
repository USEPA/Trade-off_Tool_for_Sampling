/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from '@emotion/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// components
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { CalculateContext } from 'contexts/Calculate';
import { SketchContext } from 'contexts/Sketch';
// utils
import { getGraphicsArray } from 'utils/sketchUtils';
import LoadingSpinner from './LoadingSpinner';
// styles
import { colors } from 'styles';
// config
import {
  base64FailureMessage,
  downloadSuccessMessage,
  excelFailureMessage,
  screenshotFailureMessage,
} from 'config/errorMessages';

// --- styles (LabelValue) ---
const labelValueStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const valueStyles = css`
  padding-left: 10px;
`;

const resourceTallySeparator = css`
  border-top: none;
  border-bottom: 3px solid ${colors.darkaqua()};
`;

// --- components (LabelValue) ---
type LabelValueProps = {
  label: ReactNode | string;
  value: string | number | undefined | null;
  isMonetary?: boolean;
};

function LabelValue({ label, value, isMonetary = false }: LabelValueProps) {
  let formattedValue = value;
  if (typeof value === 'number') {
    if (isMonetary) formattedValue = Math.round(value).toLocaleString();
    else formattedValue = value.toLocaleString();
  }

  return (
    <div css={labelValueStyles}>
      <span>{label}: </span>
      <span css={valueStyles}>
        <ShowLessMore text={formattedValue} charLimit={20} />
      </span>
    </div>
  );
}

// --- styles (Calculate) ---
const panelContainer = css`
  padding: 20px;
`;

const downloadButtonContainerStyles = css`
  display: flex;
  justify-content: center;
  margin-top: 15px;
`;

type DownloadStatus =
  | 'none'
  | 'fetching'
  | 'success'
  | 'screenshot-failure'
  | 'base64-failure'
  | 'excel-failure';

// --- components (CalculateResults) ---
function CalculateResults() {
  const {
    calculateResults,
    contaminationMap, //
  } = useContext(CalculateContext);
  const {
    aoiSketchLayer,
    displayDimensions,
    layers,
    map,
    mapView,
    sceneView,
    selectedScenario,
  } = useContext(SketchContext);

  const [
    downloadStatus,
    setDownloadStatus, //
  ] = useState<DownloadStatus>('none');

  // take the screenshot
  const [
    screenshotInitialized,
    setScreenshotInitialized, //
  ] = useState(false);
  const [
    screenshot,
    setScreenshot, //
  ] = useState<__esri.Screenshot | null>(null);
  useEffect(() => {
    if (screenshotInitialized) return;
    if (
      !map ||
      !mapView ||
      !sceneView ||
      !selectedScenario ||
      downloadStatus !== 'fetching'
    )
      return;

    const view = displayDimensions === '3d' ? sceneView : mapView;

    // save the current extent
    const initialExtent = view.extent;

    const originalVisiblity: { [key: string]: boolean } = {};
    // store current visiblity settings
    map.layers.forEach((layer) => {
      originalVisiblity[layer.id] = layer.visible;
    });

    // adjust the visiblity
    layers.forEach((layer) => {
      if (layer.parentLayer) {
        layer.parentLayer.visible =
          layer.parentLayer.id === selectedScenario.layerId ? true : false;
        return;
      }

      if (
        layer.layerType === 'Contamination Map' &&
        contaminationMap &&
        layer.layerId === contaminationMap.layerId
      ) {
        // This layer matches the selected contamination map.
        // Do nothing, so the visibility is whatever the user has selected
        return;
      }

      layer.sketchLayer.visible = false;
    });

    // get the sample layers for the selected scenario
    const sampleLayers = layers.filter(
      (layer) =>
        layer.parentLayer && layer.parentLayer.id === selectedScenario.layerId,
    );

    // zoom to the graphics for the active layers
    const zoomGraphics = getGraphicsArray([
      ...sampleLayers,
      contaminationMap?.visible ? contaminationMap : null,
    ]);
    if (zoomGraphics.length > 0) {
      view.goTo(zoomGraphics, { animate: false }).then(() => {
        // allow some time for the layers to load in prior to taking the screenshot
        setTimeout(() => {
          // const mapImageRes = await printTask.execute(params);
          view
            .takeScreenshot()
            .then((data) => {
              setScreenshot(data);

              // zoom back to the initial extent
              view.goTo(initialExtent, { animate: false });

              // set the visiblity back
              map.layers.forEach((layer) => {
                layer.visible = originalVisiblity[layer.id];
              });
            })
            .catch((err) => {
              console.error(err);
              setDownloadStatus('screenshot-failure');

              // zoom back to the initial extent
              view.goTo(initialExtent, { animate: false });

              // set the visiblity back
              map.layers.forEach((layer) => {
                layer.visible = originalVisiblity[layer.id];
              });

              window.logErrorToGa(err);
            });
        }, 3000);
      });
    }

    setScreenshotInitialized(true);
  }, [
    aoiSketchLayer,
    contaminationMap,
    displayDimensions,
    downloadStatus,
    layers,
    map,
    mapView,
    sceneView,
    screenshotInitialized,
    selectedScenario,
  ]);

  // convert the screenshot to base64
  const [base64Initialized, setBase64Initialized] = useState(false);
  const [base64Screenshot, setBase64Screenshot] = useState({
    image: '',
    height: 0,
    width: 0,
  });
  useEffect(() => {
    if (base64Initialized) return;
    if (downloadStatus !== 'fetching' || !screenshot) return;

    let canvas: any = document.createElement('CANVAS');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onerror = function () {
      setDownloadStatus('base64-failure');
    };
    img.oninvalid = function () {
      setDownloadStatus('base64-failure');
    };
    img.onload = function () {
      // draw the img on a canvas
      canvas.height = img.height;
      canvas.width = img.width;
      ctx.drawImage(img, 0, 0);

      // get the data url
      const url = canvas.toDataURL('image/jpeg');
      url
        ? setBase64Screenshot({
            image: url,
            height: img.height,
            width: img.width,
          })
        : setDownloadStatus('base64-failure');

      // Clean up
      canvas = null;
    };
    img.src = screenshot.dataUrl;

    setBase64Initialized(true);
  }, [screenshot, downloadStatus, base64Initialized]);

  // export the excel doc
  useEffect(() => {
    if (
      !selectedScenario ||
      downloadStatus !== 'fetching' ||
      !base64Screenshot.image ||
      calculateResults.status !== 'success' ||
      !calculateResults.data
    ) {
      return;
    }

    const workbook = new ExcelJS.Workbook();

    // create the styles
    const valueColumnWidth = 21.29;
    const defaultFont = { name: 'Calibri', size: 12 };
    const sheetTitleFont = { name: 'Calibri', bold: true, size: 18 };
    const columnTitleAlignment: any = { horizontal: 'center' };
    const columnTitleFont = {
      name: 'Calibri',
      bold: true,
      underline: true,
      size: 12,
    };
    const labelFont = { name: 'Calibri', bold: true, size: 12 };
    const underlinedLabelFont = {
      name: 'Calibri',
      bold: true,
      underline: true,
      size: 12,
    };
    const currencyNumberFormat = '$#,##0.00; ($#,##.00); -';

    // create the sheets
    addSummarySheet();
    addParameterSheet();
    addResultsSheet();
    addSampleSheet();

    // download the file
    workbook.xlsx
      .writeBuffer()
      .then((buffer: any) => {
        saveAs(
          new Blob([buffer]),
          `tots_${selectedScenario?.scenarioName}.xlsx`,
        );
        setDownloadStatus('success');
      })
      .catch((err: any) => {
        console.error(err);
        setDownloadStatus('excel-failure');

        window.logErrorToGa(err);
      });

    // --- functions for creating the content for each sheet ---

    function addSummarySheet() {
      // only here to satisfy typescript
      if (!selectedScenario || !calculateResults.data) return;

      // add the sheet
      const summarySheet = workbook.addWorksheet('Summary');

      // setup column widths
      summarySheet.columns = [
        { width: 39.14 },
        { width: valueColumnWidth },
        { width: 41.14 },
        { width: valueColumnWidth },
        { width: 38 },
        { width: valueColumnWidth },
      ];

      // add the header
      summarySheet.getCell(1, 1).font = sheetTitleFont;
      summarySheet.getCell(1, 1).value =
        'Trade-off Tool for Sampling (TOTS) Summary';
      summarySheet.getCell(2, 1).font = defaultFont;
      summarySheet.getCell(2, 1).value = 'Version: 2.0.0';
      summarySheet.getCell(4, 1).font = underlinedLabelFont;
      summarySheet.getCell(4, 1).value = 'Plan Name';
      summarySheet.getCell(4, 2).font = defaultFont;
      summarySheet.getCell(4, 2).value = selectedScenario.scenarioName;
      summarySheet.getCell(5, 1).font = underlinedLabelFont;
      summarySheet.getCell(5, 1).value = 'Plan Description';
      summarySheet.getCell(5, 2).font = defaultFont;
      summarySheet.getCell(5, 2).value = selectedScenario.scenarioDescription;

      // col 1 & 2
      summarySheet.mergeCells(7, 1, 7, 2);
      summarySheet.getCell(7, 1).alignment = columnTitleAlignment;
      summarySheet.getCell(7, 1).font = columnTitleFont;
      summarySheet.getCell(7, 1).value = 'Sampling Plan';

      summarySheet.getCell(8, 1).font = labelFont;
      summarySheet.getCell(8, 1).value = 'Total Number of User-Defined Samples';
      summarySheet.getCell(8, 2).font = defaultFont;
      summarySheet.getCell(8, 2).value =
        calculateResults.data['Total Number of User-Defined Samples'];

      summarySheet.getCell(9, 1).font = labelFont;
      summarySheet.getCell(9, 1).value = 'Total Number of Samples';
      summarySheet.getCell(9, 2).font = defaultFont;
      summarySheet.getCell(9, 2).value =
        calculateResults.data['Total Number of Samples'];

      summarySheet.getCell(10, 1).font = labelFont;
      summarySheet.getCell(10, 1).value = 'Total Cost';
      summarySheet.getCell(10, 2).font = defaultFont;
      summarySheet.getCell(10, 2).numFmt = currencyNumberFormat;
      summarySheet.getCell(10, 2).value = calculateResults.data['Total Cost'];

      summarySheet.getCell(11, 1).font = labelFont;
      summarySheet.getCell(11, 1).value = 'Total Time (days)';
      summarySheet.getCell(11, 2).font = defaultFont;
      summarySheet.getCell(11, 2).value = calculateResults.data['Total Time'];

      summarySheet.getCell(12, 1).font = labelFont;
      summarySheet.getCell(12, 1).value = 'Limiting Time Factor';
      summarySheet.getCell(12, 2).font = defaultFont;
      summarySheet.getCell(12, 2).value =
        calculateResults.data['Limiting Time Factor'];

      // col 3 & 4
      summarySheet.mergeCells(7, 3, 7, 4);
      summarySheet.getCell(7, 3).alignment = columnTitleAlignment;
      summarySheet.getCell(7, 3).font = columnTitleFont;
      summarySheet.getCell(7, 3).value = 'Sampling Operation';

      summarySheet.getCell(8, 3).font = labelFont;
      summarySheet.getCell(8, 3).value =
        'Total Required Sampling Time (team hrs)';
      summarySheet.getCell(8, 4).font = defaultFont;
      summarySheet.getCell(8, 4).value =
        calculateResults.data['Total Required Sampling Time'];

      summarySheet.getCell(9, 3).font = labelFont;
      summarySheet.getCell(9, 3).value = 'Time to Complete Sampling (days)';
      summarySheet.getCell(9, 4).font = defaultFont;
      summarySheet.getCell(9, 4).value =
        calculateResults.data['Time to Complete Sampling'];

      summarySheet.getCell(10, 3).font = labelFont;
      summarySheet.getCell(10, 3).value = 'Total Sampling Labor Cost';
      summarySheet.getCell(10, 4).font = defaultFont;
      summarySheet.getCell(10, 4).numFmt = currencyNumberFormat;
      summarySheet.getCell(10, 4).value =
        calculateResults.data['Total Sampling Labor Cost'];

      summarySheet.getCell(11, 3).font = labelFont;
      summarySheet.getCell(11, 3).value = 'Total Sampling Material Cost';
      summarySheet.getCell(11, 4).font = defaultFont;
      summarySheet.getCell(11, 4).numFmt = currencyNumberFormat;
      summarySheet.getCell(11, 4).value =
        calculateResults.data['Sampling Material Cost'];

      // col 5 & 6
      summarySheet.mergeCells(7, 5, 7, 6);
      summarySheet.getCell(7, 5).alignment = columnTitleAlignment;
      summarySheet.getCell(7, 5).font = columnTitleFont;
      summarySheet.getCell(7, 5).value = 'Analysis Operation';

      summarySheet.getCell(8, 5).font = labelFont;
      summarySheet.getCell(8, 5).value =
        'Total Required Analysis Time (lab hrs)';
      summarySheet.getCell(8, 6).font = defaultFont;
      summarySheet.getCell(8, 6).value =
        calculateResults.data['Time to Analyze'];

      summarySheet.getCell(9, 5).font = labelFont;
      summarySheet.getCell(9, 5).value = 'Time to Complete Analyses (days)';
      summarySheet.getCell(9, 6).font = defaultFont;
      summarySheet.getCell(9, 6).value =
        calculateResults.data['Time to Complete Analyses'];

      summarySheet.getCell(10, 5).font = labelFont;
      summarySheet.getCell(10, 5).value = 'Total Analysis Labor Cost';
      summarySheet.getCell(10, 6).font = defaultFont;
      summarySheet.getCell(10, 6).numFmt = currencyNumberFormat;
      summarySheet.getCell(10, 6).value =
        calculateResults.data['Analysis Labor Cost'];

      summarySheet.getCell(11, 5).font = labelFont;
      summarySheet.getCell(11, 5).value = 'Total Analysis Material Cost';
      summarySheet.getCell(11, 6).font = defaultFont;
      summarySheet.getCell(11, 6).numFmt = currencyNumberFormat;
      summarySheet.getCell(11, 6).value =
        calculateResults.data['Analysis Material Cost'];

      // add the map screenshot
      const screenshotImageId = workbook.addImage({
        base64: base64Screenshot.image,
        extension: 'jpeg',
      });
      summarySheet.addImage(screenshotImageId, {
        tl: { col: 1, row: 14 },
        ext: { width: base64Screenshot.width, height: base64Screenshot.height },
      });
    }

    function addParameterSheet() {
      // only here to satisfy typescript
      if (!calculateResults.data) return;

      // add the sheet
      const parameterSheet = workbook.addWorksheet('Parameters');

      // setup column widths
      parameterSheet.columns = [{ width: 41.14 }, { width: valueColumnWidth }];

      // add the header
      parameterSheet.getCell(1, 1).font = sheetTitleFont;
      parameterSheet.getCell(1, 1).value = 'Parameters';

      // col 1 & 2
      parameterSheet.getCell(3, 1).font = labelFont;
      parameterSheet.getCell(3, 1).value =
        'Number of Available Teams for Sampling';
      parameterSheet.getCell(3, 2).font = defaultFont;
      parameterSheet.getCell(3, 2).value =
        calculateResults.data[
          'User Specified Number of Available Teams for Sampling'
        ];

      parameterSheet.getCell(4, 1).font = labelFont;
      parameterSheet.getCell(4, 1).value = 'Personnel per Sampling Team';
      parameterSheet.getCell(4, 2).font = defaultFont;
      parameterSheet.getCell(4, 2).value =
        calculateResults.data['User Specified Personnel per Sampling Team'];

      parameterSheet.getCell(5, 1).font = labelFont;
      parameterSheet.getCell(5, 1).value = 'Sampling Team Hours per Shift';
      parameterSheet.getCell(5, 2).font = defaultFont;
      parameterSheet.getCell(5, 2).value =
        calculateResults.data['User Specified Sampling Team Hours per Shift'];

      parameterSheet.getCell(6, 1).font = labelFont;
      parameterSheet.getCell(6, 1).value = 'Sampling Team Shifts per Day';
      parameterSheet.getCell(6, 2).font = defaultFont;
      parameterSheet.getCell(6, 2).value =
        calculateResults.data['User Specified Sampling Team Shifts per Day'];

      parameterSheet.getCell(7, 1).font = labelFont;
      parameterSheet.getCell(7, 1).value = 'Sampling Team Labor Cost';
      parameterSheet.getCell(7, 2).font = defaultFont;
      parameterSheet.getCell(7, 2).numFmt = currencyNumberFormat;
      parameterSheet.getCell(7, 2).value =
        calculateResults.data['User Specified Sampling Team Labor Cost'];

      parameterSheet.getCell(8, 1).font = labelFont;
      parameterSheet.getCell(8, 1).value =
        'Number of Available Labs for Analysis';
      parameterSheet.getCell(8, 2).font = defaultFont;
      parameterSheet.getCell(8, 2).value =
        calculateResults.data[
          'User Specified Number of Available Labs for Analysis'
        ];

      parameterSheet.getCell(9, 1).font = labelFont;
      parameterSheet.getCell(9, 1).value = 'Analysis Lab Hours per Day';
      parameterSheet.getCell(9, 2).font = defaultFont;
      parameterSheet.getCell(9, 2).value =
        calculateResults.data['User Specified Analysis Lab Hours per Day'];

      parameterSheet.getCell(10, 1).value = {
        richText: [
          { font: labelFont, text: 'Surface Area (ft' },
          { font: { ...labelFont, vertAlign: 'superscript' }, text: '2' },
          { font: labelFont, text: ')' },
        ],
      };
      parameterSheet.getCell(10, 2).font = defaultFont;
      parameterSheet.getCell(10, 2).value =
        calculateResults.data['User Specified Surface Area'];
    }

    function addResultsSheet() {
      // only here to satisfy typescript
      if (!calculateResults.data) return;

      // add the sheet
      const resultsSheet = workbook.addWorksheet('Detailed Results');

      // setup column widths
      resultsSheet.columns = [
        { width: 40.86 },
        { width: valueColumnWidth },
        { width: 41.43 },
        { width: valueColumnWidth },
        { width: 33.86 },
        { width: valueColumnWidth },
      ];

      // add the header
      resultsSheet.getCell(1, 1).font = sheetTitleFont;
      resultsSheet.getCell(1, 1).value = 'Detailed Results';

      // col 1 & 2
      resultsSheet.mergeCells(3, 1, 3, 2);
      resultsSheet.getCell(3, 1).alignment = columnTitleAlignment;
      resultsSheet.getCell(3, 1).font = columnTitleFont;
      resultsSheet.getCell(3, 1).value = 'Spatial Information';

      resultsSheet.getCell(4, 1).value = {
        richText: [
          { font: labelFont, text: 'Total Sampled Area (ft' },
          { font: { ...labelFont, vertAlign: 'superscript' }, text: '2' },
          { font: labelFont, text: ')' },
        ],
      };
      resultsSheet.getCell(4, 2).font = defaultFont;
      resultsSheet.getCell(4, 2).value =
        calculateResults.data['Total Sampled Area'];

      resultsSheet.getCell(5, 1).value = {
        richText: [
          {
            font: labelFont,
            text: 'User Specified Total Area of Interest (ft',
          },
          { font: { ...labelFont, vertAlign: 'superscript' }, text: '2' },
          { font: labelFont, text: ')' },
        ],
      };
      const userAoi = calculateResults.data['User Specified Total AOI'];
      if (userAoi) {
        resultsSheet.getCell(5, 2).font = defaultFont;
        resultsSheet.getCell(5, 2).value = userAoi;
      }

      resultsSheet.getCell(6, 1).font = labelFont;
      resultsSheet.getCell(6, 1).value = 'Percent of Area Sampled';
      const percentAreaSampled =
        calculateResults.data['Percent of Area Sampled'];
      if (percentAreaSampled) {
        resultsSheet.getCell(6, 2).font = defaultFont;
        resultsSheet.getCell(6, 2).value = percentAreaSampled;
      }

      // col 3 & 4
      resultsSheet.mergeCells(3, 3, 3, 4);
      resultsSheet.getCell(3, 3).alignment = columnTitleAlignment;
      resultsSheet.getCell(3, 3).font = columnTitleFont;
      resultsSheet.getCell(3, 3).value = 'Sampling';

      resultsSheet.getCell(4, 3).font = labelFont;
      resultsSheet.getCell(4, 3).value = 'Sampling Hours per Day';
      resultsSheet.getCell(4, 4).font = defaultFont;
      resultsSheet.getCell(4, 4).value =
        calculateResults.data['Sampling Hours per Day'];

      resultsSheet.getCell(5, 3).font = labelFont;
      resultsSheet.getCell(5, 3).value = 'Sampling Personnel Hours per Day';
      resultsSheet.getCell(5, 4).font = defaultFont;
      resultsSheet.getCell(5, 4).value =
        calculateResults.data['Sampling Personnel hours per Day'];

      resultsSheet.getCell(6, 3).font = labelFont;
      resultsSheet.getCell(6, 3).value =
        'User Specified Sampling Team Labor Cost';
      resultsSheet.getCell(6, 4).font = defaultFont;
      resultsSheet.getCell(6, 4).value =
        calculateResults.data['User Specified Sampling Team Labor Cost'];

      resultsSheet.getCell(7, 3).font = labelFont;
      resultsSheet.getCell(7, 3).value = 'Time to Prepare Kits (person hours)';
      resultsSheet.getCell(7, 4).font = defaultFont;
      resultsSheet.getCell(7, 4).value =
        calculateResults.data['Time to Prepare Kits'];

      resultsSheet.getCell(8, 3).font = labelFont;
      resultsSheet.getCell(8, 3).value = 'Time to Collect (person hours)';
      resultsSheet.getCell(8, 4).font = defaultFont;
      resultsSheet.getCell(8, 4).value =
        calculateResults.data['Time to Collect'];

      resultsSheet.getCell(9, 3).font = labelFont;
      resultsSheet.getCell(9, 3).value = 'Sampling Material Cost';
      resultsSheet.getCell(9, 4).font = defaultFont;
      resultsSheet.getCell(9, 4).numFmt = currencyNumberFormat;
      resultsSheet.getCell(9, 4).value =
        calculateResults.data['Sampling Material Cost'];

      resultsSheet.getCell(10, 3).font = labelFont;
      resultsSheet.getCell(10, 3).value = 'Sampling Personnel Labor Cost';
      resultsSheet.getCell(10, 4).font = defaultFont;
      resultsSheet.getCell(10, 4).numFmt = currencyNumberFormat;
      resultsSheet.getCell(10, 4).value =
        calculateResults.data['Sampling Personnel Labor Cost'];

      resultsSheet.getCell(11, 3).font = labelFont;
      resultsSheet.getCell(11, 3).value = 'Time to Complete Sampling (days)';
      resultsSheet.getCell(11, 4).font = defaultFont;
      resultsSheet.getCell(11, 4).value =
        calculateResults.data['Time to Complete Sampling'];

      resultsSheet.getCell(12, 3).font = labelFont;
      resultsSheet.getCell(12, 3).value = 'Total Sampling Labor Cost';
      resultsSheet.getCell(12, 4).font = defaultFont;
      resultsSheet.getCell(12, 4).numFmt = currencyNumberFormat;
      resultsSheet.getCell(12, 4).value =
        calculateResults.data['Total Sampling Labor Cost'];

      // col 5 & 6
      resultsSheet.mergeCells(3, 5, 3, 6);
      resultsSheet.getCell(3, 5).alignment = columnTitleAlignment;
      resultsSheet.getCell(3, 5).font = columnTitleFont;
      resultsSheet.getCell(3, 5).value = 'Analysis';

      resultsSheet.getCell(4, 5).font = labelFont;
      resultsSheet.getCell(4, 5).value = 'Time to Complete Analyses (days)';
      resultsSheet.getCell(4, 6).font = defaultFont;
      resultsSheet.getCell(4, 6).value =
        calculateResults.data['Time to Complete Analyses'];

      resultsSheet.getCell(5, 5).font = labelFont;
      resultsSheet.getCell(5, 5).value = 'Time to Analyze (person hours)';
      resultsSheet.getCell(5, 6).font = defaultFont;
      resultsSheet.getCell(5, 6).value =
        calculateResults.data['Time to Analyze'];

      resultsSheet.getCell(6, 5).font = labelFont;
      resultsSheet.getCell(6, 5).value = 'Analysis Labor Cost';
      resultsSheet.getCell(6, 6).font = defaultFont;
      resultsSheet.getCell(6, 6).numFmt = currencyNumberFormat;
      resultsSheet.getCell(6, 6).value =
        calculateResults.data['Analysis Labor Cost'];

      resultsSheet.getCell(7, 5).font = labelFont;
      resultsSheet.getCell(7, 5).value = 'Analysis Material Cost';
      resultsSheet.getCell(7, 6).font = defaultFont;
      resultsSheet.getCell(7, 6).numFmt = currencyNumberFormat;
      resultsSheet.getCell(7, 6).value =
        calculateResults.data['Analysis Material Cost'];

      resultsSheet.getCell(8, 5).font = labelFont;
      resultsSheet.getCell(8, 5).value = 'Total Waste Volume (L)';
      resultsSheet.getCell(8, 6).font = defaultFont;
      resultsSheet.getCell(8, 6).value = calculateResults.data['Waste Volume'];

      resultsSheet.getCell(9, 5).font = labelFont;
      resultsSheet.getCell(9, 5).value = 'Total Waste Weight (lbs)';
      resultsSheet.getCell(9, 6).font = defaultFont;
      resultsSheet.getCell(9, 6).value = calculateResults.data['Waste Weight'];
    }

    function addSampleSheet() {
      // only here to satisfy typescript
      if (!map || !selectedScenario || selectedScenario.layers.length === 0) {
        return;
      }

      // get the group layer for the scenario
      const scenarioGroupLayer = map.layers.find(
        (layer) =>
          layer.type === 'group' && layer.id === selectedScenario.layerId,
      ) as __esri.GroupLayer;
      if (!scenarioGroupLayer) return;

      // add the sheet
      const samplesSheet = workbook.addWorksheet('Sample Details');

      // setup column widths
      samplesSheet.columns = [
        { width: 26.71 },
        { width: 47.71 },
        { width: 47.71 },
        { width: 15.43 },
        { width: 26.71 },
        { width: 10.86 },
        { width: 33.57 },
      ];

      // add the header
      samplesSheet.getCell(1, 1).font = sheetTitleFont;
      samplesSheet.getCell(1, 1).value = 'Sample Details';

      // add in column headers
      samplesSheet.getCell(3, 1).font = labelFont;
      samplesSheet.getCell(3, 1).value = 'Layer Name';
      samplesSheet.getCell(3, 2).font = labelFont;
      samplesSheet.getCell(3, 2).value = 'Layer ID';
      samplesSheet.getCell(3, 3).font = labelFont;
      samplesSheet.getCell(3, 3).value = 'Sample ID';
      samplesSheet.getCell(3, 4).font = labelFont;
      samplesSheet.getCell(3, 4).value = 'Sample Type';
      samplesSheet.getCell(3, 5).font = labelFont;
      samplesSheet.getCell(3, 5).value = 'Measured Contamination';
      samplesSheet.getCell(3, 6).font = labelFont;
      samplesSheet.getCell(3, 6).value = 'Units';
      samplesSheet.getCell(3, 7).font = labelFont;
      samplesSheet.getCell(3, 7).value = 'Notes';

      // add in the rows
      let currentRow = 4;
      scenarioGroupLayer.layers.forEach((layer) => {
        if (
          layer.type !== 'graphics' ||
          layer.id.endsWith('-points') ||
          layer.id.endsWith('-hybrid')
        )
          return;

        const graphicsLayer = layer as __esri.GraphicsLayer;
        graphicsLayer.graphics.forEach((graphic) => {
          const { PERMANENT_IDENTIFIER, TYPE, CONTAMVAL, CONTAMUNIT, Notes } =
            graphic.attributes;

          if (layer.title) {
            samplesSheet.getCell(currentRow, 1).font = defaultFont;
            samplesSheet.getCell(currentRow, 1).value = layer.title;
          }
          if (layer.id) {
            samplesSheet.getCell(currentRow, 2).font = defaultFont;
            samplesSheet.getCell(currentRow, 2).value = layer.id;
          }
          if (PERMANENT_IDENTIFIER) {
            samplesSheet.getCell(currentRow, 3).font = defaultFont;
            samplesSheet.getCell(currentRow, 3).value = PERMANENT_IDENTIFIER;
          }
          if (TYPE) {
            samplesSheet.getCell(currentRow, 4).font = defaultFont;
            samplesSheet.getCell(currentRow, 4).value = TYPE;
          }
          if (CONTAMVAL) {
            samplesSheet.getCell(currentRow, 5).font = defaultFont;
            samplesSheet.getCell(currentRow, 5).value = CONTAMVAL;
          }
          if (CONTAMUNIT) {
            samplesSheet.getCell(currentRow, 6).font = defaultFont;
            samplesSheet.getCell(currentRow, 6).value = CONTAMUNIT;
          }
          if (Notes) {
            samplesSheet.getCell(currentRow, 7).font = defaultFont;
            samplesSheet.getCell(currentRow, 7).value = Notes;
          }

          currentRow += 1;
        });
      });
    }
  }, [
    base64Screenshot,
    calculateResults,
    downloadStatus,
    map,
    selectedScenario,
  ]);

  return (
    <div css={panelContainer}>
      {calculateResults.status === 'fetching' && <LoadingSpinner />}
      {calculateResults.status === 'failure' && (
        <p>An error occurred while calculating. Please try again.</p>
      )}
      {calculateResults.status === 'no-scenario' && (
        <p>
          No plan has been selected. Please go to the Create Plan tab, select a
          plan and try again.
        </p>
      )}
      {calculateResults.status === 'no-layer' && (
        <p>
          The selected plan has no layers. Please go to the Create Plan tab, add
          one or more layers to the plan, and try again.
        </p>
      )}
      {calculateResults.status === 'no-graphics' && (
        <p>
          There are no samples to run calculations on. Please add samples and
          try again.
        </p>
      )}
      {calculateResults.status === 'success' && calculateResults.data && (
        <Fragment>
          <div>
            <h3>Summary</h3>
            <LabelValue
              label="Plan Name"
              value={selectedScenario?.scenarioName}
            />
            <LabelValue
              label="Plan Description"
              value={selectedScenario?.scenarioDescription}
            />
            <br />

            <h4>Sampling Plan</h4>
            <LabelValue
              label="Total Number of User-Defined Samples"
              value={
                calculateResults.data['Total Number of User-Defined Samples']
              }
            />
            <LabelValue
              label="Total Number of Samples"
              value={calculateResults.data['Total Number of Samples']}
            />
            <LabelValue
              label="Total Cost ($)"
              value={calculateResults.data['Total Cost']}
              isMonetary={true}
            />
            <LabelValue
              label="Total Time (days)"
              value={calculateResults.data['Total Time']}
            />
            <LabelValue
              label="Limiting Time Factor"
              value={calculateResults.data['Limiting Time Factor']}
            />
            <hr css={resourceTallySeparator} />

            <h4>Sampling Operation</h4>
            <LabelValue
              label="Total Required Sampling Time (team hrs)"
              value={calculateResults.data['Total Required Sampling Time']}
            />
            <LabelValue
              label="Time to Complete Sampling (days)"
              value={calculateResults.data['Time to Complete Sampling']}
            />
            <LabelValue
              label="Total Sampling Labor Cost ($)"
              value={calculateResults.data['Total Sampling Labor Cost']}
              isMonetary={true}
            />
            <LabelValue
              label="Total Sampling Material Cost ($)"
              value={calculateResults.data['Sampling Material Cost']}
              isMonetary={true}
            />
            <hr css={resourceTallySeparator} />

            <h4>Analysis Operation</h4>
            <LabelValue
              label="Total Required Analysis Time (lab hrs)"
              value={calculateResults.data['Time to Analyze']}
            />
            <LabelValue
              label="Time to Complete Analyses (days)"
              value={calculateResults.data['Time to Complete Analyses']}
            />
            <LabelValue
              label="Total Analysis Labor Cost ($)"
              value={calculateResults.data['Analysis Labor Cost']}
              isMonetary={true}
            />
            <LabelValue
              label="Total Analysis Material Cost ($)"
              value={calculateResults.data['Analysis Material Cost']}
              isMonetary={true}
            />
            <br />

            <h3>Details</h3>
            <h4>Spatial Information</h4>
            <LabelValue
              label={
                <Fragment>
                  Total Sampled Area (ft<sup>2</sup>)
                </Fragment>
              }
              value={calculateResults.data['Total Sampled Area']}
            />
            <LabelValue
              label={
                <Fragment>
                  User Specified Total Area of Interest (ft<sup>2</sup>)
                </Fragment>
              }
              value={calculateResults.data['User Specified Total AOI']}
            />
            <LabelValue
              label="Percent of Area Sampled"
              value={calculateResults.data['Percent of Area Sampled']}
            />
            <hr css={resourceTallySeparator} />

            <h4>Sampling</h4>
            <LabelValue
              label="Sampling Hours per Day"
              value={calculateResults.data['Sampling Hours per Day']}
            />
            <LabelValue
              label="Sampling Personnel Hours per Day"
              value={calculateResults.data['Sampling Personnel hours per Day']}
            />
            <LabelValue
              label="User Specified Sampling Team Labor Cost ($)"
              value={
                calculateResults.data['User Specified Sampling Team Labor Cost']
              }
              isMonetary={true}
            />
            <LabelValue
              label="Time to Prepare Kits (person hours)"
              value={calculateResults.data['Time to Prepare Kits']}
            />
            <LabelValue
              label="Time to Collect (person hours)"
              value={calculateResults.data['Time to Collect']}
            />
            <LabelValue
              label="Sampling Material Cost ($)"
              value={calculateResults.data['Sampling Material Cost']}
              isMonetary={true}
            />
            <LabelValue
              label="Sampling Personnel Labor Cost ($)"
              value={calculateResults.data['Sampling Personnel Labor Cost']}
              isMonetary={true}
            />
            <LabelValue
              label="Time to Complete Sampling (days)"
              value={calculateResults.data['Time to Complete Sampling']}
            />
            <LabelValue
              label="Total Sampling Labor Cost ($)"
              value={calculateResults.data['Total Sampling Labor Cost']}
              isMonetary={true}
            />
            <hr css={resourceTallySeparator} />

            <h4>Analysis</h4>
            <LabelValue
              label="Time to Complete Analyses (days)"
              value={calculateResults.data['Time to Complete Analyses']}
            />
            <LabelValue
              label="Time to Analyze (person hours)"
              value={calculateResults.data['Time to Analyze']}
            />
            <LabelValue
              label="Analysis Labor Cost ($)"
              value={calculateResults.data['Analysis Labor Cost']}
              isMonetary={true}
            />
            <LabelValue
              label="Analysis Material Cost ($)"
              value={calculateResults.data['Analysis Material Cost']}
              isMonetary={true}
            />
            <LabelValue
              label="Total Waste Volume (L)"
              value={calculateResults.data['Waste Volume']}
            />
            <LabelValue
              label="Total Waste Weight (lbs)"
              value={calculateResults.data['Waste Weight']}
            />
          </div>
          <div>
            {downloadStatus === 'fetching' && <LoadingSpinner />}
            {downloadStatus === 'screenshot-failure' &&
              screenshotFailureMessage}
            {downloadStatus === 'base64-failure' && base64FailureMessage}
            {downloadStatus === 'excel-failure' && excelFailureMessage}
            {downloadStatus === 'success' && downloadSuccessMessage}
            <div css={downloadButtonContainerStyles}>
              <button
                onClick={() => {
                  // reset everything so the download happens
                  setDownloadStatus('fetching');
                  setScreenshotInitialized(false);
                  setScreenshot(null);
                  setBase64Initialized(false);
                  setBase64Screenshot({
                    image: '',
                    height: 0,
                    width: 0,
                  });
                }}
              >
                Download
              </button>
            </div>
          </div>
        </Fragment>
      )}
    </div>
  );
}

export default CalculateResults;
