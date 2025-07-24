import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreatePassword from './components/CreatePassword';
import AccessPassword from './components/AccessPassword';
import ErrorBoundary from './components/ErrorBoundary';

const ErrorPage: React.FC = () => (
  <div style={{ color: 'red', padding: 24, textAlign: 'center' }}>
    <h2>Error</h2>
    <p>Sorry, something went wrong or the link is invalid/expired.</p>
  </div>
);

const App: React.FC = () => (
  <div style={{ minHeight: '100vh', minWidth: '100vw' }}>
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<CreatePassword />} />
          <Route path="/access" element={<AccessPassword />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  </div>
);

export default App;
