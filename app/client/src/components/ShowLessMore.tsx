/** @jsxImportSource @emotion/react */

import React, { ReactNode } from 'react';
// styles
import { linkButtonStyles } from 'styles';

// --- components ---
type Props = {
  text: string | ReactNode;
  charLimit: number;
};

function ShowLessMore({ text, charLimit }: Props) {
  const [truncated, setTruncated] = React.useState(true);

  if (typeof text === 'string') {
    if (!text) return <React.Fragment />;
    if (text.length < charLimit) return <React.Fragment>{text}</React.Fragment>;

    return (
      <React.Fragment>
        {truncated ? `${text.substring(0, charLimit)}...` : text}
        <button
          css={linkButtonStyles}
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
          css={linkButtonStyles}
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
