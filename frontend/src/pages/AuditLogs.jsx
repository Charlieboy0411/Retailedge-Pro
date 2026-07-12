import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Archive } from 'lucide-react';

export default function AuditLogs() {
  const { user } = useContext(AuthContext);
  return (
    <div className="view-section active">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--bg-glass)', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
            <Archive size={22} color='var(--text-primary)' />
          </div>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
              Audit Logs
            </h2>
            <p className="section-desc" style={{ margin: '4px 0 0' }}>
              Review system-wide actions and events for security compliance.
            </p>
          </div>
        </div>
      </div>
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h3>Module Coming Soon</h3>
        <p>This section is currently under development.</p>
      </div>
    </div>
  );
}