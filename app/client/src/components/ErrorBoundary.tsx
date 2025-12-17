/** @jsxImportSource @emotion/react */

import React, { Component as ReactComponent, JSX } from 'react';
import { css } from '@emotion/react';
// config
import { errorBoundaryMessage } from 'config/errorMessages';

// --- components (MessageBox) ---
const containerStyles = css`
  margin: 20px;

  button {
    margin-bottom: 0;
  }
`;

// --- components (MessageBox) ---
type Props = {
  children: JSX.Element | JSX.Element[];
};

type State = {
  error: Error | null;
  hasError: boolean;
};

class ErrorBoundary extends ReactComponent<Props, State> {
  state: State = {
    error: null,
    hasError: false,
  };

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(error);
    this.setState({ error });
    try {
      throw error;
    } catch (err) {
      window.logErrorToGa(err, true);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div css={containerStyles}>
          {errorBoundaryMessage(this.state.error)}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
