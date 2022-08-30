/** @jsxImportSource @emotion/react */

import React, { useContext } from 'react';
import { css } from '@emotion/react';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// contexts
import { DialogContext } from 'contexts/Dialog';
// styles
import { colors } from 'styles';

const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 101;
    background-color: ${colors.black(0.75)};
  }
`;

const dialogStyles = css`
  color: ${colors.white()};
  background-color: ${colors.epaBlue};
  max-height: 80vh;
  overflow: auto;

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
  margin-left: 15px;
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
  const { options, setOptions } = useContext(DialogContext);

  const close = () => {
    if (!options) return;

    setOptions(null);
  };

  const open = Boolean(options);

  return (
    <DialogOverlay css={overlayStyles} isOpen={open}>
      <DialogContent css={dialogStyles} aria-label={options?.ariaLabel}>
        {options?.title && <h3>{options?.title}</h3>}
        <p>{options?.description}</p>
        <br />
        <div css={buttonContainerStyles}>
          {options?.onContinue && (
            <button
              className="btn"
              css={buttonStyles}
              onClick={() => {
                if (options?.onContinue) options.onContinue();
                close();
              }}
            >
              Continue
            </button>
          )}
          <button
            className="btn"
            css={buttonStyles}
            onClick={() => {
              close();

              if (options?.onCancel) options.onCancel();
            }}
          >
            {options?.onContinue ? 'Cancel' : 'OK'}
          </button>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}

export default AlertDialog;
