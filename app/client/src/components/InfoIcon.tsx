/** @jsxImportSource @emotion/react */

import React, { Fragment } from 'react';
import { Tooltip } from 'react-tooltip';

type Props = {
  id: string;
  tooltip: string;
  cssStyles?: any;
  place?: 'top' | 'right' | 'bottom' | 'left';
};

function InfoIcon({ id, tooltip, cssStyles, place = 'right' }: Props) {
  return (
    <Fragment>
      <Tooltip
        id={id}
        place={place}
        positionStrategy="fixed"
        style={{ zIndex: 101 }}
        variant="info"
      />
      <i
        className="fas fa-info-circle"
        css={cssStyles}
        data-tooltip-id={id}
        data-tooltip-html={tooltip}
      ></i>
    </Fragment>
  );
}

export default InfoIcon;
