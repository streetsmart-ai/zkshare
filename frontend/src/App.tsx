import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreatePassword from './components/CreatePassword';
import AccessPassword from './components/AccessPassword';
import ErrorBoundary from './components/ErrorBoundary';

const ErrorPage: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    color: 'var(--error)',
    padding: '24px',
    textAlign: 'center',
    fontFamily: 'JetBrains Mono, monospace'
  }}>
    <div style={{
      maxWidth: '500px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '32px'
    }}>
      <h2 style={{
        fontSize: '20px',
        marginBottom: '16px',
        color: 'var(--error)'
      }}>error</h2>
      <p style={{
        color: 'var(--text-dim)',
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        something went wrong or the link is invalid/expired.
      </p>
      <div style={{
        marginTop: '24px'
      }}>
        <a href="/" style={{
          color: 'var(--accent)',
          fontSize: '14px',
          textDecoration: 'none'
        }}>
          ← back to create
        </a>
      </div>
    </div>
  </div>
);

const App: React.FC = () => (
  <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
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
