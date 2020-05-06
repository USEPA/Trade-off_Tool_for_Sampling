// emotion @jsx pragma docs: https://emotion.sh/docs/css-prop#jsx-pragma
/** @jsx jsx */

import * as React from 'react';
import { jsx, css } from '@emotion/core';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// contexts
import { DialogContext } from 'contexts/Dialog';
// styles
import { colors } from 'styles';

const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 1000;
    background-color: ${colors.black(0.75)};
  }
`;

const dialogStyles = css`
  color: ${colors.white()};
  background-color: ${colors.epaBlue};

  &[data-reach-dialog-content] {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 35rem;
  }

  p {
    margin-top: 1rem;
    margin-bottom: 0;
    padding-bottom: 0;
    font-size: 0.875rem;
    line-height: 1.375;

    &:first-of-type {
      margin-top: 0;
    }
  }
`;

const buttonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const buttonStyles = css`
  margin: 0;
  padding: 0.625rem 1.25rem;
  border: 0;
  border-radius: 3px;
  font-family: inherit;
  font-weight: bold;
  font-size: 0.875rem;
  line-height: 1;
  color: ${colors.black()};
  background-color: ${colors.white(0.875)};
  cursor: pointer;
`;

function AlertDialog() {
  const { options, setOptions } = React.useContext(DialogContext);

  const close = () => {
    if (!options) return;

    setOptions(null);
  };

  const open = Boolean(options);

  return (
    <DialogOverlay css={overlayStyles} isOpen={open}>
      <DialogContent css={dialogStyles} aria-label={options?.ariaLabel}>
        <h3>{options?.title}</h3>
        {options?.description}
        <br />
        <div css={buttonContainerStyles}>
          <button className="btn" css={buttonStyles} onClick={close}>
            OK
          </button>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}

export default AlertDialog;
