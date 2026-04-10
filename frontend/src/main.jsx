import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const READER_THEME_STORAGE_KEY = 'tilawah_reader_theme';
const VALID_THEMES = new Set(['cream', 'white', 'black', 'rose', 'developer']);
const savedTheme = localStorage.getItem(READER_THEME_STORAGE_KEY) || 'cream';
const initialTheme = VALID_THEMES.has(savedTheme) ? savedTheme : 'cream';

document.documentElement.setAttribute('data-theme', initialTheme);
document.body.setAttribute('data-theme', initialTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
