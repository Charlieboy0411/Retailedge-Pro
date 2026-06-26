import React, { useContext } from 'react';
import { X, Briefcase, MapPin, Calendar, Mail, Phone, Award, Edit2, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function UserProfilePanel({ user, onClose, onEdit, onDelete, projects }) {
  const { user: currentUser } = useContext(AuthContext);
  if (!user) return null;

  const canManage = currentUser && ['Admin', 'Super Admin', 'Program Manager'].includes(currentUser.role);

  const getProjectName = (projId) => {
    if (!projId) return 'Unassigned';
    const ids = String(projId).split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) return 'Unassigned';
    if (!projects || projects.length === 0) return projId;
    const names = ids.map(id => {
      const match = projects.find(p => p.id === id);
      return match ? match.name : id;
    });
    return names.join(', ');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: '400px',
      background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border-glass)',
      zIndex: 1000,
      boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{user.name}</h2>
            <div style={{ color: 'var(--text-secondary)' }}>{user.Role?.role_name || 'Employee'}</div>
            <span className={user.status === 'Active' ? 'badge badge-success' : 'badge badge-warning'} style={{ marginTop: '8px', display: 'inline-block' }}>
              {user.status}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '1px' }}>Contact Information</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', color: 'var(--text-primary)' }}>
            <Mail size={16} color="var(--text-muted)" /> {user.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
            <Phone size={16} color="var(--text-muted)" /> {user.mobile || 'Not provided'}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '1px' }}>Work Details</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: 'var(--text-primary)' }}>
            <Briefcase size={16} color="var(--text-muted)" /> 
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Department/Project</div>
              {getProjectName(user.projectId)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
            <MapPin size={16} color="var(--text-muted)" /> 
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location</div>
              {user.location || 'Remote'}
            </div>
          </div>
        </div>

        {user.manager && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '1px' }}>Reporting Manager</h3>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                {user.manager.name.charAt(0)}
              </div>
              <div style={{ color: 'var(--text-primary)' }}>{user.manager.name}</div>
            </div>
          </div>
        )}


      </div>

      {/* Footer Actions */}
      {canManage && (
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '12px', background: 'var(--bg-secondary)' }}>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1, justifyContent: 'center' }} 
            onClick={() => onEdit(user)}
          >
            <Edit2 size={16} /> Edit Employee
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1, justifyContent: 'center', color: 'var(--error)', borderColor: 'var(--border-glass)' }}
            onClick={() => onDelete(user)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
