import 'react-app-polyfill/stable';
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as serviceWorker from './serviceWorker';
// components
import App from 'components/App';
// styles
import '@arcgis/core/assets/esri/themes/light/main.css';

const rootElement = document.getElementById('root') as HTMLElement;
createRoot(rootElement).render(<App />);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
