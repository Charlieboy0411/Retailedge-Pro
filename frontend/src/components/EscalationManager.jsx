import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { AlertCircle, MessageSquare, PlusCircle, CheckCircle } from 'lucide-react';

export default function EscalationManager({ userRole, projects = [], syncTrigger = 0 }) {
  const { token } = useContext(AuthContext);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Raising Escalation (MD/COO/VP)
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [newEscalation, setNewEscalation] = useState({ subject: '', description: '', projectId: '' });

  // Modal State for Replying (PM)
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [replyText, setReplyText] = useState('');

  const fetchEscalations = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/escalations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEscalations(res.data);
    } catch (err) {
      console.error("Failed to fetch escalations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchEscalations();
  }, [token, syncTrigger]);

  const handleRaiseEscalation = async () => {
    if (!newEscalation.subject || !newEscalation.description || !newEscalation.projectId) {
      alert("All fields are required.");
      return;
    }
    try {
      const res = await axios.post('/api/escalations', newEscalation, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEscalations([res.data, ...escalations]);
      setShowRaiseModal(false);
      setNewEscalation({ subject: '', description: '', projectId: '' });
      alert("Escalation raised successfully!");
    } catch (err) {
      console.error("Failed to raise escalation:", err);
      alert("Failed to raise escalation.");
    }
  };

  const handleReplyEscalation = async () => {
    if (!replyText) {
      alert("Reply text is required.");
      return;
    }
    try {
      const res = await axios.patch(`/api/escalations/${selectedEscalation.id}/reply`, { replyText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEscalations(escalations.map(e => e.id === res.data.id ? res.data : e));
      setShowReplyModal(false);
      setReplyText('');
      alert("Reply sent successfully and escalation resolved!");
    } catch (err) {
      console.error("Failed to reply to escalation:", err);
      alert("Failed to reply.");
    }
  };

  const isUpperManagement = ['MD', 'COO', 'VP Operations'].includes(userRole);
  const isPM = ['Program Manager', 'Admin', 'Super Admin'].includes(userRole);

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="#EF4444" />
            Project Escalations
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
            {isUpperManagement ? 'Raise concerns to Project Managers.' : 'Manage and respond to escalations raised by upper management.'}
          </p>
        </div>

        {isUpperManagement && (
          <button 
            onClick={() => setShowRaiseModal(true)}
            style={{
              padding: '10px 16px', background: '#EF4444', color: 'white', border: 'none',
              borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
            }}
          >
            <PlusCircle size={16} /> Raise Escalation
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontWeight: 600 }}>Loading escalations...</div>
      ) : escalations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
          <CheckCircle size={40} color="#22C55E" style={{ marginBottom: '12px' }} />
          <h4 style={{ margin: 0, color: '#0F172A', fontWeight: 800 }}>No Escalations</h4>
          <p style={{ margin: '6px 0 0 0', color: '#64748B', fontSize: '0.85rem' }}>All projects are running smoothly.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {escalations.map(esc => (
            <div key={esc.id} style={{ border: `1.5px solid ${esc.status === 'Open' ? '#EF4444' : '#22C55E'}`, borderRadius: '12px', padding: '20px', background: esc.status === 'Open' ? '#FEF2F2' : '#F0FDF4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                      background: esc.status === 'Open' ? '#EF4444' : '#22C55E', color: 'white'
                    }}>
                      {esc.status}
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>Project: {esc.Project?.name || 'Unknown'}</span>
                  </div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>{esc.subject}</h4>
                </div>
                {isPM && esc.status === 'Open' && (
                  <button 
                    onClick={() => { setSelectedEscalation(esc); setShowReplyModal(true); }}
                    style={{ padding: '8px 14px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <MessageSquare size={14} /> Reply & Resolve
                  </button>
                )}
              </div>
              
              <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.5', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                {esc.description}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B' }}>
                <span><strong>Raised by:</strong> {esc.raisedBy?.name || 'Unknown'} on {new Date(esc.createdAt).toLocaleDateString()}</span>
              </div>

              {esc.replyText && (
                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', borderLeft: '4px solid #2563EB' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', marginBottom: '6px', textTransform: 'uppercase' }}>
                    PM Reply & Resolution — {esc.repliedBy?.name || 'PM'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#0F172A', lineHeight: '1.5' }}>
                    {esc.replyText}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '8px' }}>
                    Replied on {new Date(esc.repliedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: RAISE ESCALATION ─── */}
      {showRaiseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', width: '500px', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#0F172A' }}>Raise Project Escalation</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Target Project</label>
                <select 
                  value={newEscalation.projectId} 
                  onChange={e => setNewEscalation({...newEscalation, projectId: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                >
                  <option value="">Select a Project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Subject</label>
                <input 
                  type="text" 
                  value={newEscalation.subject} 
                  onChange={e => setNewEscalation({...newEscalation, subject: e.target.value})}
                  placeholder="E.g., High failure rate in recent batch"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Description / Issue Details</label>
                <textarea 
                  value={newEscalation.description} 
                  onChange={e => setNewEscalation({...newEscalation, description: e.target.value})}
                  placeholder="Provide context on what needs to be addressed..."
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRaiseModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRaiseEscalation} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#EF4444', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Submit Escalation</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REPLY (PM) ─── */}
      {showReplyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', width: '500px', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0F172A' }}>Reply to Escalation</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Responding to: <strong>{selectedEscalation?.subject}</strong>
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Your Resolution / Reply</label>
                <textarea 
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Detail the actions taken to resolve this escalation..."
                  rows={5}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowReplyModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReplyEscalation} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Send Reply & Resolve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
