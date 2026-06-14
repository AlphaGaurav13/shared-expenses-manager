import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

interface RegisterProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/register/', { username, email, password });
      onLoginSuccess(response.data.user, response.data.access);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.username?.[0] || 
        err.response?.data?.email?.[0] || 
        err.response?.data?.detail || 
        'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <h2 className="title-gradient" style={{ marginBottom: '0.5rem', fontSize: '1.8rem' }}>Get Started</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem', fontSize: '0.9rem' }}>Create an account to track shared flat expenses</p>
        
        {error && (
          <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid rgba(244,63,94,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              placeholder="e.g. Aisha"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="e.g. aisha@spreetail.com"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};
