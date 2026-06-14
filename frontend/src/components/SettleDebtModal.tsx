import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface SettleDebtModalProps {
  groupId: string;
  memberships: any[];
  onClose: () => void;
  onSuccess: () => void;
  suggestedPayerId?: string;
  suggestedRecipientId?: string;
  suggestedAmount?: number;
}

export const SettleDebtModal: React.FC<SettleDebtModalProps> = ({
  groupId,
  memberships,
  onClose,
  onSuccess,
  suggestedPayerId = '',
  suggestedRecipientId = '',
  suggestedAmount = 0
}) => {
  const [amount, setAmount] = useState(suggestedAmount > 0 ? suggestedAmount.toString() : '');
  const [currency, setCurrency] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [paidById, setPaidById] = useState(suggestedPayerId);
  const [paidToId, setPaidToId] = useState(suggestedRecipientId);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Repayment/Settlement');
  
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
    
    if (filtered.length > 0) {
      if (!paidById) setPaidById(filtered[0].user.id);
      if (!paidToId && filtered.length > 1) setPaidToId(filtered[1].user.id);
    }
  }, [date, memberships]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (paidById === paidToId) {
      setError('Payer and Recipient cannot be the same person.');
      setLoading(false);
      return;
    }

    try {
      await api.post(`/groups/${groupId}/settlements/`, {
        amount: parseFloat(amount),
        currency,
        exchange_rate: parseFloat(exchangeRate),
        paid_by_id: paidById,
        paid_to_id: paidToId,
        date,
        notes
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.[0] || err.response?.data?.detail || 'Failed to record settlement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record a Payment / Settle Debt</h3>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Who Paid? (Payer)</label>
              <select className="form-control" value={paidById} onChange={e => setPaidById(e.target.value)} required>
                <option value="">Select Payer</option>
                {activeMembers.map(m => (
                  <option key={m.user.id} value={m.user.id}>{m.user.username}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Who was Paid? (Recipient)</label>
              <select className="form-control" value={paidToId} onChange={e => setPaidToId(e.target.value)} required>
                <option value="">Select Recipient</option>
                {activeMembers.map(m => (
                  <option key={m.user.id} value={m.user.id}>{m.user.username}</option>
                ))}
              </select>
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
              <label className="form-label">Notes (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="e.g. Settle March Rent"
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
