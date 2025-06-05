import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';    // <<--- Import App.jsx
import './index.css';       // Tailwind styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />               {/* <<--- Render App */}
    </BrowserRouter>
  </React.StrictMode>
);