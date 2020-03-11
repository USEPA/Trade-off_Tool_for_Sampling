/** @jsx jsx */

import { jsx, css } from '@emotion/core';

// --- components (MessageBox) ---
const baseContainerStyles = css`
  display: flex;
  align-items: center;
  color: black;
  padding: 5px;
`;

const errorContainerStyles = css`
  ${baseContainerStyles}
  background-color: #f3e3db;
  border-left: 5px solid #d23c18;
`;

const warningContainerStyles = css`
  ${baseContainerStyles}
  background-color: #faf3d1;
  border-left: 5px solid #ffbe2e;
`;

const infoContainerStyles = css`
  ${baseContainerStyles}
  background-color: #e8f6f8;
  border-left: 5px solid #21badf;
`;

const iconContainerStyles = css`
  font-size: 25px;
  margin-right: 5px;
`;

const messageTextStyles = css`
  font-size: 12px;
`;

// --- components (MessageBox) ---
type Props = {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
};

function MessageBox({ title, message, severity }: Props) {
  let container;
  let iconClass;
  if (severity === 'error') {
    container = errorContainerStyles;
    iconClass = 'fas fa-exclamation-circle';
  }
  if (severity === 'warning') {
    container = warningContainerStyles;
    iconClass = 'fas fa-exclamation-triangle';
  }
  if (severity === 'info') {
    container = infoContainerStyles;
    iconClass = 'fas fa-info-circle';
  }

  return (
    <div css={container}>
      <div css={iconContainerStyles}>
        <i className={iconClass} />
      </div>
      <div>
        <strong>{title}</strong>
        <br />
        <span css={messageTextStyles}>{message}</span>
      </div>
    </div>
  );
}

export default MessageBox;
