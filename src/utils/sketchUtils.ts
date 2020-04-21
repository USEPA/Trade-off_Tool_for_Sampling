import { v4 as uuidv4 } from 'uuid';
// types
import { EditsType, LayerEditsType } from 'types/Edits';
import { LayerType, LayerTypeName } from 'types/Layer';

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
  edits: LayerEditsType[],
  layerToFind: LayerType,
) {
  // find the layer in the edits using it's id and name
  const index = edits.findIndex(
    (layer) => layer.layerId === layerToFind.layerId,
  );
  const layer = edits[index];

  return layer;
}

/**
 * Creates the edit template for sketchable layers.
 *
 * @param layerToEdit The layer object
 * @returns object representing the layer edit template
 */
export function createLayerEditTemplate(layerToEdit: LayerType) {
  return {
    id: layerToEdit.id,
    layerId: layerToEdit.sketchLayer.id,
    portalId: layerToEdit.portalId,
    name: layerToEdit.name,
    label: layerToEdit.label,
    layerType: layerToEdit.layerType,
    scenarioName: layerToEdit.scenarioName,
    scenarioDescription: layerToEdit.scenarioDescription,
    addedFrom: layerToEdit.addedFrom,
    status: layerToEdit.status,
    adds: [],
    updates: [],
    deletes: [],
    published: [],
  };
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
    attributes: graphic.attributes ? graphic.attributes : {},
    geometry: geometry,
  };
}

/**
 * Updates the edits object with the provided changes.
 *
 * @param edits The edits object to save the changes to.
 * @param layer The layer the changes pertain to
 * @param type The type of update being performed (add, update, delete, arcgis, or properties)
 * @param changes An object representing the changes being saved
 */
export function updateLayerEdits({
  edits,
  layer,
  type,
  changes,
}: {
  edits: EditsType;
  layer: LayerType;
  type: 'add' | 'update' | 'delete' | 'arcgis' | 'properties';
  changes?: __esri.Collection<__esri.Graphic>;
}) {
  // make a copy of the edits context variable
  const editsCopy = deepCopyObject(edits) as EditsType;

  // find the layer's edit structure
  let layerToEdit = findLayerInEdits(editsCopy.edits, layer);

  // if it was not found create the edit template for this layer and
  // add it to the copy of edits
  if (!layerToEdit) {
    layerToEdit = createLayerEditTemplate(layer);
    editsCopy.edits.push(layerToEdit);
  } else {
    // handle property changes
    layerToEdit.scenarioName = layer.scenarioName;
    layerToEdit.scenarioDescription = layer.scenarioDescription;

    // if the status is published, set the status to edited to allow re-publishing
    if (layer.status === 'published') layer.status = 'edited';
    if (layerToEdit.status === 'published') layerToEdit.status = 'edited';
  }

  if (changes) {
    // Add new graphics
    if (type === 'add') {
      changes.forEach((change) => {
        const formattedChange = convertToSimpleGraphic(change);
        layerToEdit.adds.push(formattedChange);
      });
    }

    // Add published graphics from arcgis
    if (type === 'arcgis') {
      changes.forEach((change) => {
        const formattedChange = convertToSimpleGraphic(change);
        layerToEdit.published.push(formattedChange);
      });
    }

    // Apply the updates
    if (type === 'update') {
      changes.forEach((change) => {
        // all updates should have a graphicid
        if (!change?.attributes?.PERMANENT_IDENTIFIER) return;

        // attempt to find the graphic in edits.adds
        const addChangeIndex = layerToEdit.adds.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );
        if (addChangeIndex > -1) {
          // Update the added item  and exit
          const formattedChange = convertToSimpleGraphic(change);
          layerToEdit.adds[addChangeIndex] = formattedChange;

          return; // essentially a break on the forEach loop
        }

        // attempt to find the graphic in edits
        const existingChangeIndex = layerToEdit.updates.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );

        // update the existing change, otherwise add the change to the updates
        const formattedChange = convertToSimpleGraphic(change);
        if (existingChangeIndex > -1) {
          layerToEdit.updates[existingChangeIndex] = formattedChange;
        } else {
          layerToEdit.updates.push(formattedChange);
        }
      });
    }

    // Append any deletes of items that have already been published
    if (type === 'delete') {
      // if this graphic is in the adds array, just delete it from the
      // adds array, since it hasn't been published yet
      changes.forEach((change) => {
        // attempt to find this id in adds
        const addChangeIndex = layerToEdit.adds.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );
        if (addChangeIndex > -1) {
          // remove from adds and don't add to deletes
          layerToEdit.adds = layerToEdit.adds.filter(
            (graphic) =>
              graphic.attributes.PERMANENT_IDENTIFIER !==
              change.attributes.PERMANENT_IDENTIFIER,
          );

          return; // essentially a break on the forEach loop
        }

        // if the objectid is in the update list, remove it
        // attempt to find the graphic in edits
        layerToEdit.updates = layerToEdit.updates.filter(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER !==
            change.attributes.PERMANENT_IDENTIFIER,
        );

        // add the objectids to delete to the deletes array
        layerToEdit.deletes.push({
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
 * @returns the json object to pass to the Esri PopupTemplate constructor.
 */
export function getPopupTemplate(type: LayerTypeName) {
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
    return {
      title: '',
      content: [
        {
          type: 'fields',
          fieldInfos: [
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
            { fieldName: 'SA', label: 'Surface Area (sq inch)' },
            { fieldName: 'Notes', label: 'Notes' },
            { fieldName: 'ALC', label: 'Analysis Labor Cost' },
            { fieldName: 'AMC', label: 'Analysis Material Cost' },
          ],
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
