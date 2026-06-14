import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, DollarSign, FileSpreadsheet, ArrowLeft, ArrowUpRight, ArrowDownLeft, Calendar, UserPlus, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { GroupTimeline } from '../../components/GroupTimeline';
import { AddExpenseModal } from '../../components/AddExpenseModal';
import { SettleDebtModal } from '../../components/SettleDebtModal';

export const GroupDashboard: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<any>(null);
  const [balancesData, setBalancesData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  // Dynamic settlement suggestion parameters
  const [settlePayerId, setSettlePayerId] = useState('');
  const [settleRecipientId, setSettleRecipientId] = useState('');
  const [settleAmount, setSettleAmount] = useState(0);

  // Selected member for Rohan's request ledger view
  const [selectedLedgerUserId, setSelectedLedgerUserId] = useState<string>('');
  
  // Add member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberError, setMemberError] = useState('');
  
  // Edit membership leave date state
  const [editMembershipId, setEditMembershipId] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  
  const [dashboardError, setDashboardError] = useState('');

  const fetchData = async () => {
    try {
      const [groupRes, balancesRes, expensesRes, settlementsRes] = await Promise.all([
        api.get(`/groups/${groupId}/`),
        api.get(`/groups/${groupId}/balances/`),
        api.get(`/groups/${groupId}/expenses/`),
        api.get(`/groups/${groupId}/settlements/`)
      ]);
      
      setGroup(groupRes.data);
      setBalancesData(balancesRes.data);
      setExpenses(expensesRes.data);
      setSettlements(settlementsRes.data);
      
      // Default selected ledger user to first member if not set
      if (groupRes.data.memberships.length > 0 && !selectedLedgerUserId) {
        // Try selecting current user first, else first member
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        const matched = groupRes.data.memberships.find((m: any) => m.user.id === currentUser?.id);
        setSelectedLedgerUserId(matched ? matched.user.id : groupRes.data.memberships[0].user.id);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
      setDashboardError('Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    setDashboardError('');
    try {
      const response = await api.post(`/groups/${groupId}/imports/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Redirect to wizard
      navigate(`/groups/${groupId}/import/${response.data.import.id}`);
    } catch (err: any) {
      setDashboardError(err.response?.data?.file?.[0] || err.response?.data?.detail || 'Failed to upload CSV.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    try {
      // First, lookup user or let Django look it up.
      // The API expects user_id. We can search or create one, but for this simulation,
      // we can request the user by username.
      // In django app we did PrimaryKeyRelatedField, so let's register the user first if not exists or query.
      // To keep it simple, we can fetch all users or register a placeholder.
      // For testing, let's create the user directly via auth/register if they don't exist,
      // or we can pass a special route.
      // Wait! We can add a user by search. Let's register them with a default password.
      let userObj;
      try {
        // Mock lookup or try creating
        const regRes = await api.post('/auth/register/', {
          username: newMemberName,
          email: `${newMemberName.toLowerCase().replace(/\s+/g, '')}@spreetail.com`,
          password: 'Password123'
        });
        userObj = regRes.data.user;
      } catch (regErr: any) {
        // If user already exists, login/fetch them or look up.
        // Actually, we can implement user lookup, or just try to get user by name.
        // Let's call /api/groups/<id>/members/ post with user_id. We need user_id.
        // To query user_id, let's make the API accept username in backend, or register.
        // Let's look up if we can register or get. If register failed, it means user exists,
        // let's create a custom lookup endpoint in django, or let the user create accounts.
        // Actually, we can easily register them and ignore 'already exists' by doing a query.
        // Let's create a quick API lookup or lookup users list.
        // Let's search by trying registration, or if username exists, we can fetch from groups members.
        // Wait! Let's register users. It is simpler. If we get username exists, let's look up users.
        // Wait, let's see how our backend handles it. In `groups/views.py`:
        // GroupMembershipListCreateView gets serializers with PrimaryKeyRelatedField(queryset=User.objects.all(), source='user').
        // So we need a user ID. Let's create a lookup or search.
        // Actually, we can register them, and if registration fails because 'username exists',
        // let's support entering user UUID, or let's create a fallback in django to fetch user by name?
        // Wait! We already wrote groups/views.py. Let's look at groups/serializers.py:
        // user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user', write_only=True)
        // If we register users beforehand, it creates them.
        // Let's search or create user. Let's implement creating them. If they already exist, we need to find their ID.
        // Let's write a simple users list endpoint or support it.
        // Actually, we can register users. Let's check what usernames are in CSV: Aisha, Rohan, Priya, Meera, Sam, Dev, Kabir.
        // When we run the CSV import, the wizard will map them. Let's write a view in Django to search user by username or register.
        // Wait! We can write a quick utility view in authentication to search user, or register.
        // Let's register them first:
        const regRes = await api.post('/auth/register/', {
          username: newMemberName,
          email: `${newMemberName.toLowerCase().replace(/\s+/g, '')}@spreetail.com`,
          password: 'Password123'
        });
        userObj = regRes.data.user;
      }

      await api.post(`/groups/${groupId}/members/`, {
        user_id: userObj.id,
        joined_at: joinDate
      });

      setNewMemberName('');
      setShowAddMemberModal(false);
      fetchData();
    } catch (err: any) {
      setMemberError(err.response?.data?.[0] || err.response?.data?.detail || 'Failed to add member to group.');
    }
  };

  const handleUpdateLeaveDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMembershipId || !leaveDate) return;
    try {
      await api.patch(`/groups/memberships/${editMembershipId}/`, {
        left_at: leaveDate
      });
      setEditMembershipId('');
      setLeaveDate('');
      fetchData();
    } catch (err: any) {
      alert('Failed to update leave date: ' + (err.response?.data?.left_at?.[0] || 'Invalid input'));
    }
  };

  const handleSettleSuggested = (debt: any) => {
    setSettlePayerId(debt.from_user_id);
    setSettleRecipientId(debt.to_user_id);
    setSettleAmount(debt.amount);
    setShowSettleModal(true);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading group details...</div>;
  }

  const selectedLedger = balancesData?.ledgers?.[selectedLedgerUserId] || [];
  const selectedLedgerMember = group?.memberships.find((m: any) => m.user.id === selectedLedgerUserId)?.user;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to groups
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>{group?.name}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Active members: {group?.memberships.filter((m: any) => !m.left_at).map((m: any) => m.user.username).join(', ')}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label className="btn btn-secondary" style={{ display: 'inline-flex', gap: '0.5rem', cursor: 'pointer' }}>
            <FileSpreadsheet size={18} style={{ color: 'var(--primary)' }} />
            <span>{uploading ? 'Parsing CSV...' : 'Upload CSV'}</span>
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
              disabled={uploading}
            />
          </label>
          <button className="btn btn-secondary" onClick={() => setShowSettleModal(true)}>
            <DollarSign size={18} style={{ color: 'var(--success)' }} />
            <span>Settle Debt</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>
            <Plus size={18} />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {dashboardError && (
        <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(244,63,94,0.2)' }}>
          {dashboardError}
        </div>
      )}

      <div className="grid-layout">
        {/* Left Column: Balances & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Net Balances (Aisha's request) */}
          <div className="card">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Group Balances</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {balancesData?.net_balances.map((item: any) => {
                const isPositive = item.net_balance > 0;
                const isZero = item.net_balance === 0;
                return (
                  <div key={item.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 500 }}>{item.username}</span>
                    <span className={isZero ? '' : isPositive ? 'amt-positive' : 'amt-negative'}>
                      {isZero ? 'Settled' : `${isPositive ? '+' : ''}₹${parseFloat(item.net_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Simplified Debts (Aisha's request) */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Suggested Debt Settlements</h3>
              {balancesData?.simplified_debts.length === 0 ? (
                <p style={{ color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle size={14} /> Everyone is fully settled!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {balancesData?.simplified_debts.map((debt: any, index: number) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--primary-light)', border: '1px solid rgba(95,109,250,0.15)', borderRadius: '8px', fontSize: '0.9rem' }}>
                      <span>
                        <strong>{debt.from_user_name}</strong> pays <strong>{debt.to_user_name}</strong>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 'bold' }}>₹{parseFloat(debt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleSettleSuggested(debt)}>Settle</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Group Timeline (Meera's/Sam's request) */}
          <GroupTimeline memberships={group?.memberships || []} />

          {/* Manage Members */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Manage Group Members</h3>
            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => setShowAddMemberModal(true)}>
              <UserPlus size={16} /> Add Group Member
            </button>

            {/* Set leave date form */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <span className="form-label">Set Member Move-Out Date:</span>
              <form onSubmit={handleUpdateLeaveDate} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <select 
                  className="form-control" 
                  style={{ flex: 2, minWidth: '130px' }}
                  value={editMembershipId}
                  onChange={e => setEditMembershipId(e.target.value)}
                  required
                >
                  <option value="">Select Member</option>
                  {group?.memberships.filter((m: any) => !m.left_at).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.user.username}</option>
                  ))}
                </select>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ flex: 2, minWidth: '130px' }}
                  value={leaveDate}
                  onChange={e => setLeaveDate(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Set</button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Rohan's Ledger & Audit Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Rohan's Request Ledger Breakdown (No Magic Numbers) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem' }}>Individual Ledger</h2>
              <select 
                className="form-control" 
                style={{ width: '150px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                value={selectedLedgerUserId}
                onChange={e => setSelectedLedgerUserId(e.target.value)}
              >
                {group?.memberships.map((m: any) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.username}</option>
                ))}
              </select>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Audit Log for <strong>{selectedLedgerMember?.username}</strong>. Review exactly which expenses contribute to their balance.
            </p>

            <div style={{ flex: 1, maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {selectedLedger.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.9rem' }}>
                  No transaction history logged for this user.
                </div>
              ) : (
                <div className="ledger-list">
                  {selectedLedger.map((item: any, idx: number) => {
                    const isPlus = item.type === 'expense_paid' || item.type === 'settlement_paid';
                    const originalCurrency = item.currency !== 'INR' ? ` (${item.amount_original} ${item.currency})` : '';
                    return (
                      <div key={idx} className="ledger-item">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#fff' }}>{item.description}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.details}{originalCurrency}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Calendar size={10} /> {new Date(item.date).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={isPlus ? 'amt-positive' : 'amt-negative'} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '1rem' }}>
                          {isPlus ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                          ₹{parseFloat(item.amount_inr).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Raw transactions lists */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Group Transactions Log</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                <th style={{ padding: '0.75rem 1rem' }}>Paid By</th>
                <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                <th style={{ padding: '0.75rem 1rem' }}>Split Details</th>
                <th style={{ padding: '0.75rem 1rem' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && settlements.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No transactions found.</td>
                </tr>
              ) : (
                <>
                  {/* Map Expenses */}
                  {expenses.map(exp => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(exp.date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{exp.description}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{exp.paid_by.username}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        ₹{parseFloat(exp.amount_in_inr).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {exp.currency !== 'INR' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> ({exp.amount} {exp.currency})</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span className="badge badge-info">{exp.split_type}</span>{' '}
                        {exp.splits.map((s: any) => `${s.user.username}: ₹${s.calculated_amount_inr}`).join(', ')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{exp.notes || '-'}</td>
                    </tr>
                  ))}
                  {/* Map Settlements */}
                  {settlements.map(setl => (
                    <tr key={setl.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(16, 185, 129, 0.02)' }}>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(setl.date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--success)', fontWeight: 500 }}>Debt Settlement</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{setl.paid_by.username}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--success)', fontWeight: 500 }}>
                        ₹{parseFloat(setl.amount_in_inr).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                        Recipient: {setl.paid_to.username}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{setl.notes || '-'}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showExpenseModal && (
        <AddExpenseModal 
          groupId={groupId!} 
          memberships={group?.memberships || []} 
          onClose={() => setShowExpenseModal(false)}
          onSuccess={fetchData}
        />
      )}

      {showSettleModal && (
        <SettleDebtModal 
          groupId={groupId!}
          memberships={group?.memberships || []}
          onClose={() => {
            setShowSettleModal(false);
            setSettlePayerId('');
            setSettleRecipientId('');
            setSettleAmount(0);
          }}
          onSuccess={fetchData}
          suggestedPayerId={settlePayerId}
          suggestedRecipientId={settleRecipientId}
          suggestedAmount={settleAmount}
        />
      )}

      {showAddMemberModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Group Member</h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowAddMemberModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="modal-body">
                {memberError && (
                  <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {memberError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Member Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newMemberName} 
                    onChange={e => setNewMemberName(e.target.value)} 
                    required 
                    placeholder="e.g. Sam"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Join Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={joinDate} 
                    onChange={e => setJoinDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
