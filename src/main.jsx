import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource-variable/noto-sans-tc';
import './styles.css';
import './learning/learning.css';

createRoot(document.getElementById('root')).render(<App/>);
