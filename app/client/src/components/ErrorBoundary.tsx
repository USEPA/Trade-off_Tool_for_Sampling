// emotion @jsx pragma docs: https://emotion.sh/docs/css-prop#jsx-pragma
/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// config
import { errorBoundaryMessage } from 'config/errorMessages';

// --- components (MessageBox) ---
const containerStyles = css`
  margin: 10px;
`;

// --- components (MessageBox) ---
type Props = {
  children: JSX.Element | JSX.Element[];
};

type State = {
  hasError: boolean;
};

class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(error);
  }

  render() {
    if (this.state.hasError) {
      return <div css={containerStyles}>{errorBoundaryMessage}</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
