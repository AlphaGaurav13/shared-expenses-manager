import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Users, LogOut } from 'lucide-react';

import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { GroupList } from './features/groups/GroupList';
import { GroupDashboard } from './features/groups/GroupDashboard';
import { ImportWizard } from './features/imports/ImportWizard';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userObj: any, accessToken: string) => {
    setUser(userObj);
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userObj));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)', color: '#fff' }}>Loading App State...</div>;
  }

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <div className="app-container">
        {token && (
          <header className="header">
            <Link to="/" style={{ textDecoration: 'none', color: '#fff' }}>
              <div className="logo">
                <Users className="logo-icon" size={24} />
                <span>SplitPro</span>
              </div>
            </Link>
            <div className="user-nav">
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Logged in as <strong>{user?.username}</strong>
              </span>
              <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </header>
        )}
        
        <main className="main-content">
          <Routes>
            <Route 
              path="/login" 
              element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/register" 
              element={!token ? <Register onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />} 
            />
            
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <GroupList />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/groups/:groupId" 
              element={
                <ProtectedRoute>
                  <GroupDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/groups/:groupId/import/:importId" 
              element={
                <ProtectedRoute>
                  <ImportWizard />
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
