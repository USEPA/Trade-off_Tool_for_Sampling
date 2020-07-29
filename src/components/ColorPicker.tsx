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

const popoverStyles = css`
  position: absolute;
  z-index: 3;
`;

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

  return (
    <div>
      <div
        css={swatchStyles}
        onClick={(ev) => setColorPickerVisible(!colorPickerVisible)}
      >
        <div css={colorStyles(color)} />
      </div>
      {colorPickerVisible ? (
        <div css={popoverStyles}>
          <div
            css={coverStyles}
            onClick={(ev) => setColorPickerVisible(false)}
          />
          <SketchPicker
            color={color}
            onChange={(color) => setColor(color.rgb)}
          />
        </div>
      ) : null}
    </div>
  );
}

export default ColorPicker;
