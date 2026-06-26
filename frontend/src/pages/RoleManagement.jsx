import React, { useState, useEffect, useContext } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function RoleManagement() {
  const { token, user } = useContext(AuthContext);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const defaultPermissions = {
    manage_users: false,
    manage_projects: false,
    create_trainings: false,
    view_reports: false,
    manage_roles: false
  };

  const [formData, setFormData] = useState({
    role_name: '',
    permissions: { ...defaultPermissions }
  });

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(res.data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoles();
    }
  }, [token]);

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        role_name: role.role_name,
        permissions: role.permissions || { ...defaultPermissions }
      });
    } else {
      setEditingRole(null);
      setFormData({
        role_name: '',
        permissions: { ...defaultPermissions }
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleTogglePermission = (key) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSave = async () => {
    try {
      if (editingRole) {
        await axios.put(`/api/roles/${editingRole.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/roles', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      handleCloseModal();
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save role');
    }
  };

  const handleDelete = async (role) => {
    if (role.isSystem) {
      alert('Cannot delete core system roles.');
      return;
    }
    if (role.userCount > 0) {
      alert(`Cannot delete role. ${role.userCount} user(s) are still assigned to it.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete the role "${role.role_name}"?`)) {
      try {
        await axios.delete(`/api/roles/${role.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchRoles();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete role');
      }
    }
  };

  return (
    <div className="view-section active">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
            <Shield size={22} color="#1F2328" />
          </div>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
              Role Management
            </h2>
            <p className="section-desc" style={{ margin: '4px 0 0' }}>
              Configure permissions and access controls across the platform.
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Create Role
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#5F6875' }}>Loading roles...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#EF4444' }}>{error}</div>
      ) : (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: '#1F2328' }}>Role Name</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: '#1F2328' }}>Users Assigned</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: '#1F2328' }}>Permissions</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: '#1F2328', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px 24px', color: '#1F2328', fontWeight: 500 }}>
                    {role.role_name}
                    {role.isSystem && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#E2E8F0', padding: '2px 8px', borderRadius: '12px', color: '#475569' }}>System</span>}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#5F6875' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', borderRadius: '50%', width: '32px', height: '32px', fontWeight: 600 }}>
                      {role.userCount}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {role.permissions && Object.entries(role.permissions).filter(([k, v]) => v).map(([key]) => (
                        <span key={key} style={{ fontSize: '0.8rem', background: 'rgba(62, 92, 138, 0.1)', color: '#3E5C8A', padding: '4px 10px', borderRadius: '16px' }}>
                          {key.replace('_', ' ')}
                        </span>
                      ))}
                      {(!role.permissions || Object.values(role.permissions).filter(v => v).length === 0) && (
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No permissions set</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px', marginRight: '8px' }} onClick={() => handleOpenModal(role)} title="Edit Role">
                      <Edit2 size={16} />
                    </button>
                    {!role.isSystem && (
                      <button className="btn btn-secondary" style={{ padding: '6px', color: '#EF4444', borderColor: '#FEE2E2', background: '#FEF2F2' }} onClick={() => handleDelete(role)} title="Delete Role">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#5F6875' }}>No roles found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '32px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F6875' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#1F2328' }}>Role Name</label>
              <input 
                type="text" 
                value={formData.role_name}
                onChange={(e) => setFormData({...formData, role_name: e.target.value})}
                disabled={editingRole?.isSystem}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                placeholder="e.g. Content Reviewer"
              />
              {editingRole?.isSystem && <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>System role names cannot be changed.</p>}
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '16px', fontWeight: 500, color: '#1F2328' }}>Permissions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.keys(defaultPermissions).map(key => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #F1F5F9', borderRadius: '8px', background: '#F8FAFC' }}>
                    <span style={{ color: '#334155', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                    <button 
                      onClick={() => handleTogglePermission(key)}
                      style={{ 
                        width: '40px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: formData.permissions[key] ? '#3B8C68' : '#CBD5E1',
                        position: 'relative', transition: '0.3s'
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', background: '#FFF', borderRadius: '50%',
                        position: 'absolute', top: '3px', left: formData.permissions[key] ? '19px' : '3px',
                        transition: '0.3s'
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!formData.role_name.trim()}>Save Role</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}