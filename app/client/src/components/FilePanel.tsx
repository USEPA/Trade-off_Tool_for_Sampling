/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from '@emotion/react';
import { useDropzone } from 'react-dropzone';
import LoadingSpinner from 'components/LoadingSpinner';
import Select from 'components/Select';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import Field from '@arcgis/core/layers/support/Field';
import * as geometryJsonUtils from '@arcgis/core/geometry/support/jsonUtils';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import * as rendererJsonUtils from '@arcgis/core/renderers/support/jsonUtils';
// components
import ColorPicker from 'components/ColorPicker';
import MessageBox from 'components/MessageBox';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { DialogContext } from 'contexts/Dialog';
import {
  useLayerProps,
  useSampleTypesContext,
  useServicesContext,
} from 'contexts/LookupFiles';
import { SketchContext } from 'contexts/Sketch';
import { NavigationContext } from 'contexts/Navigation';
// utils
import { appendEnvironmentObjectParam } from 'utils/arcGisRestUtils';
import { fetchPost, fetchPostFile, geoprocessorFetch } from 'utils/fetchUtils';
import { useDynamicPopup, useGeometryTools } from 'utils/hooks';
import {
  convertToPoint,
  generateUUID,
  getCurrentDateTime,
  getPointSymbol,
  setZValues,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { chunkArray, createErrorObject, getLayerName } from 'utils/utils';
// types
import { ScenarioEditsType } from 'types/Edits';
import { LayerType, LayerSelectType, LayerTypeName } from 'types/Layer';
import { ErrorType } from 'types/Misc';
// config
import { PolygonSymbol, SampleSelectType } from 'config/sampleAttributes';
import {
  featureNotAvailableMessage,
  fileReadErrorMessage,
  invalidFileTypeMessage,
  missingAttributesMessage,
  noDataMessage,
  sampleIssuesPopupMessage,
  unknownSampleTypeMessage,
  uploadSuccessMessage,
  userCanceledMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';

const layerOptions: LayerSelectType[] = [
  { value: 'Contamination Map', label: 'Contamination Map' },
  { value: 'Samples', label: 'Samples' },
  { value: 'Reference Layer', label: 'Reference Layer' },
  { value: 'Area of Interest', label: 'Area of Interest' },
  { value: 'VSP', label: 'VSP' },
];

function fileVerification(type: LayerTypeName, attributes: any) {
  const contaminationRequiredFields = ['CONTAMTYPE', 'CONTAMVAL', 'CONTAMUNIT'];
  const samplesRequiredFields = [
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
  ];

  const missingFields: string[] = [];
  if (type === 'Contamination Map') {
    contaminationRequiredFields.forEach((field) => {
      // check if the required field is in the attributes object
      if (!(field in attributes)) {
        // build a list of fields that are missing
        if (missingFields.indexOf(field) === -1) missingFields.push(field);
      }
    });
  }
  if (type === 'Samples') {
    samplesRequiredFields.forEach((field) => {
      // check if the required field is in the attributes object
      if (!(field in attributes)) {
        // build a list of fields that are missing
        if (missingFields.indexOf(field) === -1) missingFields.push(field);
      }
    });
  }

  return missingFields;
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
  width: 100%;
`;

const fileIconTextColor = css`
  color: #545454;
`;

const fileIconText = css`
  ${fileIconTextColor}
  font-size: 16px;
  margin-top: 5px;
  width: 100%;
`;

const checkBoxStyles = css`
  margin-right: 5px;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

const sectionParagraph = css`
  padding-top: 1em;
  padding-bottom: 1em;
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

    .div {
      color: #545454;
    }
  }
`;

const selectStyles = css`
  margin-bottom: 10px;
`;

// --- components (FilePanel) ---
type UploadStatusType =
  | ''
  | 'fetching'
  | 'success'
  | 'failure'
  | 'no-data'
  | 'user-canceled'
  | 'invalid-file-type'
  | 'import-error'
  | 'over-max-features'
  | 'missing-attributes'
  | 'unknown-sample-type'
  | 'file-read-error';

function FilePanel() {
  const { portal, userInfo } = useContext(AuthenticationContext);
  const { setOptions } = useContext(DialogContext);
  const { goToOptions, setGoToOptions, trainingMode } =
    useContext(NavigationContext);
  const {
    defaultSymbols,
    setDefaultSymbolSingle,
    displayDimensions,
    edits,
    setEdits,
    layers,
    setLayers,
    map,
    mapView,
    referenceLayers,
    setReferenceLayers,
    getGpMaxRecordCount,
    sampleAttributes,
    allSampleOptions,
    sceneView,
    selectedScenario,
    setSelectedScenario,
    setSketchLayer,
  } = useContext(SketchContext);

  const getPopupTemplate = useDynamicPopup();
  const { createBuffer, sampleValidation } = useGeometryTools();
  const layerProps = useLayerProps();
  const sampleTypeContext = useSampleTypesContext();
  const services = useServicesContext();

  const [generalizeFeatures, setGeneralizeFeatures] = useState(false);
  const [analyzeResponse, setAnalyzeResponse] = useState<any>(null);
  const [generateResponse, setGenerateResponse] = useState<any>(null);
  const [featuresAdded, setFeaturesAdded] = useState(false);
  const [fileValidationStarted, setFileValidationStarted] = useState(false);
  const [fileValidated, setFileValidated] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatusType>('');
  const [error, setError] = useState<ErrorType | null>(null);
  const [missingAttributes, setMissingAttributes] = useState('');

  const [
    layerType,
    setLayerType, //
  ] = useState<LayerSelectType | null>(null);

  // Handle navigation options
  useEffect(() => {
    if (goToOptions?.from !== 'file') return;

    let optionValue: LayerSelectType | null = null;
    layerOptions.forEach((option) => {
      if (option.value === goToOptions.layerType) optionValue = option;
    });
    if (optionValue) setLayerType(optionValue);

    setGoToOptions(null);
  }, [goToOptions, setGoToOptions]);

  // Handles the user uploading a file
  const [file, setFile] = useState<any>(null);
  const onDrop = useCallback((acceptedFiles: any) => {
    // Do something with the files
    if (
      !acceptedFiles ||
      acceptedFiles.length === 0 ||
      !acceptedFiles[0].name
    ) {
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

    // set the file state
    file['esriFileType'] = fileType;
    setFile({
      file,
      lastFileName: '',
      analyzeCalled: false,
    });

    // reset state management values
    setUploadStatus('fetching');
    setError(null);
    setAnalyzeResponse(null);
    setGenerateResponse(null);
    setFeaturesAdded(false);
    setFileValidationStarted(false);
    setFileValidated(false);
    setMissingAttributes('');

    if (!fileType) {
      setUploadStatus('invalid-file-type');
      return;
    }
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
  ] = useState<any>(null);
  const [
    firstGeocodeService,
    setFirstGeocodeService, //
  ] = useState<any>(null);
  const [
    sharingUrl,
    setSharingUrl, //
  ] = useState('https://www.arcgis.com/sharing/rest');
  useEffect(() => {
    if (!portal || batchGeocodeServices) return;

    const worldExp =
      /(arcgis.com\/arcgis\/rest\/services\/world\/geocodeserver).*/gi;
    const worldProxyExp =
      /(\/servers\/[\da-z.-]+\/rest\/services\/world\/geocodeserver).*/gi;

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
  useEffect(() => {
    if (!file?.file?.esriFileType || !sharingUrl || file.analyzeCalled) return;
    if (
      file.file.name === file.lastFileName ||
      file.file.esriFileType !== 'csv'
    ) {
      return;
    }

    setFile((file: any) => {
      return {
        ...file,
        analyzeCalled: true,
      };
    });

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
      fileType: file.file.esriFileType,
      analyzeParameters: analyzeParams,
    };
    appendEnvironmentObjectParam(params);

    const analyzeUrl = `${sharingUrl}/content/features/analyze`;
    fetchPostFile(analyzeUrl, params, file.file)
      .then((res: any) => {
        setAnalyzeResponse(res);
      })
      .catch((err) => {
        console.error(err);
        setUploadStatus('failure');
        setError({
          error: createErrorObject(err),
          message: err.message,
        });

        window.logErrorToGa(err);
      });
  }, [file, firstGeocodeService, portal, sharingUrl]);

  // get features from file
  const [
    sampleType,
    setSampleType, //
  ] = useState<SampleSelectType | null>(null);
  useEffect(() => {
    if (
      !mapView ||
      !sceneView ||
      !layerType ||
      !file?.file?.esriFileType ||
      !sharingUrl ||
      file.file.name === file.lastFileName ||
      !getGpMaxRecordCount ||
      services.status !== 'success'
    ) {
      return;
    }
    if (file.file.esriFileType === 'kml') return; // KML doesn't need to do this
    if (file.file.esriFileType === 'csv' && !analyzeResponse) return; // CSV needs to wait for the analyze response
    if (layerType.value === 'VSP' && !sampleType) return; // VSP layers need a sample type

    const view = displayDimensions === '3d' ? sceneView : mapView;

    const localSampleType = sampleType;

    setFile((file: any) => {
      return {
        ...file,
        lastFileName: file.file.name,
      };
    });

    const generateUrl = `${sharingUrl}/content/features/generate`;

    let resParameters = {};
    if (file.file.esriFileType === 'csv' && analyzeResponse) {
      resParameters = analyzeResponse.publishParameters;
    }
    const fileForm = new FormData();
    fileForm.append('file', file.file);
    const publishParameters: any = {
      ...resParameters,
      name: file.file.name,
      targetSR: view.spatialReference,
      maxRecordCount: 4000, // 4000 is the absolute max for this service.
      enforceInputFileSizeLimit: true,
      enforceOutputJsonSizeLimit: true,
    };

    // generalize features since this option was selected
    if (generalizeFeatures) {
      // save the current scale
      const originalScale = view.scale;

      // get the width for a scale of 40000
      view.scale = 40000;
      const extent = view.extent;

      // revert the scale back to the original value
      view.scale = originalScale;

      // get the resolution
      let resolution = extent.width / view.width;

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

    let fileTypeToSend = file.file.esriFileType;

    // generate the features
    const params = {
      f: 'json',
      filetype: fileTypeToSend,
      publishParameters,
    };
    appendEnvironmentObjectParam(params);

    fetchPostFile(generateUrl, params, file.file)
      .then((res: any) => {
        if (res.error) {
          setUploadStatus('import-error');
          setError({
            error: createErrorObject(res.error),
            message: res.error.message,
          });
          return;
        }

        if (['Contamination Map', 'Samples'].includes(layerType.value)) {
          // exceptions: Notes, ShapeType
          const exceptions = ['Notes', 'ShapeType'];
          res.featureCollection.layers.forEach((layer: any) => {
            layer.featureSet.features.forEach(
              (feature: any, _index: number) => {
                Object.keys(feature.attributes).forEach((attribute) => {
                  if (
                    attribute === attribute.toLocaleUpperCase() ||
                    exceptions.includes(attribute)
                  )
                    return;

                  // check if this attribute is an exception
                  let isException = false;
                  exceptions.forEach((exception) => {
                    if (
                      exception.toLocaleUpperCase() !==
                      attribute.toLocaleUpperCase()
                    )
                      return;

                    isException = true;
                    feature.attributes[exception] =
                      feature.attributes[attribute];
                  });

                  if (!isException) {
                    feature.attributes[attribute.toUpperCase()] =
                      feature.attributes[attribute]; // duplicate attribute with upper case key
                  }

                  delete feature.attributes[attribute]; // delete the non uppercased key
                });
              },
            );
          });
        }

        if (layerType.value !== 'VSP') {
          setGenerateResponse(res);
          return;
        }

        // this should never happen, but if sample type wasn't selected
        // exit early
        if (!localSampleType) return;

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

        // get the list of fields
        let fields: __esri.Field[] = [];
        layerDefinition.fields.forEach((field: __esri.Field) => {
          // Using Field.fromJSON to convert the Rest fields to the ArcGIS JS fields
          fields.push(Field.fromJSON(field));
        });

        // get the sample type definition (can be established or custom)
        const sampleTypeFeatureSet = {
          displayFieldName: '',
          geometryType: 'esriGeometryPolygon',
          spatialReference: {
            wkid: 3857,
          },
          fields: layerProps.data.defaultFields,
          features: [
            {
              attributes: sampleAttributes[localSampleType.value as any],
            },
          ],
        };

        getGpMaxRecordCount()
          .then((maxRecordCount) => {
            const chunkedFeatures: __esri.Graphic[][] = chunkArray(
              features,
              maxRecordCount,
            );

            // fire off the vsp import requests
            const requests: Promise<any>[] = [];
            chunkedFeatures.forEach((features) => {
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

              // fire off this request
              const params = {
                f: 'json',
                Input_VSP: inputVspSet,
                Sample_Type: localSampleType.label,
                Sample_Type_Parameters: sampleTypeFeatureSet,
              };
              appendEnvironmentObjectParam(params);

              const request = geoprocessorFetch({
                url: `${services.data.totsGPServer}/VSP%20Import`,
                inputParameters: params,
              });
              requests.push(request);
            });

            const timestamp = getCurrentDateTime();
            Promise.all(requests)
              .then((responses) => {
                // get the first result for filling in metadata
                let firstResult = responses[0].results[0].value;
                const features: any[] = [];

                // build an array with all of the features
                responses.forEach((res) => {
                  const innerFeatures: any[] = [];
                  res.results[0].value.features.forEach((feature: any) => {
                    innerFeatures.push({
                      geometry: feature.geometry,
                      attributes: {
                        ...(window as any).totsSampleAttributes[
                          localSampleType.value
                        ],
                        CREATEDDATE: timestamp,
                        OBJECTID: feature.attributes.OBJECTID,
                        GLOBALID: feature.attributes.GLOBALID,
                        PERMANENT_IDENTIFIER:
                          feature.attributes.PERMANENT_IDENTIFIER,
                        UPDATEDDATE: timestamp,
                        USERNAME: userInfo?.username || '',
                        ORGANIZATION: userInfo?.orgId || '',
                      },
                    });
                  });
                  features.push(...innerFeatures);
                });

                const layers: any[] = [];
                layerDefinition.fields = firstResult.fields;
                layerDefinition.objectIdField = 'OBJECTID';
                layers.push({
                  layerDefinition,
                  featureSet: {
                    features: features,
                    geometryType: firstResult.geometryType,
                  },
                });

                setGenerateResponse({
                  featureCollection: {
                    layers,
                  },
                });
              })
              .catch((err) => {
                console.error(err);
                setUploadStatus('failure');
                setError({
                  error: createErrorObject(err),
                  message: err.message,
                });

                window.logErrorToGa(err);
              });
          })
          .catch((err) => {
            console.error(err);
            setUploadStatus('failure');
            setError({
              error: createErrorObject(err),
              message: err.message,
            });

            window.logErrorToGa(err);
          });
      })
      .catch((err) => {
        console.error(err);
        setUploadStatus('failure');
        setError({
          error: createErrorObject(err),
          message: err.message,
        });

        window.logErrorToGa(err);
      });
  }, [
    displayDimensions,
    generalizeFeatures,
    analyzeResponse,
    file,
    portal,
    mapView,
    sharingUrl,
    layerType,
    map,
    sampleType,
    getGpMaxRecordCount,
    services,
    sampleAttributes,
    userInfo,
    layerProps,
    sceneView,
  ]);

  // validate the area and attributes of features of the uploads. If there is an
  // issue, display a popup asking the user if they would like the samples to be updated.
  useEffect(() => {
    if (
      !map ||
      !mapView ||
      !sceneView ||
      !layerType ||
      !file?.file?.esriFileType ||
      fileValidationStarted ||
      fileValidated ||
      featuresAdded
    ) {
      return;
    }
    if (layerType.value === 'Reference Layer') return;
    if (!generateResponse) return;
    if (
      !generateResponse.featureCollection?.layers ||
      generateResponse.featureCollection.layers.length === 0
    ) {
      setUploadStatus('no-data');
      return;
    }

    setFileValidationStarted(true);

    // build the list of graphics to be validated
    const features: __esri.Graphic[] = [];
    generateResponse.featureCollection.layers.forEach((layer: any) => {
      layer.featureSet.features.forEach((feature: any, _index: number) => {
        features.push(feature);
      });
    });
    const isFullGraphic = layerType.value === 'VSP' ? true : false;
    const output = sampleValidation(features, isFullGraphic);

    // display a message if any of the samples have some kind of issue
    if (output?.areaOutOfTolerance || output?.attributeMismatch) {
      setOptions({
        title: 'Sample Issues',
        ariaLabel: 'Sample Issues',
        description: sampleIssuesPopupMessage(
          output,
          sampleTypeContext.data.areaTolerance,
        ),
        onContinue: () => setFileValidated(true),
        onCancel: () => setUploadStatus('user-canceled'),
      });
    } else {
      setFileValidated(true);
    }
  }, [
    layerType,
    generateResponse,
    featuresAdded,
    file,
    fileValidationStarted,
    fileValidated,
    map,
    mapView,
    sampleTypeContext,
    sampleValidation,
    setOptions,
    sceneView,
  ]);

  // add features to the map as graphics layers. This is for every layer type
  // except for reference layers. This is so users can edit the features.
  const [newLayerName, setNewLayerName] = useState('');
  useEffect(() => {
    if (
      !map ||
      !mapView ||
      !sceneView ||
      !layerType ||
      !file?.file?.esriFileType ||
      !fileValidated ||
      featuresAdded
    ) {
      return;
    }
    if (layerType.value === 'Reference Layer') return;
    if (!generateResponse) return;
    if (
      !generateResponse.featureCollection?.layers ||
      generateResponse.featureCollection.layers.length === 0
    ) {
      setUploadStatus('no-data');
      return;
    }

    setFeaturesAdded(true);

    const popupTemplate = getPopupTemplate(layerType.value, trainingMode);
    const layerName = getLayerName(layers, file.file.name);
    setNewLayerName(layerName);

    const visible = layerType.value === 'Contamination Map' ? false : true;
    const listMode = layerType.value === 'Contamination Map' ? 'hide' : 'show';
    const layerUuid = generateUUID();
    const graphicsLayer = new GraphicsLayer({
      id: layerUuid,
      title: layerName,
      visible,
      listMode,
    });
    const pointsLayer = new GraphicsLayer({
      id: layerUuid + '-points',
      title: layerName,
      visible: false,
      listMode: 'hide',
    });
    const hybridLayer = new GraphicsLayer({
      id: layerUuid + '-hybrid',
      title: layerName,
      visible: false,
      listMode: 'hide',
    });

    const isSamplesOrVsp =
      layerType.value === 'Samples' || layerType.value === 'VSP';

    const groupLayer =
      isSamplesOrVsp && selectedScenario
        ? (map.layers.find(
            (layer) => layer.id === selectedScenario?.layerId,
          ) as __esri.GroupLayer)
        : null;

    // create the graphics layer
    const layerToAdd: LayerType = {
      id: -1,
      pointsId: -1,
      uuid: layerUuid,
      layerId: graphicsLayer.id,
      portalId: '',
      value: layerName,
      name: file.file.name,
      label: layerName,
      layerType: layerType.value,
      editType: 'add',
      visible,
      listMode,
      sort: 0,
      geometryType: 'esriGeometryPolygon',
      addedFrom: 'file',
      status: 'added',
      sketchLayer: graphicsLayer,
      hybridLayer: isSamplesOrVsp ? hybridLayer : null,
      pointsLayer: isSamplesOrVsp ? pointsLayer : null,
      parentLayer: groupLayer ? groupLayer : null,
    };

    async function processItem() {
      if (!layerType || !map || !mapView || !sceneView) return;

      const graphics: __esri.Graphic[] = [];
      const hybridGraphics: __esri.Graphic[] = [];
      const points: __esri.Graphic[] = [];
      let missingAttributes: string[] = [];
      let unknownSampleTypes: boolean = false;
      for (const layer of generateResponse.featureCollection.layers) {
        if (
          !layer?.featureSet?.features ||
          layer.featureSet.features.length === 0
        ) {
          return;
        }

        // get the features from the response and add the correct type value
        for (const feature of layer.featureSet.features) {
          if (
            !feature?.geometry?.spatialReference &&
            file.file.esriFileType === 'kml'
          ) {
            feature.geometry['spatialReference'] =
              generateResponse.lookAtExtent.spatialReference;
          }

          // non-VSP layers need to be converted from ArcGIS Rest to ArcGIS JS
          let graphic: any = feature;
          if (layerType.value !== 'VSP') graphic = Graphic.fromJSON(feature);

          // add sample layer specific attributes
          const timestamp = getCurrentDateTime();
          let uuid = generateUUID();
          if (layerType.value === 'Samples') {
            const { Notes, TYPE } = graphic.attributes;
            if (!sampleAttributes.hasOwnProperty(TYPE)) {
              unknownSampleTypes = true;
            } else {
              graphic.attributes = { ...sampleAttributes[TYPE] };

              graphic.attributes['AA'] = null;
              graphic.attributes['AC'] = null;
              graphic.attributes['CREATEDDATE'] = timestamp;
              graphic.attributes['PERMANENT_IDENTIFIER'] = uuid;
              graphic.attributes['DECISIONUNITUUID'] = layerToAdd.uuid;
              graphic.attributes['DECISIONUNIT'] = layerToAdd.label;
              graphic.attributes['DECISIONUNITSORT'] = 0;
              graphic.attributes['GLOBALID'] = uuid;
              graphic.attributes['Notes'] = Notes;
            }
          }
          if (layerType.value === 'VSP') {
            const { CREATEDDATE, ShapeType, SHAPETYPE } = graphic.attributes;

            graphic.attributes['AA'] = null;
            graphic.attributes['AC'] = null;
            graphic.attributes['DECISIONUNITUUID'] = layerToAdd.uuid;
            graphic.attributes['DECISIONUNIT'] = layerToAdd.label;
            graphic.attributes['DECISIONUNITSORT'] = 0;
            if (!CREATEDDATE) graphic.attributes['CREATEDDATE'] = timestamp;
            if (!ShapeType && SHAPETYPE)
              graphic.attributes['ShapeType'] = SHAPETYPE;
          }

          // add a layer type to the graphic
          if (!graphic?.attributes?.TYPE) {
            graphic.attributes['TYPE'] = layerType.value;
          }

          // add ids to the graphic, if the graphic doesn't already have them
          if (!graphic.attributes.PERMANENT_IDENTIFIER) {
            graphic.attributes['PERMANENT_IDENTIFIER'] = uuid;
          }
          if (!graphic.attributes.GLOBALID) {
            graphic.attributes['GLOBALID'] = uuid;
          }

          // verify the graphic has all required attributes
          const missingFields = fileVerification(
            layerType.value,
            graphic.attributes,
          );
          if (missingFields.length > 0) {
            missingFields.forEach((item) => {
              if (missingAttributes.includes(item)) return;

              missingAttributes.push(item);
            });
          }

          // set the symbol styles based on the sample/layer type
          if (
            defaultSymbols.symbols.hasOwnProperty(graphic.attributes.TYPEUUID)
          ) {
            graphic.symbol =
              defaultSymbols.symbols[graphic.attributes.TYPEUUID];
          } else {
            graphic.symbol =
              defaultSymbols.symbols[
                layerType.value === 'VSP' ? 'Samples' : layerType.value
              ];
          }

          // add the popup template
          graphic.popupTemplate = new PopupTemplate(popupTemplate);
          if (layerType.value === 'VSP') graphic = new Graphic(graphic);

          // update the z values
          await setZValues({ map, graphic });

          // Add graphics to the layers based on what the original geometry type is
          if (graphic.geometry.type === 'point') {
            const pointGraphic = new Graphic({
              attributes: graphic.attributes,
              geometry: graphic.geometry,
              popupTemplate: graphic.popupTemplate,
              symbol: getPointSymbol(graphic),
            });
            points.push(pointGraphic);
            hybridGraphics.push(pointGraphic.clone());

            const polyGraphic = graphic.clone();
            createBuffer(polyGraphic);
            graphics.push(polyGraphic);
          } else {
            graphics.push(graphic);
            hybridGraphics.push(
              graphic.attributes.ShapeType === 'point'
                ? convertToPoint(graphic)
                : graphic.clone(),
            );
            points.push(convertToPoint(graphic));
          }
        }
      }

      if (unknownSampleTypes) {
        setUploadStatus('unknown-sample-type');
        return;
      }

      if (missingAttributes.length > 0) {
        setUploadStatus('missing-attributes');
        const sortedMissingAttributes = missingAttributes.sort();
        const missingAttributesStr =
          sortedMissingAttributes.slice(0, -1).join(', ') +
          ' and ' +
          sortedMissingAttributes.slice(-1);

        setMissingAttributes(missingAttributesStr);
        return;
      }

      graphicsLayer.addMany(graphics);
      pointsLayer.addMany(points);
      hybridLayer.addMany(hybridGraphics);

      // make a copy of the edits context variable
      const editsCopy = updateLayerEdits({
        edits,
        scenario: isSamplesOrVsp ? selectedScenario : null,
        layer: layerToAdd,
        type: 'add',
        changes: graphicsLayer.graphics,
      });

      setEdits(editsCopy);

      setLayers([...layers, layerToAdd]);

      map.add(graphicsLayer);

      if (isSamplesOrVsp) {
        map.add(pointsLayer);
        map.add(hybridLayer);

        setSelectedScenario((selectedScenario) => {
          if (!selectedScenario) return selectedScenario;

          const scenario = editsCopy.edits.find(
            (edit) =>
              edit.type === 'scenario' &&
              edit.layerId === selectedScenario.layerId,
          ) as ScenarioEditsType;
          const newLayer = scenario.layers.find(
            (layer) => layer.layerId === layerToAdd.layerId,
          );

          if (!newLayer) return selectedScenario;

          return {
            ...selectedScenario,
            layers: [...selectedScenario.layers, newLayer],
          };
        });

        setSketchLayer(layerToAdd);
      }

      // zoom to the layer unless it is a contamination map
      if (graphics.length > 0 && layerType.value !== 'Contamination Map') {
        if (selectedScenario && groupLayer && isSamplesOrVsp) {
          groupLayer.add(layerToAdd.sketchLayer);
          if (layerToAdd.pointsLayer) {
            groupLayer.add(layerToAdd.pointsLayer);
          }
          if (layerToAdd.hybridLayer) {
            groupLayer.add(layerToAdd.hybridLayer);
          }
        } else {
          const view = displayDimensions === '3d' ? sceneView : mapView;
          view.goTo(graphics);
        }
      }

      setUploadStatus('success');
    }

    processItem();
  }, [
    createBuffer,
    defaultSymbols,
    displayDimensions,
    edits,
    setEdits,
    featuresAdded,
    file,
    fileValidated,
    generateResponse,
    getPopupTemplate,
    layers,
    setLayers,
    layerType,
    map,
    mapView,
    sampleAttributes,
    selectedScenario,
    setSelectedScenario,
    sceneView,
    setSketchLayer,
    trainingMode,
  ]);

  // add features to the map as feature layers. This is only for reference layer
  // types. This is so users can view popups but not edit the features.
  useEffect(() => {
    if (
      !map ||
      !mapView ||
      !sceneView ||
      !layerType ||
      !file?.file?.esriFileType ||
      featuresAdded
    ) {
      return;
    }
    if (layerType.value !== 'Reference Layer') return;
    if (!generateResponse) return;
    if (
      !generateResponse.featureCollection?.layers ||
      generateResponse.featureCollection.layers.length === 0
    ) {
      setUploadStatus('no-data');
      return;
    }

    setFeaturesAdded(true);

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
          file.file.esriFileType === 'kml'
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

      const layerName = getLayerName(layers, file.file.name);
      setNewLayerName(layerName);
      const layerProps: __esri.FeatureLayerProperties = {
        fields,
        objectIdField: layer.layerDefinition.objectIdField,
        outFields: ['*'],
        source: features,
        title: layerName,
        renderer,
        popupTemplate,
      };

      // create the feature layer
      const layerToAdd = new FeatureLayer(layerProps);
      featureLayers.push(layerToAdd);

      setReferenceLayers([
        ...referenceLayers,
        {
          ...layerProps,
          rawLayer: layer,
          layerId: layerToAdd.id,
          portalId: '',
        },
      ]);
    });

    map.addMany(featureLayers);
    const view = displayDimensions === '3d' ? sceneView : mapView;
    if (graphicsAdded.length > 0) view.goTo(graphicsAdded);

    setUploadStatus('success');
  }, [
    displayDimensions,
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
    sceneView,
  ]);

  // handle loading of the KMLLayer
  useEffect(() => {
    if (
      !file?.file?.esriFileType ||
      !mapView ||
      !sceneView ||
      file.file.esriFileType !== 'kml'
    ) {
      return;
    }
    if (file.file.name === file.lastFileName) return;

    // read in the file
    const reader = new FileReader();
    reader.onload = function (event: Event) {
      if (reader.error || !event || !reader.result) {
        console.error('File Read Error: ', reader.error);
        setUploadStatus('file-read-error');
        setError({
          error: createErrorObject(reader.error),
          message: reader.error?.message ? reader.error.message : '',
        });
        return;
      }

      // build the arcgis kml call
      // this data is used to get the renderers
      const view = displayDimensions === '3d' ? sceneView : mapView;
      const kmlUrl = 'https://utility.arcgis.com/sharing/kml';
      const contents = reader.result as string;
      const params = {
        kmlString: encodeURIComponent(contents),
        model: 'simple',
        folders: '',
        outSR: view.spatialReference,
      };
      appendEnvironmentObjectParam(params);

      fetchPost(kmlUrl, params)
        .then((res: any) => {
          setGenerateResponse(res);
        })
        .catch((err) => {
          console.error(err);
          setUploadStatus('failure');
          setError({
            error: createErrorObject(err),
            message: err.message,
          });

          window.logErrorToGa(err);
        });
    };

    try {
      reader.readAsText(file.file);
    } catch (ex) {
      console.error('File Read Error: ', ex);
      setUploadStatus('file-read-error');

      window.logErrorToGa(ex);
    }
  }, [displayDimensions, file, mapView, sceneView]);

  const filename = file?.file?.name ? file.file.name : '';

  return (
    <div css={searchContainerStyles}>
      <label htmlFor="layer-type-select-input">Layer Type</label>
      <Select
        id="layer-type-select"
        inputId="layer-type-select-input"
        css={selectStyles}
        value={layerType}
        onChange={(ev) => {
          setLayerType(ev as LayerSelectType);
          setUploadStatus('');
          setError(null);
        }}
        options={
          trainingMode
            ? layerOptions
            : layerOptions.filter(
                (option) => option.value !== 'Contamination Map',
              )
        }
      />
      {!layerType ? (
        <Fragment>
          <p css={sectionParagraph}>Locate the file you want to import.</p>
          <div css={sectionParagraph}>
            <MessageBox
              severity="warning"
              title="Requirements for uploading files:"
              message={
                <Fragment>
                  <p css={layerInfo}>
                    <strong>Shapefile</strong> - ZIP archive containing all
                    required shapefile files
                  </p>
                  <p css={layerInfo}>
                    <strong>CSV or TXT</strong> - files with optional address,
                    place or coordinate locations (comma, semi-colon or tab
                    delimited)
                  </p>
                  <p css={layerInfo}>
                    <strong>GPX</strong> - GPS Exchange Format
                  </p>
                  <p css={layerInfo}>
                    <strong>GeoJSON</strong> - open standard format for simple
                    geographical
                  </p>
                </Fragment>
              }
            />
          </div>
        </Fragment>
      ) : (
        <Fragment>
          {layerType.value === 'VSP' &&
            services.status === 'success' &&
            sampleTypeContext.status === 'success' && (
              <Fragment>
                <label htmlFor="sample-type-select-input">Sample Type</label>
                <Select
                  id="sample-type-select"
                  inputId="sample-type-select-input"
                  css={selectStyles}
                  value={sampleType}
                  onChange={(ev) => {
                    setSampleType(ev as SampleSelectType);
                    setUploadStatus('');
                  }}
                  options={allSampleOptions}
                />
                {sampleType && (
                  <p css={sectionParagraph}>
                    Add an externally-generated Visual Sample Plan (VSP) layer
                    to analyze and/or use in conjunction with targeted sampling.
                    Once added, you can select this layer in the next step,{' '}
                    <strong>Create Plan</strong>, and use it to create the
                    Sampling Plan.
                  </p>
                )}
              </Fragment>
            )}
          {(layerType.value === 'Samples' || layerType.value === 'VSP') &&
            (services.status === 'fetching' ||
              sampleTypeContext.status === 'fetching' ||
              layerProps.status === 'fetching') && <LoadingSpinner />}
          {layerType.value === 'Samples' &&
            (services.status === 'failure' ||
              sampleTypeContext.status === 'failure' ||
              layerProps.status === 'failure') &&
            featureNotAvailableMessage('Samples Import')}
          {layerType.value === 'VSP' &&
            (services.status === 'failure' ||
              sampleTypeContext.status === 'failure' ||
              layerProps.status === 'failure') &&
            featureNotAvailableMessage('VSP Import')}
          {(layerType.value === 'Area of Interest' ||
            layerType.value === 'Reference Layer' ||
            layerType.value === 'Contamination Map' ||
            (layerType.value === 'Samples' &&
              services.status === 'success' &&
              sampleTypeContext.status === 'success' &&
              layerProps.status === 'success') ||
            (layerType.value === 'VSP' &&
              sampleType &&
              services.status === 'success' &&
              sampleTypeContext.status === 'success' &&
              layerProps.status === 'success')) && (
            <Fragment>
              {uploadStatus === 'fetching' && <LoadingSpinner />}
              {uploadStatus !== 'fetching' && (
                <Fragment>
                  {layerType.value === 'Contamination Map' && (
                    <Fragment>
                      <p css={sectionParagraph}>
                        Polygon layer containing the area of contamination as
                        well as the concentration of the contamination. This
                        layer can be compared against the sampling plan to see
                        how well the sample locations are placed to predict the
                        contamination. Once added, you can select this layer in
                        the <strong>Calculate Resources</strong> step and then
                        view the comparison against your sampling plan.
                      </p>
                      <div css={sectionParagraph}>
                        <MessageBox
                          severity="warning"
                          title="The Contamination Map layer must include the following attributes to be uploaded:"
                          message={
                            <Fragment>
                              <p css={layerInfo}>
                                <strong>CONTAMTYPE</strong> (domain values:
                                chemical, radiological, biological)
                              </p>
                              <p css={layerInfo}>
                                <strong>CONTAMVAL</strong> (integer value)
                              </p>
                              <p css={layerInfo}>
                                <strong>CONTAMUNIT</strong> (domain values: cfu,
                                others TBD)
                              </p>
                            </Fragment>
                          }
                        />
                      </div>
                    </Fragment>
                  )}
                  {layerType.value === 'Samples' && (
                    <Fragment>
                      <p css={sectionParagraph}>
                        Layer containing pre-existing samples to use as a
                        starting point in the next step,{' '}
                        <strong>Create Plan</strong>. The Sample layer must
                        include the <strong>TYPE</strong> (Sponge, Micro Vac,
                        Wet Vac, Robot, Aggressive Air, or Swab) attribute to be
                        uploaded.
                      </p>
                    </Fragment>
                  )}
                  {layerType.value === 'Reference Layer' && (
                    <Fragment>
                      <p css={sectionParagraph}>
                        Additional contextual reference layers to include in
                        your analysis (e.g., building footprints, landmarks,
                        etc.). This layer will be added to the map and can be
                        accessed from the Legend panel.
                      </p>
                      <div css={sectionParagraph}>
                        <MessageBox
                          severity="warning"
                          title="Image Format Limitations"
                          message={
                            <p css={layerInfo}>
                              Image format limitations exist for viewing imagery
                              on the web. You must properly "pre-process" and
                              format imagery using standard Esri desktop-based
                              tools (e.g., ArcGIS Pro) and then cache and share
                              the imagery as a tiled map service in ArcGIS
                              Online for display within TOTS.
                            </p>
                          }
                        />
                      </div>
                    </Fragment>
                  )}
                  {layerType.value === 'Area of Interest' && (
                    <Fragment>
                      <p css={sectionParagraph}>
                        A polygon file that bounds the extent of your project
                        area. This layer is used to bound where samples are
                        plotted when using the{' '}
                        <strong>Add Multiple Random Samples</strong> feature in
                        the next step, <strong>Create Plan</strong>.
                      </p>
                    </Fragment>
                  )}
                  {layerType.value === 'VSP' && (
                    <p>
                      <strong>WARNING</strong>: VSP Imports can take up to two
                      minutes to complete.
                    </p>
                  )}
                  {uploadStatus === 'invalid-file-type' &&
                    invalidFileTypeMessage(filename)}
                  {uploadStatus === 'import-error' &&
                    error &&
                    webServiceErrorMessage(error, 'File Upload Error')}
                  {uploadStatus === 'file-read-error' &&
                    fileReadErrorMessage(filename)}
                  {uploadStatus === 'no-data' && noDataMessage(filename)}
                  {uploadStatus === 'user-canceled' &&
                    userCanceledMessage(filename)}
                  {uploadStatus === 'missing-attributes' &&
                    missingAttributesMessage(filename, missingAttributes)}
                  {uploadStatus === 'unknown-sample-type' &&
                    unknownSampleTypeMessage}
                  {uploadStatus === 'failure' &&
                    error &&
                    webServiceErrorMessage(error)}
                  {uploadStatus === 'success' &&
                    uploadSuccessMessage(filename, newLayerName)}
                  {layerType.value === 'Area of Interest' && (
                    <ColorPicker
                      symbol={defaultSymbols.symbols['Area of Interest']}
                      onChange={(symbol: PolygonSymbol) => {
                        setDefaultSymbolSingle('Area of Interest', symbol);
                      }}
                    />
                  )}
                  {layerType.value === 'Contamination Map' && (
                    <ColorPicker
                      symbol={defaultSymbols.symbols['Contamination Map']}
                      onChange={(symbol: PolygonSymbol) => {
                        setDefaultSymbolSingle('Contamination Map', symbol);
                      }}
                    />
                  )}
                  <input
                    id="generalize-features-input"
                    type="checkbox"
                    css={checkBoxStyles}
                    checked={generalizeFeatures}
                    onChange={(ev) =>
                      setGeneralizeFeatures(!generalizeFeatures)
                    }
                  />
                  <label htmlFor="generalize-features-input">
                    Generalize features for web display
                  </label>
                  <br />
                  <div {...getRootProps({ className: 'dropzone' })}>
                    <input
                      id="tots-dropzone"
                      data-testid="tots-dropzone"
                      {...getInputProps()}
                    />
                    {isDragActive ? (
                      <p>Drop the files here ...</p>
                    ) : (
                      <div css={fileIconTextColor}>
                        <div>
                          <FileIcon label="Shape File" />
                          <FileIcon label="CSV" />
                          <FileIcon label="KML" />
                          <br />
                          <FileIcon label="GPX" />
                          <FileIcon label="Geo JSON" />
                        </div>
                        <br />
                        <label htmlFor="tots-dropzone">Drop or Browse</label>
                        <br />
                        <button onClick={open}>Browse</button>
                      </div>
                    )}
                  </div>
                </Fragment>
              )}
            </Fragment>
          )}
        </Fragment>
      )}
    </div>
  );
}

export default FilePanel;
