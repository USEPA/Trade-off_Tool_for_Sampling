/** @jsxImportSource @emotion/react */

import React, { Fragment, isValidElement, ReactNode, useState } from 'react';
// styles
import { linkButtonStyles } from 'styles';

// --- components ---
type Props = {
  text: string | ReactNode;
  charLimit: number;
};

function ShowLessMore({ text, charLimit }: Props) {
  const [truncated, setTruncated] = useState(true);

  if (typeof text === 'string') {
    if (!text) return <Fragment />;
    if (text.length < charLimit) return <Fragment>{text}</Fragment>;

    return (
      <Fragment>
        {truncated ? `${text.substring(0, charLimit)}...` : text}
        <button
          css={linkButtonStyles}
          onClick={(ev) => setTruncated(!truncated)}
        >
          Show {truncated ? 'more' : 'less'}
        </button>
      </Fragment>
    );
  }

  if (isValidElement(text)) {
    return (
      <Fragment>
        {truncated ? '...' : text}
        <button
          css={linkButtonStyles}
          onClick={(ev) => setTruncated(!truncated)}
        >
          Show {truncated ? 'more' : 'less'}
        </button>
      </Fragment>
    );
  }

  return null;
}

export default ShowLessMore;
