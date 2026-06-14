import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, ArrowRight, Trash2 } from 'lucide-react';
import api from '../../services/api';

export const ImportWizard: React.FC = () => {
  const { groupId, importId } = useParams<{ groupId: string; importId: string }>();
  const navigate = useNavigate();
  
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [usdRate, setUsdRate] = useState<string>('83.00');
  
  // Track resolution state for each row
  // rowNumber -> { action: 'import'|'ignore', edited_data: { ... } }
  const [resolutions, setResolutions] = useState<{[key: string]: { action: string; edited_data: any }}>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anomsRes, membersRes] = await Promise.all([
          api.get(`/imports/${importId}/anomalies/`),
          api.get(`/groups/${groupId}/members/`)
        ]);
        
        setAnomalies(anomsRes.data);
        setMemberships(membersRes.data);
        
        // Initialize resolutions state
        const initialResolutions: {[key: string]: any} = {};
        anomsRes.data.forEach((anomaly: any) => {
          const cleaned = anomaly.raw_data.cleaned || {};
          
          // Auto resolve logic for specific standard CSV rows:
          let defaultAction = 'import';
          let edited = { ...cleaned };
          
          // 1. Auto flag exact duplicates as 'ignore' for the second row
          if (anomaly.anomaly_type === 'exact_duplicate') {
            defaultAction = 'ignore';
          }
          // 2. Auto normalizations:
          // e.g. Priya S -> Priya
          if (cleaned.payer_username === 'Priya S' || cleaned.payer_username === 'priya') {
            edited.payer_username = 'Priya';
          }
          if (cleaned.payer_username === 'rohan ') {
            edited.payer_username = 'Rohan';
          }
          // Normalise name list
          edited.split_with_usernames = cleaned.split_with_usernames.map((name: string) => {
            if (name === 'Priya S' || name === 'priya') return 'Priya';
            if (name === 'rohan ') return 'Rohan';
            return name;
          });
          
          // Fix excessive decimals (round to 2 places)
          if (edited.amount) {
            edited.amount = parseFloat(edited.amount.toFixed(2));
          }
          
          // Auto parse date if format was Mar-14 (cleaned.date might be YYYY-MM-DD now)
          if (!edited.date && anomaly.raw_data.raw.date === 'Mar-14') {
            edited.date = '2026-03-14';
          }
          
          initialResolutions[anomaly.row_number.toString()] = {
            action: defaultAction,
            edited_data: edited
          };
        });
        
        setResolutions(initialResolutions);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load import wizard data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [groupId, importId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading CSV Import Data Wizard...</div>;
  }

  const activeAnomaly = anomalies[selectedRowIndex];
  const activeRowNumber = activeAnomaly?.row_number.toString();
  const currentResolution = resolutions[activeRowNumber] || { action: 'import', edited_data: {} };
  const currentData = currentResolution.edited_data;

  const handleActionChange = (action: string) => {
    setResolutions(prev => ({
      ...prev,
      [activeRowNumber]: {
        ...prev[activeRowNumber],
        action
      }
    }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setResolutions(prev => ({
      ...prev,
      [activeRowNumber]: {
        ...prev[activeRowNumber],
        edited_data: {
          ...prev[activeRowNumber].edited_data,
          [field]: value
        }
      }
    }));
  };

  const handleCheckboxToggle = (username: string) => {
    const list = [...(currentData.split_with_usernames || [])];
    const index = list.indexOf(username);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(username);
    }
    handleFieldChange('split_with_usernames', list);
  };

  const handleSubmitResolutions = async () => {
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/groups/${groupId}/imports/${importId}/resolve/`, {
        resolutions,
        usd_exchange_rate: parseFloat(usdRate)
      });
      navigate(`/groups/${groupId}`);
    } catch (err: any) {
      setError(err.response?.data?.[0] || err.response?.data?.detail || 'Failed to apply resolutions. Please check input parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityIcon = (severity: string, status: string) => {
    if (status === 'ignored') return <Trash2 size={16} style={{ color: 'var(--text-muted)' }} />;
    if (severity === 'error') return <AlertCircle size={16} style={{ color: 'var(--error)' }} />;
    if (severity === 'warning') return <AlertCircle size={16} style={{ color: 'var(--warning)' }} />;
    return <CheckCircle size={16} style={{ color: 'var(--success)' }} />;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Import Review & Anomaly Wizard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Meera's Sandbox: Review duplicates, fix formatting, and resolve active dates before importing.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>USD Exchange Rate:</span>
            <input 
              type="number" 
              step="0.01" 
              style={{ width: '70px', background: 'none', border: 'none', borderBottom: '1px solid var(--primary)', color: '#fff', textAlign: 'center', fontWeight: 'bold' }} 
              value={usdRate}
              onChange={e => setUsdRate(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSubmitResolutions} disabled={submitting}>
            {submitting ? 'Processing...' : 'Process and Import Rows'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(244,63,94,0.2)' }}>
          {error}
        </div>
      )}

      <div className="wizard-container">
        {/* Sidebar */}
        <div className="wizard-sidebar">
          <div className="wizard-sidebar-header">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ROW LOG CHECKLIST</span>
          </div>
          <ul className="row-list">
            {anomalies.map((anomaly, idx) => {
              const res = resolutions[anomaly.row_number.toString()] || { action: 'import' };
              const isIgnored = res.action === 'ignore';
              const name = anomaly.raw_data.raw.description || 'Repayment';
              const isSelected = idx === selectedRowIndex;
              
              return (
                <li 
                  key={anomaly.id} 
                  className={`row-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedRowIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    {getSeverityIcon(anomaly.severity, res.action)}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.9rem', color: isIgnored ? 'var(--text-muted)' : '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        Row {anomaly.row_number}: {name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {anomaly.raw_data.raw.amount} {anomaly.raw_data.raw.currency || 'INR'}
                      </span>
                    </div>
                  </div>
                  {anomaly.severity === 'error' && !isIgnored && <span className="badge badge-error">Fix</span>}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Wizard Main Content */}
        {activeAnomaly && (
          <div className="wizard-body">
            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ANOMALY REPORT FOR ROW {activeAnomaly.row_number}</span>
              <h3 style={{ margin: '0.25rem 0 0.5rem', color: '#fff' }}>Type: {activeAnomaly.anomaly_type.toUpperCase().replace(/_/g, ' ')}</h3>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                {activeAnomaly.description}
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span className="form-label" style={{ margin: 0 }}>RESOLUTION ACTION:</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                <input 
                  type="radio" 
                  name="row_action" 
                  checked={currentResolution.action === 'import'} 
                  onChange={() => handleActionChange('import')}
                />
                <span>Clean & Import Row</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <input 
                  type="radio" 
                  name="row_action" 
                  checked={currentResolution.action === 'ignore'} 
                  onChange={() => handleActionChange('ignore')}
                />
                <span>Ignore/Discard Row</span>
              </label>
            </div>

            {currentResolution.action === 'import' && (
              <div className="grid-2">
                <div>
                  <div className="form-group">
                    <label className="form-label">Transaction Date (YYYY-MM-DD)</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={currentData.date || ''} 
                      onChange={e => handleFieldChange('date', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={currentData.description || ''} 
                      onChange={e => handleFieldChange('description', e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label className="form-label">Amount</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        value={currentData.amount || 0} 
                        onChange={e => handleFieldChange('amount', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Currency</label>
                      <select 
                        className="form-control" 
                        value={currentData.currency || 'INR'} 
                        onChange={e => handleFieldChange('currency', e.target.value)}
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Paid By</label>
                    <select 
                      className="form-control" 
                      value={currentData.payer_username || ''} 
                      onChange={e => handleFieldChange('payer_username', e.target.value)}
                    >
                      <option value="">Select Payer</option>
                      {memberships.map(m => (
                        <option key={m.user.id} value={m.user.username}>{m.user.username}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                      <input 
                        type="checkbox" 
                        checked={currentData.is_settlement || false} 
                        onChange={e => handleFieldChange('is_settlement', e.target.checked)}
                      />
                      <span>This is a Settlement/Repayment (Not an expense)</span>
                    </label>
                  </div>
                </div>

                <div>
                  {!currentData.is_settlement && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Split Type</label>
                        <select 
                          className="form-control" 
                          value={currentData.split_type || 'equal'} 
                          onChange={e => handleFieldChange('split_type', e.target.value)}
                        >
                          <option value="equal">Split Equally</option>
                          <option value="percentage">Split by Percentages (%)</option>
                          <option value="share">Split by Shares (Ratios)</option>
                          <option value="unequal">Split Unequally</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Split With Members</label>
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {memberships.map(m => {
                            const isChecked = (currentData.split_with_usernames || []).includes(m.user.username);
                            return (
                              <label key={m.user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => handleCheckboxToggle(m.user.username)}
                                />
                                <span>{m.user.username}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {currentData.split_type !== 'equal' && (
                        <div className="form-group">
                          <label className="form-label">Split Details (Format: Name Value; Name Value; ...)</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={currentData.split_details || ''} 
                            onChange={e => handleFieldChange('split_details', e.target.value)}
                            placeholder="e.g. Rohan 700; Priya 400"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {currentData.is_settlement && (
                    <div className="form-group">
                      <label className="form-label">Recipient User</label>
                      <select 
                        className="form-control" 
                        value={currentData.split_with_usernames?.[0] || ''} 
                        onChange={e => handleFieldChange('split_with_usernames', [e.target.value])}
                      >
                        <option value="">Select Recipient</option>
                        {memberships.map(m => (
                          <option key={m.user.id} value={m.user.username}>{m.user.username}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea 
                      className="form-control" 
                      rows={3} 
                      value={currentData.notes || ''} 
                      onChange={e => handleFieldChange('notes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {currentResolution.action === 'ignore' && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <Trash2 size={48} style={{ color: 'var(--error)', marginBottom: '1rem', opacity: 0.5 }} />
                <h3>Row will be ignored</h3>
                <p style={{ maxWidth: '400px', margin: '0.5rem auto' }}>
                  This row is marked to be discarded and will not create any database transaction when processed. Use this for exact duplicates.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                disabled={selectedRowIndex === 0}
                onClick={() => setSelectedRowIndex(prev => prev - 1)}
              >
                &larr; Previous Row
              </button>
              
              <button 
                type="button" 
                className="btn btn-secondary"
                disabled={selectedRowIndex === anomalies.length - 1}
                onClick={() => setSelectedRowIndex(prev => prev + 1)}
              >
                Next Row &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
