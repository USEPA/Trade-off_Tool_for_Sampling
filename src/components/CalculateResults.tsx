/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx, css } from '@emotion/core';
// @ts-ignore
import xl from 'excel4node';
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
import MessageBox from './MessageBox';

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
};

function LabelValue({ label, value }: LabelValueProps) {
  let formattedValue = value;
  if (typeof value === 'number') formattedValue = value.toLocaleString();

  return (
    <div css={labelValueStyles}>
      <label>{label}: </label>
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
  } = React.useContext(CalculateContext);
  const {
    mapView,
    sketchLayer,
    aoiSketchLayer, //
  } = React.useContext(SketchContext);

  const [
    downloadStatus,
    setDownloadStatus, //
  ] = React.useState<DownloadStatus>('none');

  // take the screenshot
  const [
    screenshotInitialized,
    setScreenshotInitialized, //
  ] = React.useState(false);
  const [
    screenshot,
    setScreenshot, //
  ] = React.useState<__esri.Screenshot | null>(null);
  React.useEffect(() => {
    if (screenshotInitialized) return;
    if (!mapView || downloadStatus !== 'fetching') return;

    // save the current extent
    const initialExtent = mapView.extent;

    // zoom to the graphics for the active layers
    const zoomGraphics = getGraphicsArray([
      sketchLayer,
      aoiSketchLayer,
      contaminationMap,
    ]);
    if (zoomGraphics.length > 0) {
      mapView.goTo(zoomGraphics, { animate: false }).then(() => {
        // allow some time for the layers to load in prior to taking the screenshot
        setTimeout(() => {
          // const mapImageRes = await printTask.execute(params);
          mapView
            .takeScreenshot()
            .then((data) => {
              setScreenshot(data);

              // zoom back to the initial extent
              mapView.goTo(initialExtent, { animate: false });
            })
            .catch((err) => {
              console.error(err);
              setDownloadStatus('screenshot-failure');

              // zoom back to the initial extent
              mapView.goTo(initialExtent, { animate: false });
            });
        }, 1500);
      });
    }

    setScreenshotInitialized(true);
  }, [
    mapView,
    sketchLayer,
    aoiSketchLayer,
    contaminationMap,
    downloadStatus,
    screenshotInitialized,
  ]);

  // convert the screenshot to base64
  const [base64Initialized, setBase64Initialized] = React.useState(false);
  const [base64Screenshot, setBase64Screenshot] = React.useState('');
  React.useEffect(() => {
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
      url ? setBase64Screenshot(url) : setDownloadStatus('base64-failure');

      // Clean up
      canvas = null;
    };
    img.src = screenshot.dataUrl;

    setBase64Initialized(true);
  }, [screenshot, downloadStatus, base64Initialized]);

  // export the excel doc
  React.useEffect(() => {
    if (
      !sketchLayer ||
      downloadStatus !== 'fetching' ||
      !base64Screenshot ||
      calculateResults.status !== 'success' ||
      !calculateResults.data
    ) {
      return;
    }

    const workbook = new xl.Workbook({
      defaultFont: {
        size: 12,
        name: 'Calibri',
      },
    });

    // create the styles
    const valueColumnWidth = 19.29;
    const sheetTitleStyle = workbook.createStyle({
      font: { bold: true, size: 18 },
    });
    const columnTitleStyle = workbook.createStyle({
      alignment: { horizontal: 'center' },
      font: { bold: true, underline: true },
    });
    const labelStyle = workbook.createStyle({ font: { bold: true } });
    const underlinedLabelStyle = workbook.createStyle({
      font: { bold: true, underline: true },
    });
    const currencyStyle = workbook.createStyle({
      numberFormat: '$#,##0.00; ($#,##.00); -',
    });

    // create the sheets
    addSummarySheet();
    addParameterSheet();
    addResultsSheet();
    addSampleSheet();

    function addSummarySheet() {
      // only here to satisfy typescript
      if (!sketchLayer || !calculateResults.data) return;

      // add the sheet
      const summarySheet = workbook.addWorksheet('Summary');

      // setup column widths
      summarySheet.column(1).setWidth(22.25);
      summarySheet.column(2).setWidth(valueColumnWidth);
      summarySheet.column(3).setWidth(35.88);
      summarySheet.column(4).setWidth(valueColumnWidth);
      summarySheet.column(5).setWidth(33.13);
      summarySheet.column(6).setWidth(valueColumnWidth);

      // add the header
      summarySheet
        .cell(1, 1)
        .string('Trade-off Tool for Sampling (TOTS) Summary')
        .style(sheetTitleStyle);
      summarySheet.cell(2, 1).string('Version: 1.0');
      summarySheet
        .cell(4, 1)
        .string('Scenario Name')
        .style(underlinedLabelStyle);
      summarySheet.cell(4, 2).string(sketchLayer.scenarioName);
      summarySheet
        .cell(5, 1)
        .string('Scenario Description')
        .style(underlinedLabelStyle);
      summarySheet.cell(5, 2).string(sketchLayer.scenarioDescription);

      // col 1 & 2
      summarySheet
        .cell(7, 1, 7, 2, true)
        .string('Sampling Plan')
        .style(columnTitleStyle);

      summarySheet
        .cell(8, 1)
        .string('Total Number of Samples')
        .style(labelStyle);
      summarySheet
        .cell(8, 2)
        .number(calculateResults.data['Total Number of Samples']);

      summarySheet.cell(9, 1).string('Total Cost').style(labelStyle);
      summarySheet
        .cell(9, 2)
        .number(calculateResults.data['Total Cost'])
        .style(currencyStyle);

      summarySheet.cell(10, 1).string('Total Time (days)').style(labelStyle);
      summarySheet.cell(10, 2).number(calculateResults.data['Total Time']);

      summarySheet.cell(11, 1).string('Limiting Time Factor').style(labelStyle);
      summarySheet
        .cell(11, 2)
        .string(calculateResults.data['Limiting Time Factor']);

      // col 3 & 4
      summarySheet
        .cell(7, 3, 7, 4, true)
        .string('Sampling Operation')
        .style(columnTitleStyle);

      summarySheet
        .cell(8, 3)
        .string('Total Required Sampling Time (team hrs)')
        .style(labelStyle);
      summarySheet
        .cell(8, 4)
        .number(calculateResults.data['Total Required Sampling Time']);

      summarySheet
        .cell(9, 3)
        .string('Time to Complete Sampling (days)')
        .style(labelStyle);
      summarySheet
        .cell(9, 4)
        .number(calculateResults.data['Time to Complete Sampling']);

      summarySheet
        .cell(10, 3)
        .string('Total Sampling Labor Cost')
        .style(labelStyle);
      summarySheet
        .cell(10, 4)
        .number(calculateResults.data['Total Sampling Labor Cost'])
        .style(currencyStyle);

      summarySheet
        .cell(11, 3)
        .string('Total Sampling Material Cost')
        .style(labelStyle);
      summarySheet
        .cell(11, 4)
        .number(calculateResults.data['Material Cost'])
        .style(currencyStyle);

      // col 5 & 6
      summarySheet
        .cell(7, 5, 7, 6, true)
        .string('Analysis Operation')
        .style(columnTitleStyle);

      summarySheet
        .cell(8, 5)
        .string('Total Required Analysis Time (lab hrs)')
        .style(labelStyle);
      summarySheet.cell(8, 6).number(calculateResults.data['Time to Analyze']);

      summarySheet
        .cell(9, 5)
        .string('Time to Complete Analyses (days)')
        .style(labelStyle);
      summarySheet
        .cell(9, 6)
        .number(calculateResults.data['Time to Complete Analyses']);

      summarySheet
        .cell(10, 5)
        .string('Total Analysis Labor Cost')
        .style(labelStyle);
      summarySheet
        .cell(10, 6)
        .number(calculateResults.data['Analysis Labor Cost'])
        .style(currencyStyle);

      summarySheet
        .cell(11, 5)
        .string('Total Analysis Material Cost')
        .style(labelStyle);
      summarySheet
        .cell(11, 6)
        .number(calculateResults.data['Analysis Material Cost'])
        .style(currencyStyle);

      // add the map screenshot
      const base64 = base64Screenshot.replace(/^data:image\/jpeg;base64,/, '');
      summarySheet.addImage({
        image: Buffer.from(base64, 'base64'),
        name: 'logo', // name is not required param
        type: 'picture',
        position: {
          type: 'oneCellAnchor',
          from: {
            col: 2,
            colOff: 0,
            row: 14,
            rowOff: 0,
          },
        },
      });
    }

    function addParameterSheet() {
      // only here to satisfy typescript
      if (!calculateResults.data) return;

      // add the sheet
      const parameterSheet = workbook.addWorksheet('Parameters');

      // setup column widths
      parameterSheet.column(1).setWidth(35.88);
      parameterSheet.column(2).setWidth(valueColumnWidth);

      // add the header
      parameterSheet.cell(1, 1).string('Parameters').style(sheetTitleStyle);

      // col 1 & 2
      parameterSheet
        .cell(3, 1)
        .string('Number of Available Teams for Sampling')
        .style(labelStyle);
      parameterSheet
        .cell(3, 2)
        .number(
          calculateResults.data[
            'User Specified Number of Available Teams for Sampling'
          ],
        );

      parameterSheet
        .cell(4, 1)
        .string('Personnel per Sampling Team')
        .style(labelStyle);
      parameterSheet
        .cell(4, 2)
        .number(
          calculateResults.data['User Specified Personnel per Sampling Team'],
        );

      parameterSheet
        .cell(5, 1)
        .string('Sampling Team Hours per Shift')
        .style(labelStyle);
      parameterSheet
        .cell(5, 2)
        .number(
          calculateResults.data['User Specified Sampling Team Hours per Shift'],
        );

      parameterSheet
        .cell(6, 1)
        .string('Sampling Team Shifts per Day')
        .style(labelStyle);
      parameterSheet
        .cell(6, 2)
        .number(
          calculateResults.data['User Specified Sampling Team Shifts per Day'],
        );

      parameterSheet
        .cell(7, 1)
        .string('Sampling Team Labor Cost')
        .style(labelStyle);
      parameterSheet
        .cell(7, 2)
        .number(
          calculateResults.data['User Specified Sampling Team Labor Cost'],
        )
        .style(currencyStyle);

      parameterSheet
        .cell(8, 1)
        .string('Number of Available Labs for Analysis')
        .style(labelStyle);
      parameterSheet
        .cell(8, 2)
        .number(
          calculateResults.data[
            'User Specified Number of Available Labs for Analysis'
          ],
        );

      parameterSheet
        .cell(9, 1)
        .string('Analysis Lab Hours per Day')
        .style(labelStyle);
      parameterSheet
        .cell(9, 2)
        .number(
          calculateResults.data['User Specified Analysis Lab Hours per Day'],
        );

      //parameterSheet.cell(10, 1).string('Surface Area (ft2)').style(labelStyle);
      parameterSheet
        .cell(10, 1)
        .string([
          { bold: true },
          'Surface Area (ft',
          { bold: true, vertAlign: 'superscript' },
          '2',
          { bold: true, vertAlign: 'baseline' },
          ')',
        ]);
      parameterSheet
        .cell(10, 2)
        .number(calculateResults.data['User Specified Surface Area']);
    }

    function addResultsSheet() {
      // only here to satisfy typescript
      if (!calculateResults.data) return;

      // add the sheet
      const resultsSheet = workbook.addWorksheet('Detailed Results');

      // setup column widths
      resultsSheet.column(1).setWidth(35.63);
      resultsSheet.column(2).setWidth(valueColumnWidth);
      resultsSheet.column(3).setWidth(36);
      resultsSheet.column(4).setWidth(valueColumnWidth);
      resultsSheet.column(5).setWidth(29.5);
      resultsSheet.column(6).setWidth(valueColumnWidth);

      // add the header
      resultsSheet.cell(1, 1).string('Detailed Results').style(sheetTitleStyle);

      // col 1 & 2
      resultsSheet
        .cell(3, 1, 3, 2, true)
        .string('Spatial Information')
        .style(columnTitleStyle);

      resultsSheet
        .cell(4, 1)
        .string([
          { bold: true },
          'Total Sampled Area (ft',
          { bold: true, vertAlign: 'superscript' },
          '2',
          { bold: true, vertAlign: 'baseline' },
          ')',
        ]);
      resultsSheet
        .cell(4, 2)
        .number(calculateResults.data['Total Sampled Area']);

      resultsSheet
        .cell(5, 1)
        .string([
          { bold: true },
          'User Specified Total Area of Interest (ft',
          { bold: true, vertAlign: 'superscript' },
          '2',
          { bold: true, vertAlign: 'baseline' },
          ')',
        ]);
      resultsSheet
        .cell(5, 2)
        .number(calculateResults.data['User Specified Total AOI']);

      resultsSheet
        .cell(6, 1)
        .string('Percent of Area Sampled')
        .style(labelStyle);
      resultsSheet
        .cell(6, 2)
        .number(calculateResults.data['Percent of Area Sampled']);

      // col 3 & 4
      resultsSheet
        .cell(3, 3, 3, 4, true)
        .string('Sampling')
        .style(columnTitleStyle);

      resultsSheet
        .cell(4, 3)
        .string('Sampling Hours per Day')
        .style(labelStyle);
      resultsSheet
        .cell(4, 4)
        .number(calculateResults.data['Sampling Hours per Day']);

      resultsSheet
        .cell(5, 3)
        .string('Sampling Personnel Hours per Day')
        .style(labelStyle);
      resultsSheet
        .cell(5, 4)
        .number(calculateResults.data['Sampling Personnel hours per Day']);

      resultsSheet
        .cell(6, 3)
        .string('User Specified Sampling Team Labor Cost')
        .style(labelStyle);
      resultsSheet
        .cell(6, 4)
        .number(
          calculateResults.data['User Specified Sampling Team Labor Cost'],
        );

      resultsSheet
        .cell(7, 3)
        .string('Time to Prepare Kits (person hours)')
        .style(labelStyle);
      resultsSheet
        .cell(7, 4)
        .number(calculateResults.data['Time to Prepare Kits']);

      resultsSheet
        .cell(8, 3)
        .string('Time to Collect (person hours)')
        .style(labelStyle);
      resultsSheet.cell(8, 4).number(calculateResults.data['Time to Collect']);

      resultsSheet.cell(9, 3).string('Material Cost').style(labelStyle);
      resultsSheet
        .cell(9, 4)
        .number(calculateResults.data['Material Cost'])
        .style(currencyStyle);

      resultsSheet
        .cell(10, 3)
        .string('Sampling Personnel Labor Cost')
        .style(labelStyle);
      resultsSheet
        .cell(10, 4)
        .number(calculateResults.data['Sampling Personnel Labor Cost'])
        .style(currencyStyle);

      resultsSheet
        .cell(11, 3)
        .string('Time to Complete Sampling (days)')
        .style(labelStyle);
      resultsSheet
        .cell(11, 4)
        .number(calculateResults.data['Time to Complete Sampling']);

      resultsSheet
        .cell(12, 3)
        .string('Total Sampling Labor Cost')
        .style(labelStyle);
      resultsSheet
        .cell(12, 4)
        .number(calculateResults.data['Total Sampling Labor Cost'])
        .style(currencyStyle);

      // col 5 & 6
      resultsSheet
        .cell(3, 5, 3, 6, true)
        .string('Analysis')
        .style(columnTitleStyle);

      resultsSheet
        .cell(4, 5)
        .string('Time to Complete Analyses (days)')
        .style(labelStyle);
      resultsSheet
        .cell(4, 6)
        .number(calculateResults.data['Time to Complete Analyses']);

      resultsSheet
        .cell(5, 5)
        .string('Time to Analyze (pesron hours)')
        .style(labelStyle);
      resultsSheet.cell(5, 6).number(calculateResults.data['Time to Analyze']);

      resultsSheet.cell(6, 5).string('Analysis Labor Cost').style(labelStyle);
      resultsSheet
        .cell(6, 6)
        .number(calculateResults.data['Analysis Labor Cost'])
        .style(currencyStyle);

      resultsSheet
        .cell(7, 5)
        .string('Analysis Material Cost')
        .style(labelStyle);
      resultsSheet
        .cell(7, 6)
        .number(calculateResults.data['Analysis Material Cost'])
        .style(currencyStyle);

      resultsSheet.cell(8, 5).string('Waste Volume (L)').style(labelStyle);
      resultsSheet.cell(8, 6).number(calculateResults.data['Waste Volume']);

      resultsSheet.cell(9, 5).string('Waste Weight (lbs)').style(labelStyle);
      resultsSheet.cell(9, 6).number(calculateResults.data['Waste Weight']);
    }

    function addSampleSheet() {
      // only here to satisfy typescript
      if (!sketchLayer || sketchLayer.sketchLayer.type !== 'graphics') return;

      // add the sheet
      const samplesSheet = workbook.addWorksheet('Sample Details');

      // setup column widths
      samplesSheet.column(1).setWidth(42);
      samplesSheet.column(2).setWidth(14);
      samplesSheet.column(3).setWidth(24);
      samplesSheet.column(4).setWidth(10);
      samplesSheet.column(5).setWidth(30);

      // add the header
      samplesSheet.cell(1, 1).string('Sample Details').style(sheetTitleStyle);

      // add in column headers
      samplesSheet.cell(3, 1).string('Sample ID').style(labelStyle);
      samplesSheet.cell(3, 2).string('Sample Type').style(labelStyle);
      samplesSheet
        .cell(3, 3)
        .string('Measured Contamination')
        .style(labelStyle);
      samplesSheet.cell(3, 4).string('Units').style(labelStyle);
      samplesSheet.cell(3, 5).string('Notes').style(labelStyle);

      // add in the rows
      let currentRow = 4;
      sketchLayer.sketchLayer.graphics.forEach((graphic) => {
        const {
          PERMANENT_IDENTIFIER,
          TYPE,
          CONTAMVAL,
          CONTAMUNIT,
          Notes,
        } = graphic.attributes;

        if (PERMANENT_IDENTIFIER) {
          samplesSheet.cell(currentRow, 1).string(PERMANENT_IDENTIFIER);
        }
        if (TYPE) {
          samplesSheet.cell(currentRow, 2).string(TYPE);
        }
        if (CONTAMVAL) {
          samplesSheet.cell(currentRow, 3).number(CONTAMVAL);
        }
        if (CONTAMUNIT) {
          samplesSheet.cell(currentRow, 4).string(CONTAMUNIT);
        }
        if (Notes) {
          samplesSheet.cell(currentRow, 5).string(Notes);
        }

        currentRow += 1;
      });
    }

    // download the file
    workbook
      .writeToBuffer()
      .then((buffer: any) => {
        saveAs(new Blob([buffer]), `tots_${sketchLayer?.scenarioName}.xlsx`);
        setDownloadStatus('success');
      })
      .catch((err: any) => {
        console.error(err);
        setDownloadStatus('excel-failure');
      });
  }, [sketchLayer, base64Screenshot, downloadStatus, calculateResults]);

  return (
    <div css={panelContainer}>
      {calculateResults.status === 'fetching' && <LoadingSpinner />}
      {calculateResults.status === 'failure' && (
        <p>An error occurred while calculating. Please try again.</p>
      )}
      {calculateResults.status === 'no-layer' && (
        <p>
          No sample layer has been selected. Please go to the Create Plan tab,
          select a layer and try again.
        </p>
      )}
      {calculateResults.status === 'no-graphics' && (
        <p>
          There are no samples to run calculations on. Please add samples and
          try again.
        </p>
      )}
      {calculateResults.status === 'success' && calculateResults.data && (
        <React.Fragment>
          <div>
            <h3>Summary</h3>
            <LabelValue
              label="Scenario Name"
              value={sketchLayer?.scenarioName}
            />
            <LabelValue
              label="Scenario Description"
              value={sketchLayer?.scenarioDescription}
            />
            <br />

            <h4>Sampling Plan</h4>
            <LabelValue
              label="Total number of samples"
              value={calculateResults.data['Total Number of Samples']}
            />
            <LabelValue
              label="Total Cost ($)"
              value={calculateResults.data['Total Cost']}
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
            />
            <LabelValue
              label="Total Sampling Material Cost ($)"
              value={calculateResults.data['Material Cost']}
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
            />
            <LabelValue
              label="Total Analysis Material Cost ($)"
              value={calculateResults.data['Analysis Material Cost']}
            />
            <br />

            <h3>Details</h3>
            <h4>Spatial Information</h4>
            <LabelValue
              label={
                <React.Fragment>
                  Total Sampled Area (ft<sup>2</sup>)
                </React.Fragment>
              }
              value={calculateResults.data['Total Sampled Area']}
            />
            <LabelValue
              label={
                <React.Fragment>
                  User Specified Total Area of Interest (ft<sup>2</sup>)
                </React.Fragment>
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
              label="Sampling Personnel hours per Day"
              value={calculateResults.data['Sampling Personnel hours per Day']}
            />
            <LabelValue
              label="User Specified Sampling Team Labor Cost ($)"
              value={
                calculateResults.data['User Specified Sampling Team Labor Cost']
              }
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
              label="Material Cost"
              value={calculateResults.data['Material Cost']}
            />
            <LabelValue
              label="Sampling Personnel Labor Cost ($)"
              value={calculateResults.data['Sampling Personnel Labor Cost']}
            />
            <LabelValue
              label="Time to Complete Sampling (days)"
              value={calculateResults.data['Time to Complete Sampling']}
            />
            <LabelValue
              label="Total Sampling Labor Cost ($)"
              value={calculateResults.data['Total Sampling Labor Cost']}
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
            />
            <LabelValue
              label="Analysis Material Cost ($)"
              value={calculateResults.data['Analysis Material Cost']}
            />
            <LabelValue
              label="Waste volume (L)"
              value={calculateResults.data['Waste Volume']}
            />
            <LabelValue
              label="Waste Weight (lbs)"
              value={calculateResults.data['Waste Weight']}
            />
          </div>
          <div>
            {downloadStatus === 'fetching' && <LoadingSpinner />}
            {downloadStatus === 'screenshot-failure' && (
              <MessageBox
                severity="error"
                title="Download Error"
                message="An error occurred while taking a screenshot of the map."
              />
            )}
            {downloadStatus === 'base64-failure' && (
              <MessageBox
                severity="error"
                title="Download Error"
                message="An error occurred while converting the map screenshot."
              />
            )}
            {downloadStatus === 'excel-failure' && (
              <MessageBox
                severity="error"
                title="Download Error"
                message="An error occurred while creating the excel document."
              />
            )}
            {downloadStatus === 'success' && (
              <MessageBox
                severity="info"
                title="Success"
                message="The file was successfully downloaded."
              />
            )}
            <div css={downloadButtonContainerStyles}>
              <button
                onClick={() => {
                  // reset everything so the download happens
                  setDownloadStatus('fetching');
                  setScreenshotInitialized(false);
                  setScreenshot(null);
                  setBase64Initialized(false);
                  setBase64Screenshot('');
                }}
              >
                Download
              </button>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

export default CalculateResults;
