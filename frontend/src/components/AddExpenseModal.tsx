import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface AddExpenseModalProps {
  groupId: string;
  memberships: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ groupId, memberships, onClose, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [paidById, setPaidById] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'share' | 'unequal'>('equal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [splitUsers, setSplitUsers] = useState<{[key: string]: boolean}>({});
  const [splitValues, setSplitValues] = useState<{[key: string]: string}>({});
  
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const txDate = new Date(date);
    const filtered = memberships.filter(m => {
      const joinDate = new Date(m.joined_at);
      const leaveDate = m.left_at ? new Date(m.left_at) : null;
      return joinDate <= txDate && (!leaveDate || leaveDate >= txDate);
    });
    
    setActiveMembers(filtered);
    
    if (filtered.length > 0 && !paidById) {
      setPaidById(filtered[0].user.id);
    }
    
    const initialChecked: {[key: string]: boolean} = {};
    const initialValues: {[key: string]: string} = {};
    filtered.forEach(m => {
      initialChecked[m.user.id] = true;
      initialValues[m.user.id] = '0';
    });
    setSplitUsers(initialChecked);
    setSplitValues(initialValues);
  }, [date, memberships]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const checkedUserIds = Object.keys(splitUsers).filter(id => splitUsers[id]);
    if (checkedUserIds.length === 0) {
      setError('You must select at least one member to split with.');
      setLoading(false);
      return;
    }

    const splits = checkedUserIds.map(userId => ({
      user_id: userId,
      split_value: parseFloat(splitValues[userId] || '0')
    }));

    if (splitType === 'percentage') {
      const sum = splits.reduce((acc, s) => acc + s.split_value, 0);
      if (Math.abs(sum - 100) > 0.01) {
        setError(`Split percentages must sum to exactly 100%. Current sum: ${sum}%`);
        setLoading(false);
        return;
      }
    }

    try {
      await api.post(`/groups/${groupId}/expenses/`, {
        description,
        amount: parseFloat(amount),
        currency,
        exchange_rate: parseFloat(exchangeRate),
        paid_by_id: paidById,
        split_type: splitType,
        date,
        notes,
        splits
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.[0] || err.response?.data?.detail || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSplitUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleValueChange = (userId: string, val: string) => {
    setSplitValues(prev => ({ ...prev, [userId]: val }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log New Expense</h3>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Transaction Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required 
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                Changing the date filters members to only those who were active in the group on that date.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input 
                type="text" 
                className="form-control" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                required 
                placeholder="e.g. Groceries BigBasket"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Amount</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  required 
                  placeholder="0.00"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Currency</label>
                <select className="form-control" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {currency === 'USD' && (
              <div className="form-group">
                <label className="form-label">Exchange Rate (1 USD = ? INR)</label>
                <input 
                  type="number" 
                  step="0.0001" 
                  className="form-control" 
                  value={exchangeRate} 
                  onChange={e => setExchangeRate(e.target.value)} 
                  required 
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Paid By</label>
              <select className="form-control" value={paidById} onChange={e => setPaidById(e.target.value)} required>
                {activeMembers.map(m => (
                  <option key={m.user.id} value={m.user.id}>{m.user.username}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Split Type</label>
              <select className="form-control" value={splitType} onChange={e => setSplitType(e.target.value as any)}>
                <option value="equal">Split Equally</option>
                <option value="percentage">Split by Percentages (%)</option>
                <option value="share">Split by Shares (Ratios)</option>
                <option value="unequal">Split Unequally (Exact amounts)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Split With</label>
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeMembers.map(m => {
                  const isChecked = splitUsers[m.user.id] || false;
                  return (
                    <div key={m.user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => toggleUser(m.user.id)}
                        />
                        <span>{m.user.username}</span>
                      </label>
                      {isChecked && splitType !== 'equal' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="number" 
                            step="any"
                            style={{ width: '80px', padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff' }}
                            value={splitValues[m.user.id] || ''}
                            onChange={e => handleValueChange(m.user.id, e.target.value)}
                            placeholder={splitType === 'percentage' ? '%' : splitType === 'share' ? 'shares' : '₹'}
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {splitType === 'percentage' ? '%' : splitType === 'share' ? 'shares' : 'INR'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <textarea 
                className="form-control" 
                rows={2} 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Add detail about this expense..."
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Log Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
