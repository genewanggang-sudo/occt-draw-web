import React from 'react';
import ReactDOM from 'react-dom/client';

import '@occt-draw/ui/styles.css';
import './app/styles.css';
import { App } from './app/App';

const container = document.getElementById('root');

if (!container) {
    throw new Error('Root container "#root" was not found.');
}

ReactDOM.createRoot(container).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
