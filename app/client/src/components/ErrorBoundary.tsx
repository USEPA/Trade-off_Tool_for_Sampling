/** @jsxImportSource @emotion/react */

import React, { Component as ReactComponent } from 'react';
import { css } from '@emotion/react';
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

class ErrorBoundary extends ReactComponent<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(error);

    try {
      throw error;
    } catch (err) {
      window.logErrorToGa(err, true);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div css={containerStyles}>{errorBoundaryMessage}</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
