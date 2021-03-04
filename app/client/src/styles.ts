import { css } from '@emotion/core';

const colors = {
  black: (alpha: number = 1) => `rgba(0, 0, 0, ${alpha})`, // #000,
  white: (alpha: number = 1) => `rgba(255, 255, 255, ${alpha})`, // #fff,
  blue: (alpha: number = 1) => `rgba(0, 113, 187, ${alpha})`, // #0071bb,
  gold: (alpha: number = 1) => `rgba(252, 171, 83, ${alpha})`, // #fcab53,
  teal: (alpha: number = 1) => `rgba(80, 210, 194, ${alpha})`, // #50d2c2,
  magenta: (alpha: number = 1) => `rgba(255, 51, 102, ${alpha})`, // #ff3366,
  green: (alpha: number = 1) => `rgba(40, 167, 69, ${alpha})`, // #28a745,
  red: (alpha: number = 1) => `rgba(220, 53, 69, ${alpha})`, // #dc3545,
  darkaqua: (alpha: number = 1) => `rgba(0, 189, 227, ${alpha})`, //#00bde3
  darkblue: (alpha: number = 1) => `rgba(1, 46, 81, ${alpha})`, //#012e51
  darkblue2: (alpha: number = 1) => `rgba(1, 33, 59, ${alpha})`, //#01213B
  epaBlue: '#0a71b9',
  gray6: '#666',
};

const reactSelectStyles = {
  placeholder: (defaultStyles: React.CSSProperties) => {
    return {
      ...defaultStyles,
      color: '#495057',
    };
  },
};

const linkButtonStyles = css`
  display: inline;
  margin-bottom: 0;
  margin-left: 0.25rem;
  padding: 0;
  border: none;
  font-size: 87.5%;
  text-decoration: underline;
  color: #0071bc;
  background-color: transparent;
  cursor: pointer;

  &:hover,
  &:focus {
    text-decoration: none;
    color: #4c2c92;
  }
`;

export { colors, reactSelectStyles, linkButtonStyles };
