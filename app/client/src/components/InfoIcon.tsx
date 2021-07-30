
// Uses react-tooltip component. The below import is not needed, but
// it could be necessary in the future. Uncomment the below line
// if more features are needed.
import React from 'react';
import ReactTooltip from 'react-tooltip';

type Props = {
  id: string;
  tooltip: string;
  type?: 'dark' | 'success' | 'warning' | 'error' | 'info' | 'light';
  place?: 'top' | 'right' | 'bottom' | 'left';
  effect?: 'float' | 'solid';
};

function InfoIcon({
  id,
  tooltip,
  type = 'dark',
  place = 'top',
  effect = 'float',
}: Props) {
  return (
    <React.Fragment>
      <ReactTooltip 
        id={id}
        place={place}
        type={type}
        effect={effect}
        multiline={true}
      />
      <i 
        className="fas fa-info-circle"
        data-for={id}
        data-tip={tooltip}
      ></i>
    </React.Fragment>
  );
}

export default InfoIcon;
