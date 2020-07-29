/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import { SketchPicker, RGBColor } from 'react-color';

// --- styled components ---
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
type Props = {};

function ColorPicker() {
  const [colorPickerVisible, setColorPickerVisible] = React.useState(false);
  const [color, setColor] = React.useState<RGBColor>({
    r: 241,
    g: 112,
    b: 19,
    a: 1,
  });

  // Generate a random number for making a unique connection between the
  // color picker button and container
  const [uid] = React.useState(Date.now() + Math.random());

  const [top, setTop] = React.useState(250);
  function toggleColorPicker(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
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
        <SketchPicker color={color} onChange={(color) => setColor(color.rgb)} />
      </div>
    </div>
  );
}

export default ColorPicker;
