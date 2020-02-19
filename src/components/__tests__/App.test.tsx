import React from 'react';
import { render } from '@testing-library/react';
// components
import App from '../App';

it('renders the placeholder text', () => {
  render(<App />);
  // const { getByText } = render(<App />);
  // expect(getByText('Loading...')).toBeInTheDocument();
  // expect(getByText('(Toolbar)')).toBeInTheDocument();
  // expect(getByText('(Map)')).toBeInTheDocument();
});
