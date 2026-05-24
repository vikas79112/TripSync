import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TripDetails from './pages/TripDetails';
import Analytics from './pages/Analytics';
import Settlements from './pages/Settlements';

// Simple loader placeholder
const InitialLoader = () => (
  <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-4">
    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
    <p className="text-slate-500 text-xs tracking-widest uppercase">Initializing TripSync</p>
  </div>
);

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <InitialLoader />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Route wrapper that redirects authenticated users away from auth pages
const AnonymousRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <InitialLoader />;
  }

  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col transition-colors duration-300">
        {/* Render navigation bar on all pages (internally handles logged-in state checks) */}
        <Navbar />

        <main className="flex-1 w-full pb-12">
          <Routes>
            {/* Public authentication pathways */}
            <Route 
              path="/login" 
              element={
                <AnonymousRoute>
                  <Login />
                </AnonymousRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <AnonymousRoute>
                  <Signup />
                </AnonymousRoute>
              } 
            />

            {/* Secure trip application pathways */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips/:tripId" 
              element={
                <ProtectedRoute>
                  <TripDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips/:tripId/analytics" 
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/trips/:tripId/settlements" 
              element={
                <ProtectedRoute>
                  <Settlements />
                </ProtectedRoute>
              } 
            />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
