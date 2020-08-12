import { v4 as uuidv4 } from 'uuid';
// types
import {
  EditsType,
  EditType,
  LayerEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import { LayerType, LayerTypeName } from 'types/Layer';
import { PolygonSymbol } from 'config/sampleAttributes';

/**
 * This function performs a deep copy, exluding functions,
 * of an object. This is mainly used for setting the edits
 * context variable.
 *
 * @param obj The object to copy.
 */
export function deepCopyObject(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * This function attempts to find the layer in edits.
 *
 * @param edits All of the sketch edits that have occurred
 * @param layerToFind The layer to find within the edits object
 * @returns the layer that was found in the edits object
 */
export function findLayerInEdits(
  edits: (ScenarioEditsType | LayerEditsType)[],
  layerId: string,
) {
  // find the layer in the edits using it's id and name
  let scenarioIndex = -1;
  let layerIndex = -1;
  edits.forEach((edit, scenarioIdx) => {
    if (edit.type === 'layer' && edit.layerId === layerId) {
      // the desired item is a layer
      layerIndex = scenarioIdx;
    } else if (edit.type === 'scenario' && edit.layerId === layerId) {
      // the desired item is a scenario
      scenarioIndex = scenarioIdx;
    } else if (edit.type === 'scenario') {
      // search for the layer in scenarios
      edit.layers.forEach((layer, layerIdx) => {
        if (layer.layerId === layerId) {
          scenarioIndex = scenarioIdx;
          layerIndex = layerIdx;
        }
      });
    }
  });

  // get the scenario if the index was found
  let editsScenario: ScenarioEditsType | null = null;
  if (scenarioIndex > -1) {
    editsScenario = edits[scenarioIndex] as ScenarioEditsType;
  }

  // get the layer if the index was found
  let editsLayer: LayerEditsType | null = null;
  if (editsScenario && layerIndex > -1) {
    // the layer is nested in a scenario
    editsLayer = editsScenario.layers[layerIndex];
  } else {
    // the layer is unlinked and at the root
    editsLayer = edits[layerIndex] as LayerEditsType;
  }

  return {
    scenarioIndex,
    layerIndex,
    editsScenario,
    editsLayer,
  };
}

/**
 * Creates the edit template for sketchable layers.
 *
 * @param layerToEdit The layer object
 * @returns object representing the layer edit template
 */
export function createLayerEditTemplate(
  layerToEdit: LayerType,
  editType: EditType,
) {
  return {
    type: 'layer',
    id: layerToEdit.id,
    layerId: layerToEdit.sketchLayer.id,
    portalId: layerToEdit.portalId,
    name: layerToEdit.name,
    label: layerToEdit.label,
    layerType: layerToEdit.layerType,
    hasContaminationRan: false,
    addedFrom: layerToEdit.addedFrom,
    status: layerToEdit.status,
    editType,
    visible: layerToEdit.visible,
    listMode: layerToEdit.listMode,
    adds: [],
    updates: [],
    deletes: [],
    published: [],
  } as LayerEditsType;
}

/**
 * Converts an esri graphic object into a simpler object
 * for storing in the user's session storage.
 *
 * @param graphic The esri graphic to be stored
 * @returns simple graphic object with just attributes and geometry
 */
export function convertToSimpleGraphic(graphic: __esri.Graphic) {
  let geometry: __esri.Polygon | object = {};
  if (graphic?.geometry?.type === 'polygon') {
    geometry = graphic.geometry as __esri.Polygon;
  }

  // currently we only have polygons
  // in the future we may need to add code to handle different geometry types
  return {
    attributes: graphic.attributes ? { ...graphic.attributes } : {},
    geometry: geometry,
  };
}

/**
 * Updates the edits object with the provided changes.
 *
 * @param edits The edits object to save the changes to.
 * @param scenario Used for adding a layer to a scenario.
 * @param layer The layer the changes pertain to
 * @param type The type of update being performed (add, update, delete, arcgis, or properties)
 * @param changes An object representing the changes being saved
 * @param hasContaminationRan Keeps track of whether or not contamination has ran for this layer
 */
export function updateLayerEdits({
  edits,
  scenario,
  layer,
  type,
  changes,
  hasContaminationRan = false,
}: {
  edits: EditsType;
  scenario?: ScenarioEditsType | null;
  layer: LayerType;
  type: EditType;
  changes?: __esri.Collection<__esri.Graphic>;
  hasContaminationRan?: boolean;
}) {
  // make a copy of the edits context variable
  const editsCopy = deepCopyObject(edits) as EditsType;

  // find the layer's edit structure
  let { editsScenario, editsLayer } = findLayerInEdits(
    editsCopy.edits,
    layer.layerId,
  );
  if (scenario) {
    // find the provided scenario
    editsScenario = findLayerInEdits(editsCopy.edits, scenario.layerId)
      .editsScenario;
  }

  // if it was not found create the edit template for this layer and
  // add it to the copy of edits
  if (!editsLayer) {
    editsLayer = createLayerEditTemplate(layer, type);

    // add the layer to a scenario if a scenario was found,
    // otherwise add the layer to the root of edits.
    if (editsScenario) {
      editsScenario.layers.push(editsLayer);
    } else {
      editsCopy.edits.push(editsLayer);
    }
  } else {
    // handle property changes
    if (editsScenario) {
      editsScenario.visible = layer.visible;
      editsScenario.listMode = layer.listMode;
    }

    editsLayer.visible = layer.visible;
    editsLayer.listMode = layer.listMode;
    editsLayer.name = layer.name;
    editsLayer.label = layer.name;

    // if the status is published, set the status to edited to allow re-publishing
    if (layer.status === 'published') layer.status = 'edited';
    if (editsLayer.status === 'published') editsLayer.status = 'edited';
  }

  editsLayer.editType = type;

  // set the hasContaminationRan value (default is false)
  if (editsScenario) editsScenario.hasContaminationRan = hasContaminationRan;
  editsLayer.hasContaminationRan = hasContaminationRan;

  if (changes) {
    // Add new graphics
    if (type === 'add') {
      changes.forEach((change) => {
        const formattedChange = convertToSimpleGraphic(change);
        editsLayer.adds.push(formattedChange);
      });
    }

    // Add published graphics from arcgis
    if (type === 'arcgis') {
      changes.forEach((change) => {
        const formattedChange = convertToSimpleGraphic(change);
        editsLayer.published.push(formattedChange);
      });
    }

    // Apply the updates
    if (type === 'update') {
      changes.forEach((change) => {
        // all updates should have a graphicid
        if (!change?.attributes?.PERMANENT_IDENTIFIER) return;

        // attempt to find the graphic in edits.adds
        const addChangeIndex = editsLayer.adds.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );
        if (addChangeIndex > -1) {
          // Update the added item  and exit
          const formattedChange = convertToSimpleGraphic(change);
          editsLayer.adds[addChangeIndex] = formattedChange;

          return; // essentially a break on the forEach loop
        }

        // attempt to find the graphic in edits
        const existingChangeIndex = editsLayer.updates.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );

        // update the existing change, otherwise add the change to the updates
        const formattedChange = convertToSimpleGraphic(change);
        if (existingChangeIndex > -1) {
          editsLayer.updates[existingChangeIndex] = formattedChange;
        } else {
          editsLayer.updates.push(formattedChange);
        }
      });
    }

    // Append any deletes of items that have already been published
    if (type === 'delete') {
      // if this graphic is in the adds array, just delete it from the
      // adds array, since it hasn't been published yet
      changes.forEach((change) => {
        // attempt to find this id in adds
        const addChangeIndex = editsLayer.adds.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );
        if (addChangeIndex > -1) {
          // remove from adds and don't add to deletes
          editsLayer.adds = editsLayer.adds.filter(
            (graphic) =>
              graphic.attributes.PERMANENT_IDENTIFIER !==
              change.attributes.PERMANENT_IDENTIFIER,
          );

          return; // essentially a break on the forEach loop
        }

        // if the objectid is in the update list, remove it
        // attempt to find the graphic in edits
        editsLayer.updates = editsLayer.updates.filter(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER !==
            change.attributes.PERMANENT_IDENTIFIER,
        );

        // add the objectids to delete to the deletes array
        editsLayer.deletes.push({
          PERMANENT_IDENTIFIER: change.attributes.PERMANENT_IDENTIFIER,
          GLOBALID: change.attributes.GLOBALID,
        });
      });
    }
  }

  editsCopy.count = editsCopy.count + 1;

  return editsCopy;
}

/**
 * Creates a simple popup that contains all of the attributes on the
 * graphic.
 *
 * @param attributes Attributes to be placed in the popup content
 * @returns the json object to pass to the Esri PopupTemplate constructor.
 */
export function getSimplePopupTemplate(attributes: any) {
  return {
    title: '',
    content: [
      {
        type: 'fields',
        fieldInfos: Object.keys(attributes).map((key) => {
          return { fieldName: key, label: key };
        }),
      },
    ],
  };
}

/**
 * Creates a popup that contains all of the attributes with human readable labels.
 * The attributes displayed depends on the type provided.
 * Note: Reference layers will return an empty object. Reference layers should not use
 *  this function for getting the popup.
 *
 * @param type - The layer type to get the popup for.
 * @param includeContaminationFields - If true the contamination map fields will be included in the samples popups.
 * @returns the json object to pass to the Esri PopupTemplate constructor.
 */
export function getPopupTemplate(
  type: LayerTypeName,
  includeContaminationFields: boolean = false,
) {
  if (type === 'Area of Interest') {
    return {
      title: '',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'TYPE', label: 'Type' },
            { fieldName: 'Notes', label: 'Notes' },
          ],
        },
      ],
    };
  }
  if (type === 'Contamination Map') {
    return {
      title: '',
      content: [
        {
          type: 'fields',
          fieldInfos: [
            { fieldName: 'TYPE', label: 'Type' },
            { fieldName: 'CONTAMTYPE', label: 'Contamination Type' },
            { fieldName: 'CONTAMVAL', label: 'Activity' },
            { fieldName: 'CONTAMUNIT', label: 'Unit of Measure' },
          ],
        },
      ],
    };
  }
  if (type === 'Samples' || type === 'VSP') {
    const fieldInfos = [
      { fieldName: 'TYPE', label: 'Sample Type' },
      {
        fieldName: 'TTPK',
        label: 'Time to Prepare Kits (person hrs/sample)',
      },
      { fieldName: 'TTC', label: 'Time to Collect (person hrs/sample)' },
      { fieldName: 'TTA', label: 'Time to Analyze (person hrs/sample)' },
      {
        fieldName: 'TTPS',
        label: 'Total Time per Sample (person hrs/sample)',
      },
      { fieldName: 'LOD_P', label: 'Limit of Detection (CFU) Porous' },
      {
        fieldName: 'LOD_NON',
        label: 'Limit of Detection (CFU) Nonporous',
      },
      { fieldName: 'MCPS', label: 'Material Cost ($/sample)' },
      {
        fieldName: 'TCPS',
        label: 'Total Cost Per Sample (Labor + Material + Waste)',
      },
      { fieldName: 'WVPS', label: 'Waste Volume (L/sample)' },
      { fieldName: 'WWPS', label: 'Waste Weight (lbs/sample)' },
      { fieldName: 'SA', label: 'Reference Surface Area (sq inch)' },
      { fieldName: 'AA', label: 'Actual Surface Area (sq inch)' },
      { fieldName: 'AC', label: 'Number of Equivalent TOTS Samples' },
      { fieldName: 'Notes', label: 'Notes' },
      { fieldName: 'ALC', label: 'Analysis Labor Cost' },
      { fieldName: 'AMC', label: 'Analysis Material Cost' },
    ];

    // add the contamination map related fields if necessary
    if (includeContaminationFields) {
      fieldInfos.push({ fieldName: 'CONTAMTYPE', label: 'Contamination Type' });
      fieldInfos.push({ fieldName: 'CONTAMVAL', label: 'Activity' });
      fieldInfos.push({ fieldName: 'CONTAMUNIT', label: 'Unit of Measure' });
    }

    return {
      title: '',
      content: [
        {
          type: 'fields',
          fieldInfos,
        },
      ],
    };
  }

  return {};
}

/**
 * Generates a unique identifier (uuid) in uppercase.
 *
 * @returns string - A unique identifier (uuid).
 */
export function generateUUID() {
  return '{' + uuidv4().toUpperCase() + '}';
}

/**
 * Takes the graphics from the provided array of layers and
 * combines them in to a single array of graphics. Helpful
 * for zooming to multiple graphics layers.
 *
 * @param Layers - The layers to get a combined graphics array from.
 * @returns extent - The extent of the graphics layers
 */
export function getGraphicsArray(layers: (LayerType | null)[]) {
  let zoomGraphics: __esri.Graphic[] = [];
  layers.forEach((layer) => {
    if (layer?.sketchLayer?.type === 'graphics') {
      zoomGraphics = zoomGraphics.concat(layer.sketchLayer.graphics.toArray());
    }
  });

  return zoomGraphics;
}

/**
 * Gets a timestamp for the current date time formatted as
 * YYYY/MM/DD hh:mm:ss.s
 *
 * @returns a formatted timestamp of the current date/time
 */
export function getCurrentDateTime() {
  const currentdate = new Date();
  return (
    currentdate.getFullYear() +
    '/' +
    String(currentdate.getMonth() + 1).padStart(2, '0') +
    '/' +
    String(currentdate.getDate()).padStart(2, '0') +
    ' ' +
    String(currentdate.getHours()).padStart(2, '0') +
    ':' +
    String(currentdate.getMinutes()).padStart(2, '0') +
    ':' +
    String(currentdate.getSeconds()).padStart(2, '0') +
    '.' +
    currentdate.getMilliseconds()
  );
}

/**
 * Builds the default sample layer.
 *
 * @param GraphicsLayer The esri graphics layer constructor object
 * @param name The name of the new layer
 * @param parentLayer (optional) The parent layer of the new layer
 * @returns LayerType The default sample layer
 */
export function createSampleLayer(
  GraphicsLayer: __esri.GraphicsLayerConstructor,
  name: string = 'Default Sample Layer',
  parentLayer: __esri.GroupLayer | null = null,
) {
  const graphicsLayer = new GraphicsLayer({ title: name });

  return {
    id: -1,
    layerId: graphicsLayer.id,
    portalId: '',
    value: graphicsLayer.id,
    name,
    label: name,
    layerType: 'Samples',
    editType: 'add',
    visible: true,
    listMode: 'show',
    geometryType: 'esriGeometryPolygon',
    addedFrom: 'sketch',
    status: 'added',
    sketchLayer: graphicsLayer,
    parentLayer,
  } as LayerType;
}

/**
 * Builds the default area of interest layer.
 *
 * @param GraphicsLayer The esri graphics layer constructor object
 * @returns LayerType The default area of interest layer
 */
export function getDefaultAreaOfInterestLayer(
  GraphicsLayer: __esri.GraphicsLayerConstructor,
) {
  const graphicsLayer = new GraphicsLayer({
    title: 'Sketched Area of Interest',
  });

  return {
    id: -1,
    layerId: graphicsLayer.id,
    portalId: '',
    value: 'sketchAoi',
    name: 'Sketched Area of Interest',
    label: 'Sketched Area of Interest',
    layerType: 'Area of Interest',
    scenarioName: '',
    scenarioDescription: '',
    editType: 'add',
    visible: true,
    listMode: 'show',
    geometryType: 'esriGeometryPolygon',
    addedFrom: 'sketch',
    status: 'added',
    sketchLayer: graphicsLayer,
    parentLayer: null,
  } as LayerType;
}

/**
 * Updates the symbols of all of the graphics within the provided
 * graphics layers with the provided polygonSymbol.
 *
 * @param layers - The layers to update. FeatureLayers will be ignored.
 * @param polygonSymbol - The new polygon symbol.
 */
export function updatePolygonSymbol(
  layers: LayerType[],
  polygonSymbol: PolygonSymbol,
) {
  layers.forEach((layer) => {
    if (layer.sketchLayer.type !== 'graphics') return;

    layer.sketchLayer.graphics.forEach((graphic) => {
      if (graphic.geometry.type !== 'polygon') return;
      graphic.symbol = polygonSymbol as any;
    });
  });
}
