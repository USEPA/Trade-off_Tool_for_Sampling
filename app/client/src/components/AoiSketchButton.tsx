/** @jsxImportSource @emotion/react */

import { useContext } from 'react';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { css } from '@emotion/react';
// contexts
import { DialogContext } from 'contexts/Dialog';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerEditsType } from 'types/Edits';
// utils
import { activateSketchButton } from 'utils/sketchUtils';

// --- styles (Calculate) ---
const sketchAoiTextStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  i {
    font-size: 20px;
    margin-right: 5px;
  }
`;

const sketchAoiButtonStyles = css`
  background-color: white;
  color: black;
  margin-bottom: 0.5rem;
  &:hover,
  &:focus {
    background-color: #e7f6f8;
    cursor: pointer;
  }
`;

// --- components ---

const BUTTON_ID = 'staging-aoi';

type Props = {
  className?: string;
  onContinue?: () => void;
  replaceGraphics?: boolean;
  sketchLayer?:
    | __esri.FeatureLayer
    | __esri.GraphicsLayer
    | __esri.GroupLayer
    | null;
};

function AoiSketchButton({
  className,
  onContinue,
  replaceGraphics = false,
  sketchLayer,
}: Props) {
  const { setOptions } = useContext(DialogContext);
  const {
    aoiSketchLayer,
    aoiSketchVM,
    defaultSymbols,
    displayDimensions,
    map,
    mapView,
    sceneView,
    setEdits,
    sketchVM,
  } = useContext(SketchContext);

  // Handle a user clicking the sketch AOI button. If an AOI is not selected from the
  // dropdown this will create an AOI layer. This also sets the sketchVM to use the
  // selected AOI and triggers a React useEffect to allow the user to sketch on the map.
  const sketchAoiButtonClick = () => {
    if (!map || !aoiSketchVM || !sceneView || !mapView) return;

    function startSketch() {
      if (!aoiSketchVM) return;

      aoiSketchVM.polygonSymbol = defaultSymbols.symbols[
        'Staging Area Mask'
      ] as any;

      // save changes from other sketchVM and disable to prevent
      // interference
      if (sketchVM) sketchVM[displayDimensions].cancel();

      // make the style of the button active
      const wasSet = activateSketchButton(BUTTON_ID);

      if (wasSet) {
        // let the user draw/place the shape
        aoiSketchVM.create('polygon');
      } else {
        aoiSketchVM.cancel();
      }
    }

    if (
      replaceGraphics &&
      aoiSketchLayer?.sketchLayer?.type === 'graphics' &&
      aoiSketchLayer.sketchLayer.graphics.length > 0
    ) {
      setOptions({
        title: 'Would you like to continue?',
        ariaLabel: 'Would you like to continue?',
        description:
          'Staging Area Boundary layers are only allowed to have one graphic. ' +
          'This operation will delete any graphics on the Staging Area Boundary. ' +
          'If you want to keep the graphic, click Cancel and add a new Staging Area Boundary Layer.',
        onContinue: () => {
          if (aoiSketchLayer?.sketchLayer?.type === 'graphics')
            aoiSketchLayer.sketchLayer.graphics.removeAll();

          setEdits((edits) => {
            const editLayer = edits.edits.find(
              (edit) =>
                edit.type === 'layer' &&
                edit.layerId === aoiSketchLayer.layerId,
            ) as LayerEditsType | undefined;
            if (editLayer) editLayer.adds = [];

            return {
              count: edits.count + 1,
              edits: edits.edits,
            };
          });

          startSketch();

          if (onContinue) onContinue();
        },
      });
    } else {
      startSketch();
    }
  };

  // Set the sketch VM layer to the aoi sketch layer.
  const targetLayer = sketchLayer ?? aoiSketchLayer?.sketchLayer;
  if (
    targetLayer instanceof GraphicsLayer &&
    aoiSketchVM &&
    aoiSketchVM.layer !== targetLayer
  ) {
    aoiSketchVM.layer = targetLayer;
  }

  return (
    <button
      id={BUTTON_ID}
      title="Draw Staging Area Boundary"
      className={`sketch-button ${className}`}
      onClick={sketchAoiButtonClick}
      css={sketchAoiButtonStyles}
    >
      <span css={sketchAoiTextStyles}>
        <i className="fas fa-draw-polygon" />{' '}
        <span>Draw Staging Area Boundary</span>
      </span>
    </button>
  );
}

export default AoiSketchButton;
