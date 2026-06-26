import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { RefreshCw } from 'lucide-react';

export default function OfflineSync() {
  const { user } = useContext(AuthContext);
  return (
    <div className="view-section active">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
            <RefreshCw size={22} color="#1F2328" />
          </div>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
              Offline Synchronization
            </h2>
            <p className="section-desc" style={{ margin: '4px 0 0' }}>
              Monitor offline device connections and sync payloads.
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