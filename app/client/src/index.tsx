/** @jsxImportSource @emotion/react */

import 'react-app-polyfill/stable';
import React, { Fragment, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Global, css } from '@emotion/react';
import esriConfig from '@arcgis/core/config';
import * as urlUtils from '@arcgis/core/core/urlUtils';
/*
  NOTE: regenerator-runtime is imported to avoid a bug with a GitHub Action
  workflow including regenerator-runtime in the build as an external dependency.
  For reference, the GitHub Action workflow's log message stated:
    "regenerator-runtime/runtime.js" is imported by
    "regenerator-runtime/runtime.js?commonjs-external", but could not be
    resolved – treating it as an external dependency.
*/
import 'regenerator-runtime';
// routes
import ErrorPage from 'routes/404';
import Decon from 'routes/Decon';
import Sampling from 'routes/Sampling';
// components
import AlertDialog from 'components/AlertDialog';
import AlertMessage from 'components/AlertMessage';
import ErrorBoundary from 'components/ErrorBoundary';
import LoadingSpinner from 'components/LoadingSpinner';
// contexts
import { AuthenticationProvider } from 'contexts/Authentication';
import { CalculateProvider } from 'contexts/Calculate';
import { DialogProvider } from 'contexts/Dialog';
import { LookupFilesProvider, useLookupFiles } from 'contexts/LookupFiles';
import { NavigationProvider } from 'contexts/Navigation';
import { PublishProvider } from 'contexts/Publish';
import { SketchProvider } from 'contexts/Sketch';
// utils
import {
  getEnvironmentString,
  logCallToGoogleAnalytics,
} from 'utils/fetchUtils';
import { getEnvironment } from 'utils/utils';
// config
import { totsNotAvailableMessage } from 'config/errorMessages';
// styles
import '@reach/dialog/styles.css';
import '@arcgis/core/assets/esri/themes/light/main.css';
// types
import { EditsType } from 'types/Edits';
import { LayerType, PortalLayerType } from 'types/Layer';
import { DefaultSymbolsType, SampleSelectType } from 'config/sampleAttributes';

declare global {
  interface Window {
    aoiSketchVmInternalLayerId: string;
    googleAnalyticsMapping: any[];
    logErrorToGa: Function;
    logToGa: Function;
    sampleSketchVmInternalLayerId: string;
    totsAllSampleOptions: SampleSelectType[];
    totsEditsLayers: {
      id: number;
      layerId: string;
      name: string;
      type: EditsType['edits'][number]['type'];
    }[];
    totsDeconAttributes: any;
    totsDefaultSymbols: DefaultSymbolsType;
    totsLayers: LayerType[];
    totsPortalLayers: PortalLayerType[];
    totsSampleAttributes: any;
  }
}

const globalStyles = css`
  html {
    /* overwrite EPA's html font-size so rem units are based on 16px */
    font-size: 100%;
  }

  body {
    margin: 0;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    /* re-apply EPA's html element font-size, just scoped to the body element */
    font-size: 106.25%;
  }

  :root {
    --calcite-spacing-md: 0.25rem;
    --calcite-internal-action-padding-inline: 0.6rem;
  }

  .tots {
    /* revert back to 16px font-size on our application code itself */
    font-size: 1rem;

    input {
      &:disabled {
        color: #999;
        background-color: #f2f2f2;
        border-color: #fff;
      }
    }
  }

  .sr-only {
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .esri-popup__main-container {
    min-width: 460px !important;
  }

  .esri-popup__action-text {
    display: none;
  }

  .esri-widget,
  .esri-widget--button {
    &:focus {
      outline: none;
    }
  }

  .esri-sketch {
    margin-bottom: 10px;
  }
`;

/** Custom hook to display the Expert Query disclaimer banner for development/staging */
function useDisclaimerBanner() {
  useEffect(() => {
    const environment = getEnvironment();
    if (environment === 'production') return;

    const siteAlert = document.querySelector('.usa-site-alert');
    if (!siteAlert) return;

    const banner = document.createElement('aside');
    banner.setAttribute('id', 'eq-disclaimer-banner');
    banner.setAttribute(
      'class',
      'padding-1 text-center text-white bg-secondary-dark',
    );
    banner.innerHTML = `<strong>EPA development environment:</strong> The
          content on this page is not production data and this site is being used
          for <strong>development</strong> and/or <strong>testing</strong> purposes
          only.`;

    siteAlert.insertAdjacentElement('beforebegin', banner);

    return function cleanup() {
      banner.remove();
    };
  }, []);
}

const router = createBrowserRouter([
  { path: '/', element: <Sampling /> },
  { path: '/sampling', element: <Sampling /> },
  { path: '/decon', element: <Decon /> },
  { path: '*', element: <ErrorPage /> },
]);

function App() {
  const lookupFiles = useLookupFiles();
  useDisclaimerBanner();

  // setup esri interceptors for logging to google analytics
  const [interceptorsInitialized, setInterceptorsInitialized] = useState(false);
  useEffect(() => {
    if (interceptorsInitialized || !esriConfig?.request?.interceptors) return;

    let callId = 0;
    let callDurations: any = {};

    if (lookupFiles.status === 'success') {
      // Have ESRI use the proxy for communicating with the TOTS GP Server
      urlUtils.addProxyRule({
        proxyUrl: lookupFiles.data.services.proxyUrl,
        urlPrefix: 'https://ags.erg.com',
      });
    }

    if (!esriConfig?.request?.interceptors) return;

    // intercept esri calls to gispub
    const urls: string[] = ['https://www.arcgis.com/sharing/rest/'];
    esriConfig.request.interceptors.push({
      urls,

      // Workaround for ESRI CORS cacheing issue, when switching between
      // environments.
      before: function (params) {
        // if this environment has a phony variable use it
        const envString = getEnvironmentString();
        if (envString) {
          params.requestOptions.query[envString] = 1;
        }

        // add the callId to the query so we can tie the response back
        params.requestOptions.query['callId'] = callId;

        // add the call's start time to the dictionary
        callDurations[callId] = performance.now();

        // increment the callId
        callId = callId + 1;
      },

      // Log esri api calls to Google Analytics
      after: function (response: any) {
        // get the execution time for the call
        const callId = response.requestOptions.query.callId;
        const startTime = callDurations[callId];

        logCallToGoogleAnalytics(response.url, 200, startTime);

        // delete the execution time from the dictionary
        delete callDurations[callId];
      },

      error: function (error) {
        // get the execution time for the call
        const details = error.details;
        const callId = details.requestOptions.query.callId;
        const startTime = callDurations[callId];

        logCallToGoogleAnalytics(
          details.url,
          details.httpStatus ? details.httpStatus : error.message,
          startTime,
        );

        // delete the execution time from the dictionary
        delete callDurations[callId];
      },
    });

    setInterceptorsInitialized(true);
  }, [interceptorsInitialized, lookupFiles]);

  if (lookupFiles.status === 'idle') return null;
  if (lookupFiles.status === 'pending') return <LoadingSpinner />;
  if (lookupFiles.status === 'failure') return totsNotAvailableMessage();
  return (
    <Fragment>
      <AlertDialog />
      <AlertMessage />

      <RouterProvider router={router} />
    </Fragment>
  );
}

function Root() {
  return (
    <LookupFilesProvider>
      <DialogProvider>
        <AuthenticationProvider>
          <CalculateProvider>
            <NavigationProvider>
              <PublishProvider>
                <SketchProvider>
                  <Global styles={globalStyles} />
                  <ErrorBoundary>
                    <App />
                  </ErrorBoundary>
                </SketchProvider>
              </PublishProvider>
            </NavigationProvider>
          </CalculateProvider>
        </AuthenticationProvider>
      </DialogProvider>
    </LookupFilesProvider>
  );
}

const rootElement = document.getElementById('root') as HTMLElement;
createRoot(rootElement).render(<Root />);

export default Root;
