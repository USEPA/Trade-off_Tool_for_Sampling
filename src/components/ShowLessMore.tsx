/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx, css } from '@emotion/core';

// --- styled components ---
const LinkButtonStyles = css`
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

// --- components ---
type Props = {
  text: string | ReactNode;
  charLimit: number;
};

function ShowLessMore({ text, charLimit }: Props) {
  const [truncated, setTruncated] = React.useState(true);

  if (typeof text === 'string') {
    if (!text) return <React.Fragment />;
    if (text.length < charLimit) return <React.Fragment>text</React.Fragment>;

    return (
      <React.Fragment>
        {truncated ? `${text.substring(0, charLimit)}...` : text}
        <button
          css={LinkButtonStyles}
          onClick={(ev) => setTruncated(!truncated)}
        >
          Show {truncated ? 'more' : 'less'}
        </button>
      </React.Fragment>
    );
  }

  if (React.isValidElement(text)) {
    return (
      <React.Fragment>
        {truncated ? '...' : text}
        <button
          css={LinkButtonStyles}
          onClick={(ev) => setTruncated(!truncated)}
        >
          Show {truncated ? 'more' : 'less'}
        </button>
      </React.Fragment>
    );
  }

  return null;
}

export default ShowLessMore;
