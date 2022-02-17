/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  MouseEvent as ReactMouseEvent,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from '@emotion/react';
import CSVLayer from '@arcgis/core/layers/CSVLayer';
import GeoRSSLayer from '@arcgis/core/layers/GeoRSSLayer';
import KMLLayer from '@arcgis/core/layers/KMLLayer';
import Layer from '@arcgis/core/layers/Layer';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import Select from 'components/Select';
// contexts
import { SketchContext } from 'contexts/Sketch';
// config
import {
  unsupportedLayerMessage,
  urlAlreadyAddedMessage,
  urlLayerFailureMessage,
  urlLayerSuccessMessage,
} from 'config/errorMessages';

// --- styles (URLPanel) ---
const addButtonStyles = css`
  float: right;
`;

const urlInputStyles = css`
  width: 100%;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

// --- components (URLPanel) ---
type UrlType =
  | { value: 'ArcGIS'; label: 'An ArcGIS Server Web Service' }
  | { value: 'WMS'; label: 'A WMS OGC Web Service' }
  | { value: 'WFS'; label: 'A WFS OGC Web Service' }
  | { value: 'KML'; label: 'A KML File' }
  | { value: 'GeoRSS'; label: 'A GeoRSS File' }
  | { value: 'CSV'; label: 'A CSV File' };
type UrlStatusType =
  | 'none'
  | 'fetching'
  | 'success'
  | 'failure'
  | 'unsupported'
  | 'already-added';
type SupportedUrlLayerTypes =
  | __esri.Layer
  | __esri.WMSLayer
  | __esri.KMLLayer
  | __esri.GeoRSSLayer
  | __esri.CSVLayer;

function URLPanel() {
  const { map, urlLayers, setUrlLayers } = useContext(SketchContext);

  // filters
  const [
    urlType,
    setUrlType, //
  ] = useState<UrlType>({
    value: 'ArcGIS',
    label: 'An ArcGIS Server Web Service',
  });
  const [url, setUrl] = useState('');
  const [showSampleUrls, setShowSampleUrls] = useState(false);
  const [status, setStatus] = useState<UrlStatusType>('none');

  const [layer, setLayer] = useState<SupportedUrlLayerTypes | null>(null);
  useEffect(() => {
    if (!map || !layer) return;

    // keep the original set of url layers in case the layer errors out
    const originalUrlLayers = urlLayers;

    // add the layer to the map
    map.add(layer);

    layer.on('layerview-create', (event) => {
      setUrlLayers((urlLayers) => {
        urlLayers.forEach((urlLayer) => {
          if (urlLayer.url === url && urlLayer.type === urlType.value) {
            urlLayer.layerId = layer.id;
          }
        });

        return urlLayers;
      });
      setStatus('success');
    });

    layer.on('layerview-create-error', (event) => {
      console.error('create error event: ', event);

      map.remove(layer);

      setUrlLayers(originalUrlLayers);

      setStatus('failure');
    });

    setLayer(null);
  }, [map, layer, setUrlLayers, url, urlLayers, urlType]);

  if (!map) return null;

  const handleAdd = (ev: ReactMouseEvent<HTMLButtonElement>) => {
    // make sure the url hasn't already been added
    const index = urlLayers.findIndex(
      (layer) => layer.url.toLowerCase() === url.toLowerCase(),
    );
    if (index > -1) {
      setStatus('already-added');
      return;
    }

    setStatus('fetching');

    const type = urlType.value;

    let layer: SupportedUrlLayerTypes | null = null;
    if (type === 'ArcGIS') {
      // add this layer to the url layers
      const urlLayer = { url, type: urlType.value, layerId: '' };
      setUrlLayers([...urlLayers, urlLayer]);

      Layer.fromArcGISServerUrl({ url })
        .then((layer) => {
          setLayer(layer);
        })
        .catch((err) => {
          console.error(err);
          setStatus('failure');

          window.logErrorToGa(err);
        });
      return;
    }
    if (type === 'WMS') {
      layer = new WMSLayer({ url });
    }
    /* // not supported in 4.x js api
    if(type === 'WFS') {
      layer = new WFSLayer({ url });
    } */
    if (type === 'KML') {
      layer = new KMLLayer({ url });
    }
    if (type === 'GeoRSS') {
      layer = new GeoRSSLayer({ url });
    }
    if (type === 'CSV') {
      layer = new CSVLayer({ url });
    }

    // unsupported layer type
    if (layer) {
      // add this layer to the url layers
      const urlLayer = { url, type: urlType.value, layerId: layer.id };
      setUrlLayers([...urlLayers, urlLayer]);

      setLayer(layer);
    } else {
      setStatus('unsupported');
    }
  };

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
      }}
    >
      <p>You can add the following types of layers through a URL:</p>
      <p css={layerInfo}>
        <strong>ArcGIS Server web service</strong> - map, image, or feature
        resource that is located on an ArcGIS Server site
      </p>
      <p css={layerInfo}>
        <strong>WMS OGC web service</strong> - feature service that follows the
        OGC Web Feature Service specification
      </p>
      <p css={layerInfo}>
        <strong>KML file</strong> - File containing a set of geographic
        features.
      </p>
      <p css={layerInfo}>
        <strong>GeoRSS file</strong> - web feed that includes geographic
        features and locations.
      </p>
      <p>
        <strong>CSV file</strong> - web-based, comma-separated values text file
        that includes location information
      </p>
      <label htmlFor="url-type-select">Type</label>
      <Select
        inputId="url-type-select"
        value={urlType}
        onChange={(ev) => {
          setUrlType(ev as UrlType);
          setStatus('none');
        }}
        options={[
          { value: 'ArcGIS', label: 'An ArcGIS Server Web Service' },
          { value: 'WMS', label: 'A WMS OGC Web Service' },
          // {value: 'WFS', label: 'A WFS OGC Web Service'}, // not supported in 4.x yet
          { value: 'KML', label: 'A KML File' },
          { value: 'GeoRSS', label: 'A GeoRSS File' },
          { value: 'CSV', label: 'A CSV File' },
        ]}
      />
      <br />
      <label htmlFor="url-upload-input">URL</label>
      <input
        id="url-upload-input"
        css={urlInputStyles}
        value={url}
        onChange={(ev) => {
          setUrl(ev.target.value);
          setStatus('none');
        }}
      />
      <br />
      <br />
      {status === 'fetching' && <LoadingSpinner />}
      {status === 'success' && urlLayerSuccessMessage}
      {status === 'failure' && urlLayerFailureMessage(url)}
      {status === 'unsupported' && unsupportedLayerMessage(urlType.label)}
      {status === 'already-added' && urlAlreadyAddedMessage(url)}
      <button type="button" onClick={() => setShowSampleUrls(!showSampleUrls)}>
        SAMPLE URL(S)
      </button>
      <button css={addButtonStyles} type="submit" onClick={handleAdd}>
        ADD
      </button>

      {showSampleUrls && (
        <Fragment>
          {urlType.value === 'ArcGIS' && (
            <div>
              <p>
                http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Cities/FeatureServer/0
              </p>
              <p>
                http://services.arcgisonline.com/ArcGIS/rest/services/Demographics/USA_Tapestry/MapServer
              </p>
            </div>
          )}
          {urlType.value === 'WMS' && (
            <div>
              <p>
                http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?service=WMS&request=GetCapabilities
              </p>
            </div>
          )}
          {/* Not supported in 4.x JS API
          {urlType.value === 'WFS' && (
            <div>
              <p>https://dservices.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/services/JapanPrefectures2018/WFSServer</p>
            </div>
          )} 
          */}
          {urlType.value === 'KML' && (
            <div>
              <p>
                http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month_age_animated.kml
              </p>
            </div>
          )}
          {urlType.value === 'GeoRSS' && (
            <div>
              <p>http://www.gdacs.org/xml/rss.xml</p>
            </div>
          )}
          {urlType.value === 'CSV' && (
            <div>
              <p>
                http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.csv
              </p>
            </div>
          )}
        </Fragment>
      )}
    </form>
  );
}

export default URLPanel;
