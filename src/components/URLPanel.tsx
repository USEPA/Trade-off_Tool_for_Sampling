/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import Select from 'components/Select';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';

// --- styles (URLPanel) ---
const addButtonStyles = css`
  float: right;
`;

const urlInputStyles = css`
  width: 100%;
`;

// --- components (URLPanel) ---
type UrlType = {
  value: 'ArcGIS' | 'WMS' | 'WFS' | 'KML' | 'GeoRSS' | 'CSV';
  label:
    | 'An ArcGIS Server Web Service'
    | 'A WMS OGC Web Service'
    | 'A WFS OGC Web Service'
    | 'A KML File'
    | 'A GeoRSS File'
    | 'A CSV File';
};

function URLPanel() {
  const { map, urlLayers, setUrlLayers } = React.useContext(SketchContext);
  const {
    CSVLayer,
    GeoRSSLayer,
    KMLLayer,
    Layer,
    WMSLayer,
    //WMTSLayer, // not yet supported in the 4.X API
  } = useEsriModulesContext();

  // filters
  const [
    urlType,
    setUrlType, //
  ] = React.useState<UrlType>({
    value: 'ArcGIS',
    label: 'An ArcGIS Server Web Service',
  });
  const [url, setUrl] = React.useState('');
  const [showSampleUrls, setShowSampleUrls] = React.useState(false);

  if (!map) return null;

  const handleAdd = (ev: React.MouseEvent<HTMLButtonElement>) => {
    const type = urlType.value;

    let layer;
    if (type === 'ArcGIS') {
      layer = Layer.fromArcGISServerUrl({ url });
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

    // add the layer if isn't null
    if (layer) {
      map.add(layer);

      const urlLayer = { url, type };
      setUrlLayers([...urlLayers, urlLayer]);
    }
  };

  return (
    <div>
      <label>Type</label>
      <Select
        value={urlType}
        onChange={(ev) => setUrlType(ev as UrlType)}
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
        onChange={(ev) => setUrl(ev.target.value)}
      />
      <br />
      <br />
      <button onClick={() => setShowSampleUrls(!showSampleUrls)}>
        SAMPLE URL(S)
      </button>
      <button css={addButtonStyles} onClick={handleAdd}>
        ADD
      </button>

      {showSampleUrls && (
        <React.Fragment>
          {urlType.value === 'ArcGIS' && (
            <div>
              <p>
                http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Cities/FeatureServer/0
              </p>
              <p>
                http://services.arcgisonline.com/ArcGIS/rest/services/Demographics/USA_Tapestry/MapServer
              </p>
              <p>
                http://imagery.arcgisonline.com/ArcGIS/rest/services/LandsatGLS/VegetationAnalysis/ImageServer
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
        </React.Fragment>
      )}
    </div>
  );
}

export default URLPanel;
