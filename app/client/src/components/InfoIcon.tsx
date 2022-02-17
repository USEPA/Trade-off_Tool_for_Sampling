/** @jsxImportSource @emotion/react */

import React, { Fragment } from 'react';
import ReactTooltip from 'react-tooltip';

type Props = {
  id: string;
  tooltip: string;
  cssStyles?: any;
  type?: 'dark' | 'success' | 'warning' | 'error' | 'info' | 'light';
  place?: 'top' | 'right' | 'bottom' | 'left';
  effect?: 'float' | 'solid';
};

function InfoIcon({
  id,
  tooltip,
  cssStyles,
  type = 'dark',
  place = 'top',
  effect = 'float',
}: Props) {
  return (
    <Fragment>
      <ReactTooltip
        id={id}
        place={place}
        type={type}
        effect={effect}
        multiline={true}
      />
      <i
        className="fas fa-info-circle"
        css={cssStyles}
        data-for={id}
        data-tip={tooltip}
      ></i>
    </Fragment>
  );
}

export default InfoIcon;
