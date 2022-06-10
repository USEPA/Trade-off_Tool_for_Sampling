import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
// components
import App from 'components/App';

it('renders without crashing', () => {
  const rootElement = document.createElement('div');
  createRoot(rootElement).render(<App />);
  ReactDOM.unmountComponentAtNode(rootElement);
});
