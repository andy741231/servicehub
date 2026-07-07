import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import useThemeStore from './store/themeStore'

// Ensure the theme is resolved and applied to <html> before first render
// (the inline script in index.html already prevents FOUC; this keeps the
// store's state authoritative).
useThemeStore.getState().initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
