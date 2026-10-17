import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Bell } from 'lucide-react';

export default function NotificationsCenter() {
  const { user } = useContext(AuthContext);
  return (
    <div className="view-section active">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#EFF6FF', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
            <Bell size={20} color="var(--primary)" />
          </div>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
              Notifications Center
            </h2>
            <p className="section-desc" style={{ margin: '4px 0 0' }}>
              Manage alerts, broadcast messages, and push notifications.
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