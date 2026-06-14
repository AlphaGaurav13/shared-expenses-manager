import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Calendar } from 'lucide-react';
import api from '../../services/api';

export const GroupList: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups/');
      setGroups(response.data);
    } catch (err: any) {
      console.error('Failed to fetch groups', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newGroupName.trim()) return;

    try {
      const response = await api.post('/groups/', { name: newGroupName });
      setGroups([response.data, ...groups]);
      setNewGroupName('');
      setShowModal(false);
      navigate(`/groups/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create group.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.2rem' }}>My Expense Groups</h1>
          <p style={{ color: 'var(--text-muted)' }}>Select or create a group to manage shared flat expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          <span>New Group</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading your groups...</div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Users size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.7 }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No groups found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Get started by creating a group for your flatmates or trip members.
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            <span>Create a Group</span>
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {groups.map(group => (
            <div 
              key={group.id} 
              className="card" 
              onClick={() => navigate(`/groups/${group.id}`)}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}
            >
              <div>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.4rem', color: '#fff' }}>{group.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Members: {group.memberships?.map((m: any) => m.user.username).join(', ')}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} /> Created on {new Date(group.created_at).toLocaleDateString()}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>Open Dashboard &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Expense Group</h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="modal-body">
                {error && (
                  <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Group Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newGroupName} 
                    onChange={e => setNewGroupName(e.target.value)} 
                    required 
                    placeholder="e.g. Flat 302, Goa Trip 2026"
                  />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Creating a group will automatically add you as the first member.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
