/** @jsxImportSource @emotion/react */

import React, {
  MouseEvent as ReactMouseEvent,
  useEffect,
  useState,
} from 'react';
import { css } from '@emotion/react';
import { SketchPicker, RGBColor } from 'react-color';
// config
import { PolygonSymbol } from 'config/sampleAttributes';

/**
 * Converts a number array (esri rgb color) to an rgb object (react-color).
 */
function convertArrayToRgbColor(color: number[]) {
  return {
    r: color[0],
    g: color[1],
    b: color[2],
    a: color.length > 3 ? color[3] : 1,
  } as RGBColor;
}

const colorStyles = (color: RGBColor) => {
  return css`
    width: 36px;
    height: 14px;
    border-radius: 2px;
    background: rgba(${color.r}, ${color.g}, ${color.b}, ${color.a});
  `;
};

const swatchStyles = css`
  padding: 5px;
  background: #fff;
  border-radius: 1px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  display: inline-block;
  cursor: pointer;
`;

const popoverStyles = (visible: boolean, top: number) => {
  return css`
    ${visible ? '' : 'visibility: hidden;'}
    position: absolute;
    top: ${top === 0 ? '0' : `${top}px`};
    z-index: 3;
  `;
};

const coverStyles = css`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

// --- components ---
type SingleColorPickerProps = {
  color: RGBColor;
  onChange: Function;
};

function SingleColorPicker({
  color,
  onChange = () => {},
}: SingleColorPickerProps) {
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [colorState, setColorState] = useState<RGBColor>(color);

  // Generate a random number for making a unique connection between the
  // color picker button and container
  const [uid] = useState(Date.now() + Math.random());

  // Used to make the color picker visible and position it
  const [top, setTop] = useState(250);
  function toggleColorPicker(e: ReactMouseEvent<HTMLDivElement, MouseEvent>) {
    if (colorPickerVisible) {
      setColorPickerVisible(false);
      return;
    }

    setColorPickerVisible(true);

    // get the necessary elements
    const button = document.getElementById(`color-picker-button-${uid}`);
    const pickerContainer = document.getElementById(
      `color-picker-container-${uid}`,
    );
    const scrollContainer = document.getElementById(
      'tots-panel-scroll-container',
    );
    if (!button || !scrollContainer || !pickerContainer) return;

    const containerPadding = 5;
    const buttonTop = button.offsetTop - scrollContainer.scrollTop;
    const pickerHeight = pickerContainer.clientHeight;

    // get the preffered and alternate tops
    let prefferedTop = buttonTop + button.clientHeight + containerPadding;
    let alternateTop = buttonTop - pickerHeight - containerPadding;

    // Determine if the color picker should be above or below the button.
    // The color picker should only be above the button, if there is enough space
    // above the button, but not enough below. If there is not enough space
    // on either side, then the color picker will show up below the button.
    let top = prefferedTop;
    const buttonRect = button.getBoundingClientRect();
    const proposedBottom = buttonRect.bottom + pickerHeight + containerPadding;
    if (alternateTop > 0 && proposedBottom > window.innerHeight) {
      // button position - scroll position - color picker height
      top = alternateTop;
    }

    setTop(top);
  }

  useEffect(() => {
    if (colorPickerVisible || !onChange) return;
    if (JSON.stringify(color) === JSON.stringify(colorState)) return;

    onChange(colorState);
  }, [color, colorState, onChange, colorPickerVisible]);

  return (
    <div>
      <div
        id={`color-picker-button-${uid}`}
        css={swatchStyles}
        onClick={toggleColorPicker}
      >
        <div css={colorStyles(color)} />
      </div>
      <div
        id={`color-picker-container-${uid}`}
        css={popoverStyles(colorPickerVisible, top)}
      >
        <div css={coverStyles} onClick={(ev) => setColorPickerVisible(false)} />
        <SketchPicker
          color={colorState}
          onChange={(color) => setColorState(color.rgb)}
        />
      </div>
    </div>
  );
}

const colorSettingContainerStyles = css`
  margin-bottom: 15px;
`;

const colorContainerStyles = css`
  display: flex;
`;

const colorLabelStyles = css`
  margin-right: 10px;
`;

const inlineMenuStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

// --- components ---
type Props = {
  symbol: PolygonSymbol;
  title?: string;
  onChange?: Function;
};

function ColorPicker({
  symbol,
  title = 'Symbology Settings',
  onChange = () => {},
}: Props) {
  return (
    <div css={colorSettingContainerStyles}>
      <h3>{title}</h3>
      <div css={inlineMenuStyles}>
        <div css={colorContainerStyles}>
          <span css={colorLabelStyles}>Fill</span>
          <SingleColorPicker
            color={convertArrayToRgbColor(symbol.color)}
            onChange={(color: RGBColor) => {
              const alpha = color.a ? color.a : 1;
              const newSymbol = {
                ...symbol,
                color: [color.r, color.g, color.b, alpha],
              };
              if (onChange) onChange(newSymbol);
            }}
          />
        </div>
        <div css={colorContainerStyles}>
          <span css={colorLabelStyles}>Outline</span>
          <SingleColorPicker
            color={convertArrayToRgbColor(symbol.outline.color)}
            onChange={(color: RGBColor) => {
              const alpha = color.a ? color.a : 1;
              const newSymbol = {
                ...symbol,
                outline: {
                  ...symbol.outline,
                  color: [color.r, color.g, color.b, alpha],
                },
              };
              if (onChange) onChange(newSymbol);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ColorPicker;
