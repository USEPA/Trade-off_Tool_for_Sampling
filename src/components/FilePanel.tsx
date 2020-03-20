/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import { useDropzone } from 'react-dropzone';
import Select from 'react-select';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';
// contexts
import { NavigationContext } from 'contexts/Navigation';
// utils
import { fetchPost, fetchPostFile } from 'utils/fetchUtils';
import {
  generateUUID,
  getPopupTemplate,
  updateLayerEdits,
} from 'utils/sketchUtils';
// types
import { LayerType, LayerSelectType, LayerTypeName } from 'types/Layer';
// config
import { totsGPServer } from 'config/webService';
import { SampleSelectOptions, SampleSelectType } from 'config/sampleAttributes';
import { polygonSymbol } from 'config/symbols';

const layerOptions: LayerSelectType[] = [
  { value: 'Contamination Map', label: 'Contamination Map' },
  { value: 'Samples', label: 'Samples' },
  { value: 'Reference Layer', label: 'Reference Layer' },
  { value: 'Area of Interest', label: 'Area of Interest' },
  { value: 'VSP', label: 'VSP' },
];

function fileVerification(type: LayerTypeName, attributes: any) {
  const contaminationRequiredFields = [
    'OBJECTID',
    'GLOBALID',
    'PERMANENT_IDENTIFIER',
    'TYPE',
    'CONTAM_TYPE',
    'CONTAM_VALUE',
    'CONTAM_UNIT',
  ];
  const samplesRequiredFields = [
    'OBJECTID',
    'GLOBALID',
    'PERMANENT_IDENTIFIER',
    'TYPE',
    'TTPK',
    'TTC',
    'TTA',
    'TTPS',
    'LOD_P',
    'LOD_NON',
    'MCPS',
    'TCPS',
    'WVPS',
    'WWPS',
    'SA',
    'Notes',
    'ALC',
    'AMC',
    'CONTAM_TYPE',
    'CONTAM_VALUE',
    'CONTAM_UNIT',
    'SCENARIONAME',
    'CREATEDDATE',
    'UPDATEDDATE',
    'USERNAME',
    'ORGANIZATION',
    'SURFACEAREAUNIT',
    'ELEVATIONSERIES',
    'Shape_Length',
    'Shape_Area',
  ];

  let valid = true;
  if (type === 'Contamination Map') {
    contaminationRequiredFields.forEach((field) => {
      if (!(field in attributes)) valid = false;
    });
  }
  if (type === 'Samples') {
    samplesRequiredFields.forEach((field) => {
      if (!(field in attributes)) valid = false;
    });
  }

  return valid;
}

// --- styles (FileIcon) ---
const fileIconOuterContainer = css`
  width: 2em;
  line-height: 1;
  margin: 5px;
`;

const fileIconContainer = css`
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  vertical-align: middle;
`;

const fileIcon = css`
  color: #e6e8ed;
`;

const fileIconText = css`
  font-size: 16px;
  color: #9ea4b3;
  margin-top: 5px;
`;

// --- components (FileIcon) ---
type FileIconProps = {
  label: string;
};

function FileIcon({ label }: FileIconProps) {
  return (
    <span className="fa-stack fa-2x" css={fileIconOuterContainer}>
      <span css={fileIconContainer}>
        <i className="fas fa-file fa-stack-2x" css={fileIcon}></i>
        <span className="fa-stack-text fa-stack-1x" css={fileIconText}>
          {label}
        </span>
      </span>
    </span>
  );
}

// --- styles (FilePanel) ---
const searchContainerStyles = css`
  .dropzone {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border-width: 2px;
    border-radius: 2px;
    border-color: #eee;
    border-style: dashed;
    background-color: #fafafa;
    color: #bdbdbd;
    outline: none;
    transition: border 0.24s ease-in-out;
    text-align: center;
  }
`;

const selectStyles = css`
  margin-bottom: 10px;
`;

// --- components (FilePanel) ---
function FilePanel() {
  const { portal } = React.useContext(AuthenticationContext);
  const { goToOptions, setGoToOptions } = React.useContext(NavigationContext);
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    map,
    mapView,
    referenceLayers,
    setReferenceLayers,
  } = React.useContext(SketchContext);
  const {
    GraphicsLayer,
    FeatureLayer,
    FeatureSet,
    Field,
    geometryJsonUtils,
    Graphic,
    Geoprocessor,
    KMLLayer,
    PopupTemplate,
    rendererJsonUtils,
    SpatialReference,
  } = useEsriModulesContext();

  const [generalizeFeatures, setGeneralizeFeatures] = React.useState(false);
  const [analyzeResponse, setAnalyzeResponse] = React.useState<any>(null);
  const [generateResponse, setGenerateResponse] = React.useState<any>(null);
  const [analyzeCalled, setAnalyzeCalled] = React.useState(false);
  const [generateCalled, setGenerateCalled] = React.useState(false);
  const [featuresAdded, setFeaturesAdded] = React.useState(false);

  const [
    layerType,
    setLayerType, //
  ] = React.useState<LayerSelectType | null>(null);

  // Handle navigation options
  React.useEffect(() => {
    if (goToOptions?.from !== 'file') return;

    let optionValue: LayerSelectType | null = null;
    layerOptions.forEach((option) => {
      if (option.value === goToOptions.layerType) optionValue = option;
    });
    if (optionValue) setLayerType(optionValue);

    setGoToOptions(null);
  }, [goToOptions, setGoToOptions]);

  // Handles the user uploading a file
  const [file, setFile] = React.useState<any>(null);
  const [lastFileName, setLastFileName] = React.useState('');
  const onDrop = React.useCallback((acceptedFiles) => {
    // Do something with the files
    if (
      !acceptedFiles ||
      acceptedFiles.length === 0 ||
      !acceptedFiles[0].name
    ) {
      alert('No file provided or the file does not have a name.');
      return;
    }

    // get the filetype
    const file = acceptedFiles[0];
    let fileType = '';
    if (file.name.endsWith('.zip')) fileType = 'shapefile';
    if (file.name.endsWith('.csv')) fileType = 'csv';
    if (file.name.endsWith('.kml')) fileType = 'kml';
    if (file.name.endsWith('.geojson')) fileType = 'geojson';
    if (file.name.endsWith('.geo.json')) fileType = 'geojson';
    if (file.name.endsWith('.gpx')) fileType = 'gpx';

    if (!fileType) {
      alert(`${file.name} is an invalid file type.`);
      return;
    }

    file['esriFileType'] = fileType;
    setFile(file);

    // reset state management values
    setAnalyzeResponse(null);
    setGenerateResponse(null);
    setAnalyzeResponse(false);
    setGenerateCalled(false);
    setFeaturesAdded(false);
  }, []);

  // Configuration for the dropzone component
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    noClick: true,
    noKeyboard: true,
    onDrop,
  });

  // Retreive the geocode services from the user's portal
  const [
    batchGeocodeServices,
    setBatchGeocodeServices, //
  ] = React.useState<any>(null);
  const [
    firstGeocodeService,
    setFirstGeocodeService, //
  ] = React.useState<any>(null);
  const [
    sharingUrl,
    setSharingUrl, //
  ] = React.useState('https://www.arcgis.com/sharing/rest');
  React.useEffect(() => {
    if (!portal || batchGeocodeServices) return;

    const worldExp = /(arcgis.com\/arcgis\/rest\/services\/world\/geocodeserver).*/gi;
    const worldProxyExp = /(\/servers\/[\da-z.-]+\/rest\/services\/world\/geocodeserver).*/gi;

    // get batch geocode services
    const newBatchGeocodeServices: any[] = [];
    if (portal?.helperServices?.geocode) {
      // workaround for accessing portal.user.privileges since privileges doesn't exist on
      // the type definition.
      const user = portal.user as any;
      const hasGeocodePrivileges =
        user.privileges.indexOf('premium:user:geocode') > -1;

      portal.helperServices.geocode.forEach((service: any) => {
        const isWorld = service.url.match(worldExp);
        const isWorldProxy = service.url.match(worldProxyExp);
        if (
          (isWorld && !portal.isPortal && hasGeocodePrivileges) ||
          isWorldProxy ||
          service.batch
        ) {
          newBatchGeocodeServices.push({
            isWorldGeocodeServer: isWorld || isWorldProxy,
            isWorldGeocodeServerProxy: isWorldProxy,
            label: service.name,
            value: service.url,
            url: service.url,
            name: service.name,
          });
        }
      });
    }

    setSharingUrl(
      `${portal ? portal.url : 'https://www.arcgis.com'}/sharing/rest`,
    );
    setBatchGeocodeServices(newBatchGeocodeServices);
    if (newBatchGeocodeServices.length > 0) {
      setFirstGeocodeService(newBatchGeocodeServices[0]);
    }
  }, [portal, batchGeocodeServices]);

  // analyze csv files
  React.useEffect(() => {
    if (!file || !sharingUrl || analyzeCalled) return;
    if (file.name === lastFileName || file.esriFileType !== 'csv') return;
    setAnalyzeCalled(true);

    // build request
    const analyzeParams: any = { enableGlobalGeocoding: true };
    if (firstGeocodeService) {
      analyzeParams['geocodeServiceUrl'] = firstGeocodeService.url;
      if (firstGeocodeService.isWorldGeocodeServer) {
        analyzeParams['sourceCountry'] = 'world';
        analyzeParams['sourceCountryHint'] = '';
      }
    }

    const params: any = {
      f: 'json',
      fileType: file.esriFileType,
      analyzeParameters: analyzeParams,
    };

    const analyzeUrl = `${sharingUrl}/content/features/analyze`;
    fetchPostFile(analyzeUrl, params, file)
      .then((res: any) => {
        console.log('analyzeResponse: ', res);
        setAnalyzeResponse(res);
      })
      .catch((err) => console.error(err));
  }, [
    file,
    lastFileName,
    firstGeocodeService,
    portal,
    analyzeCalled,
    sharingUrl,
  ]);

  // get features from file
  const [
    sampleType,
    setSampleType, //
  ] = React.useState<SampleSelectType | null>(null);
  React.useEffect(() => {
    if (
      !mapView ||
      !layerType ||
      !file ||
      !sharingUrl ||
      file.name === lastFileName ||
      generateCalled
    ) {
      return;
    }
    if (file.esriFileType === 'kml') return; // KML doesn't need to do this
    if (file.esriFileType === 'csv' && !analyzeResponse) return; // CSV needs to wait for the analyze response
    if (layerType.value === 'VSP' && !sampleType) return; // VSP layers need a sample type

    setGenerateCalled(true);
    setLastFileName(file.name);

    const generateUrl = `${sharingUrl}/content/features/generate`;

    let resParameters = {};
    if (analyzeResponse) resParameters = analyzeResponse.publishParameters;
    const fileForm = new FormData();
    fileForm.append('file', file);
    const publishParameters: any = {
      ...resParameters,
      name: file.name,
      targetSR: mapView.spatialReference,
      maxRecordCount: 4000, // 4000 is the absolute max for this service.
      enforceInputFileSizeLimit: true,
      enforceOutputJsonSizeLimit: true,
    };

    // generalize features since this option was selected
    if (generalizeFeatures) {
      // save the current scale
      const originalScale = mapView.scale;

      // get the width for a scale of 40000
      mapView.scale = 40000;
      const extent = mapView.extent;

      // revert the scale back to the original value
      mapView.scale = originalScale;

      // get the resolution
      let resolution = extent.width / mapView.width;

      // append the publish parameters
      publishParameters['generalize'] = true;
      publishParameters['maxAllowableOffset'] = resolution;
      publishParameters['reducePrecision'] = true;

      // get the number of digits after the decimal
      let numDecimals = 0;
      while (resolution < 1) {
        resolution = resolution * 10;
        numDecimals++;
      }
      publishParameters['numberOfDigitsAfterDecimal'] = numDecimals;
    }

    let fileTypeToSend = file.esriFileType;

    console.log('fileTypeToSend: ', fileTypeToSend);
    // generate the features
    const params = {
      f: 'json',
      filetype: fileTypeToSend,
      publishParameters,
    };
    fetchPostFile(generateUrl, params, file)
      .then((res: any) => {
        console.log('generate res: ', res);
        console.log('file.esriFileType: ', file.esriFileType);
        if (layerType.value !== 'VSP') {
          console.log('basic');
          setGenerateResponse(res);
          return;
        }

        const features: __esri.Graphic[] = [];
        let layerDefinition: any;
        res.featureCollection.layers.forEach((layer: any) => {
          layerDefinition = layer.layerDefinition;
          layer.featureSet.features.forEach((feature: any) => {
            features.push(
              new Graphic({
                attributes: feature.attributes,
                geometry: geometryJsonUtils.fromJSON(feature.geometry),
              }),
            );
          });
        });
        console.log('features: ', features);

        // get the list of fields
        let fields: __esri.Field[] = [];
        layerDefinition.fields.forEach((field: __esri.Field) => {
          // Using Field.fromJSON to convert the Rest fields to the ArcGIS JS fields
          fields.push(Field.fromJSON(field));
        });

        // create a feature set for communicating with the GPServer
        const inputVspSet = new FeatureSet({
          displayFieldName: '',
          geometryType: layerDefinition.geometryType
            .toLowerCase()
            .replace('esrigeometry', ''),
          spatialReference: {
            wkid: 3857,
          },
          fields,
          features,
        });
        console.log('inputVspSet: ', inputVspSet);

        const params = {
          f: 'json',
          Input_VSP: inputVspSet,
          Sample_Type: sampleType && sampleType.value,
        };

        const goeprocessor = new Geoprocessor({
          url: `${totsGPServer}/VSP%20Import/execute`,
          outSpatialReference: { wkid: 3857 },
        });

        goeprocessor
          .execute(params)
          .then((res: any) => {
            console.log('res: ', res);

            const layers: any[] = [];
            res.results.forEach((result: any) => {
              layerDefinition.fields = result.value.fields;
              layerDefinition.objectIdField = 'OBJECTID';
              layers.push({
                layerDefinition,
                featureSet: {
                  features: result.value.features,
                  geometryType: result.value.geometryType,
                },
              });
            });

            setGenerateResponse({
              featureCollection: {
                layers,
              },
            });
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  }, [
    generalizeFeatures,
    generateCalled,
    analyzeResponse,
    file,
    lastFileName,
    portal,
    mapView,
    sharingUrl,

    // new
    layerType,
    Graphic,
    Field,
    geometryJsonUtils,
    Geoprocessor,
    FeatureSet,
    SpatialReference,
    map,
    sampleType,
  ]);

  // add features to the map as graphics layers. This is for every layer type
  // except for reference layers. This is so users can edit the features.
  React.useEffect(() => {
    if (!map || !mapView || !layerType || !file || featuresAdded) return;
    if (layerType.value === 'Reference Layer') return;
    if (
      !generateResponse?.featureCollection?.layers ||
      generateResponse.featureCollection.layers.length === 0
    ) {
      return;
    }

    console.log('generateResponse: ', generateResponse);
    setFeaturesAdded(true);

    const graphics: __esri.Graphic[] = [];
    let validAttributes = true;
    generateResponse.featureCollection.layers.forEach((layer: any) => {
      if (
        !layer?.featureSet?.features ||
        layer.featureSet.features.length === 0
      ) {
        return;
      }

      // get the features from the response and add the correct type value
      layer.featureSet.features.forEach((feature: any, index: number) => {
        if (
          !feature?.geometry?.spatialReference &&
          file.esriFileType === 'kml'
        ) {
          feature.geometry['spatialReference'] =
            generateResponse.lookAtExtent.spatialReference;
        }

        // non-VSP layers need to be converted from ArcGIS Rest to ArcGIS JS
        let graphic: any = feature;
        if (layerType.value !== 'VSP') graphic = Graphic.fromJSON(feature);

        // add a layer type to the graphic
        if (!graphic?.attributes?.TYPE) {
          graphic.attributes['TYPE'] = layerType.value;
        }

        // add ids to the graphic, if the graphic doesn't already have them
        const uuid = generateUUID();
        if (!graphic.attributes.PERMANENT_IDENTIFIER) {
          graphic.attributes['PERMANENT_IDENTIFIER'] = uuid;
        }
        if (!graphic.attributes.GLOBALID) {
          graphic.attributes['GLOBALID'] = uuid;
        }
        if (!graphic.attributes.OBJECTID) {
          graphic.attributes['OBJECTID'] = index.toString();
        }

        // add sample layer specific attributes
        if (layerType.value === 'Samples') {
          const {
            CONTAM_TYPE,
            CONTAM_VALUE,
            CONTAM_UNIT,
            SCENARIONAME,
            CREATEDDATE,
            UPDATEDDATE,
            USERNAME,
            ORGANIZATION,
            SURFACEAREAUNIT,
            ELEVATIONSERIES,
          } = graphic.attributes;
          if (!CONTAM_TYPE) graphic.attributes['CONTAM_TYPE'] = null;
          if (!CONTAM_VALUE) graphic.attributes['CONTAM_VALUE'] = null;
          if (!CONTAM_UNIT) graphic.attributes['CONTAM_UNIT'] = null;
          if (!SCENARIONAME) graphic.attributes['SCENARIONAME'] = null;
          if (!CREATEDDATE) graphic.attributes['CREATEDDATE'] = null;
          if (!UPDATEDDATE) graphic.attributes['UPDATEDDATE'] = null;
          if (!USERNAME) graphic.attributes['USERNAME'] = null;
          if (!ORGANIZATION) graphic.attributes['ORGANIZATION'] = null;
          if (!SURFACEAREAUNIT) graphic.attributes['SURFACEAREAUNIT'] = null;
          if (!ELEVATIONSERIES) graphic.attributes['ELEVATIONSERIES'] = null;
        }

        // verify the graphic has all required attributes
        const valid = fileVerification(layerType.value, graphic.attributes);
        if (!valid) validAttributes = false;

        if (graphic?.geometry?.type === 'polygon') {
          graphic.symbol = polygonSymbol;
        }

        // add the popup template
        graphic.popupTemplate = new PopupTemplate(
          getPopupTemplate(layerType.value),
        );

        graphics.push(graphic);
      });
    });

    if (!validAttributes) {
      alert('The file does not contain all of the required attributes.');
      return;
    }

    const graphicsLayer = new GraphicsLayer({
      graphics,
      title: file.name,
    });

    // create the graphics layer
    const layerToAdd: LayerType = {
      id: -1,
      layerId: graphicsLayer.id,
      value: `-1 - ${file.name}`,
      name: file.name,
      label: file.name,
      layerType: layerType.value,
      scenarioName: '',
      scenarioDescription: '',
      defaultVisibility: true,
      geometryType: 'esriGeometryPolygon',
      addedFrom: 'file',
      sketchLayer: graphicsLayer,
    };

    // make a copy of the edits context variable
    const editsCopy = updateLayerEdits({
      edits,
      layer: layerToAdd,
      type: 'add',
      changes: graphicsLayer.graphics,
    });

    setEdits(editsCopy);

    setLayers([...layers, layerToAdd]);
    map.add(graphicsLayer);
    if (graphics.length > 0) mapView.goTo(graphics);
  }, [
    // esri modules
    GraphicsLayer,
    Field,
    geometryJsonUtils,
    Graphic,
    PopupTemplate,
    rendererJsonUtils,

    // app
    edits,
    setEdits,
    layerType,
    generateResponse,
    featuresAdded,
    file,
    map,
    mapView,
    layers,
    setLayers,
  ]);

  // add features to the map as feature layers. This is only for reference layer
  // types. This is so users can view popups but not edit the features.
  React.useEffect(() => {
    if (!map || !mapView || !layerType || !file || featuresAdded) return;
    if (layerType.value !== 'Reference Layer') return;
    if (
      !generateResponse?.featureCollection?.layers ||
      generateResponse.featureCollection.layers.length === 0
    ) {
      return;
    }

    console.log('generateResponse: ', generateResponse);
    setFeaturesAdded(true);

    const layersAdded: LayerType[] = [];
    const featureLayers: __esri.FeatureLayer[] = [];
    const graphicsAdded: __esri.Graphic[] = [];
    generateResponse.featureCollection.layers.forEach((layer: any) => {
      if (
        !layer?.featureSet?.features ||
        layer.featureSet.features.length === 0
      ) {
        return;
      }

      // get the list of fields
      let fields: __esri.Field[] = [];
      if (layerType.value === 'VSP') fields = layer.layerDefinition.fields;
      else {
        layer.layerDefinition.fields.forEach((field: __esri.Field) => {
          // Using Field.fromJSON to convert the Rest fields to the ArcGIS JS fields
          fields.push(Field.fromJSON(field));
        });
      }

      // get the features from the response and add the correct type value
      const features: __esri.Graphic[] = [];
      layer.featureSet.features.forEach((feature: any) => {
        if (
          !feature?.geometry?.spatialReference &&
          file.esriFileType === 'kml'
        ) {
          feature.geometry['spatialReference'] =
            generateResponse.lookAtExtent.spatialReference;
        }
        const graphic = Graphic.fromJSON(feature);
        features.push(graphic);
        graphicsAdded.push(graphic);
      });

      // use jsonUtils to convert the REST API renderer to an ArcGIS JS renderer
      const renderer: __esri.Renderer = rendererJsonUtils.fromJSON(
        layer.layerDefinition.drawingInfo.renderer,
      );

      // create the popup template if popup information was provided
      let popupTemplate;
      if (layer.popupInfo) {
        popupTemplate = {
          title: layer.popupInfo.title,
          content: layer.popupInfo.description,
        };
      }

      console.log({
        fields,
        objectIdField: layer.layerDefinition.objectIdField,
        outFields: ['*'],
        source: features,
        title: file.name,
        renderer,
        popupTemplate,
      });

      const layerProps: __esri.FeatureLayerProperties = {
        fields,
        objectIdField: layer.layerDefinition.objectIdField,
        outFields: ['*'],
        source: features,
        title: file.name,
        renderer,
        popupTemplate,
      };

      // create the feature layer
      console.log('layerFromFile: ', layerProps);
      const layerToAdd = new FeatureLayer(layerProps);
      featureLayers.push(layerToAdd);

      setReferenceLayers([
        ...referenceLayers,
        { ...layerProps, layerId: layerToAdd.id },
      ]);

      // add the layers, from the uploaded file, to the map
      layersAdded.push({
        id: -1,
        layerId: layerToAdd.id,
        value: `-1 - ${file.name}`,
        name: file.name,
        label: file.name,
        layerType: layerType.value,
        scenarioName: '',
        scenarioDescription: '',
        defaultVisibility: true,
        geometryType: layer.layerDefinition.geometryType,
        addedFrom: 'file',
        sketchLayer: layerToAdd,
      });
    });

    setLayers([...layers, ...layersAdded]);
    map.addMany(featureLayers);
    if (graphicsAdded.length > 0) mapView.goTo(graphicsAdded);
  }, [
    // esri modules
    FeatureLayer,
    Field,
    geometryJsonUtils,
    Graphic,
    rendererJsonUtils,

    // app
    layerType,
    generateResponse,
    featuresAdded,
    file,
    map,
    mapView,
    layers,
    setLayers,
    referenceLayers,
    setReferenceLayers,
  ]);

  // handle loading of the KMLLayer
  React.useEffect(() => {
    if (!file || !mapView || file.esriFileType !== 'kml') return;
    if (file.name === lastFileName) return;

    // read in the file
    const reader = new FileReader();
    reader.onload = function(event: Event) {
      if (reader.error || !event || !reader.result) {
        console.error('FileReader Error: ', reader.error);
        alert(`FileReader Error: ${reader.error}`);
        return;
      }

      // build the arcgis kml call
      // this data is used to get the renderers
      const kmlUrl = 'https://utility.arcgis.com/sharing/kml';
      const contents = reader.result as string;
      const params = {
        kmlString: encodeURIComponent(contents),
        model: 'simple',
        folders: '',
        outSR: mapView.spatialReference,
      };
      fetchPost(kmlUrl, params)
        .then((res: any) => {
          console.log('kml res: ', res);
          setGenerateResponse(res);
        })
        .catch((err) => console.error(err));
    };

    try {
      reader.readAsText(file);
    } catch (ex) {
      console.error('FileReader Error: ', ex);
      alert(`FileReader Error: ${ex}`);
    }
  }, [KMLLayer, mapView, file, lastFileName]);

  return (
    <div css={searchContainerStyles}>
      <label htmlFor="layer-type-select">Layer Type</label>
      <Select
        inputId="layer-type-select"
        css={selectStyles}
        value={layerType}
        onChange={(ev) => setLayerType(ev as LayerSelectType)}
        options={layerOptions}
      />
      {layerType && (
        <React.Fragment>
          {layerType.value === 'VSP' && (
            <React.Fragment>
              <label htmlFor="sample-type-select">Sample Type</label>
              <Select
                inputId="sample-type-select"
                css={selectStyles}
                value={sampleType}
                onChange={(ev) => setSampleType(ev as SampleSelectType)}
                options={SampleSelectOptions}
              />
            </React.Fragment>
          )}
          {(layerType.value !== 'VSP' ||
            (layerType.value === 'VSP' && sampleType)) && (
            <React.Fragment>
              <input
                id="generalize-features-input"
                type="checkbox"
                checked={generalizeFeatures}
                onChange={(ev) => setGeneralizeFeatures(!generalizeFeatures)}
              />
              <label htmlFor="generalize-features-input">
                Generalize features for web display
              </label>
              <br />
              <div {...getRootProps({ className: 'dropzone' })}>
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p>Drop the files here ...</p>
                ) : (
                  <div>
                    <FileIcon label="Shape File" />
                    <FileIcon label="CSV" />
                    <FileIcon label="KML" />
                    <FileIcon label="GPX" />
                    <FileIcon label="Geo JSON" />
                    <br />
                    Drop or Browse
                    <br />
                    <button onClick={open}>Browse</button>
                  </div>
                )}
              </div>
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

export default FilePanel;
