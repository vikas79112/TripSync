import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { TripProvider } from './context/TripContext.jsx'
import { SyncProvider } from './context/SyncContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TripProvider>
          <SyncProvider>
            <App />
          </SyncProvider>
        </TripProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
