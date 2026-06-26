import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserMinus, Upload, Search, Filter, MoreVertical, X, Network } from 'lucide-react';
import BulkUploadModal from '../components/BulkUploadModal';
import UserProfilePanel from '../components/UserProfilePanel';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserDirectory() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [roles, setRoles] = useState([
    'Super Admin', 'Admin', 'HR Admin', 'MD', 'COO', 'VP Operations', 
    'Operation Manager', 'Program Manager', 'Supervisor', 'Manager', 'Trainer', 'Employee', 'Client', 'T&D Manager'
  ]);

  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals & Panels
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '', email: '', password: '', employee_id: '', roleName: 'Employee', 
    projectId: '', managerId: '', location: ''
  });

  // Edit User Form State
  const [editUser, setEditUser] = useState({
    id: '', name: '', email: '', password: '', employee_id: '', roleName: 'Employee', 
    projectId: '', managerId: '', location: '', status: 'Active'
  });

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, [token, searchTerm, filterRole]);

  useEffect(() => {
    if (token) {
      fetchManagers();
    }
  }, [token]);

  const getProjectName = (projId) => {
    if (!projId) return 'Unassigned';
    const ids = String(projId).split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) return 'Unassigned';
    const names = ids.map(id => {
      const match = projects.find(p => p.id === id);
      return match ? match.name : id;
    });
    return names.join(', ');
  };

  const fetchUsers = async () => {
    try {
      let query = `?search=${searchTerm}`;
      if (filterRole) query += `&role=${filterRole}`;

      const response = await axios.get(`/api/users${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const potentialManagers = response.data.filter(u => [
        'MD', 'COO', 'VP Operations', 'Operation Manager', 'Program Manager', 'Supervisor'
      ].includes(u.Role?.role_name));
      setManagers(potentialManagers);
    } catch (error) {
      console.error('Failed to fetch managers', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newUser };
      
      await axios.post('/api/users', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAddUserModalOpen(false);
      setNewUser({ 
        name: '', email: '', password: '', employee_id: '', roleName: 'Employee', 
        projectId: '', managerId: '', location: '' 
      });
      fetchUsers();
      fetchManagers();
    } catch (error) {
      console.error('Failed to add user', error);
      alert('Failed to add user');
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editUser };
      if (!payload.password) {
        delete payload.password; // Don't send empty password
      }
      
      const response = await axios.put(`/api/users/${editUser.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsEditUserModalOpen(false);
      if (selectedUser && selectedUser.id === editUser.id) {
        setSelectedUser(response.data);
      }
      fetchUsers();
      fetchManagers();
    } catch (error) {
      console.error('Failed to update user', error);
      alert(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (!window.confirm(`Are you sure you want to delete the user "${userToDelete.name}"?`)) return;
    try {
      await axios.delete(`/api/users/${userToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUser(null);
      fetchUsers();
      fetchManagers();
    } catch (error) {
      console.error('Failed to delete user', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div className="view-section active" style={{ display: 'flex', gap: '24px', overflow: 'hidden', height: '100%' }}>
      
      {/* Main Directory Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">User Directory</h2>
            <p className="section-desc">Manage employees, organizational hierarchy, and training assignments.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/org-chart')}>
              <Network size={18} /> View Org Chart
            </button>
            <button className="btn btn-secondary" onClick={() => setIsUploadModalOpen(true)}>
              <Upload size={18} /> Bulk Import
            </button>
            <button className="btn btn-primary" onClick={() => setIsAddUserModalOpen(true)}>
              + Add User
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div className="header-search" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', width: '400px', display: 'flex', alignItems: 'center', padding: '10px 16px', borderRadius: '8px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search by name, ID, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'none', marginLeft: '8px', width: '100%', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <button className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} /> Smart Filters
            </button>
          </div>

          {showFilters && (
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>System Role</label>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                  <option value="">All Roles</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => { setFilterRole(''); setSearchTerm(''); }}>Clear</button>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                  <th style={{ padding: '16px 12px' }}>Employee Name</th>
                  <th style={{ padding: '16px 12px' }}>Role</th>
                  <th style={{ padding: '16px 12px' }}>Project</th>
                  <th style={{ padding: '16px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-glass)', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setSelectedUser(user)} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background='none'}>
                    <td style={{ padding: '16px 12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>
                        {user.name.charAt(0)}
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>{user.name}</div>
                    </td>
                    <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>
                      {user.Role?.role_name || 'Employee'}
                    </td>
                    <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{getProjectName(user.projectId)}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <span className={user.status === 'Active' ? 'badge badge-success' : 'badge badge-warning'}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Users size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto', display: 'block' }} />
                      No users match your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-out User Profile Panel */}
      <UserProfilePanel 
        user={selectedUser} 
        onClose={() => setSelectedUser(null)} 
        projects={projects}
        onEdit={(u) => {
          setEditUser({
            id: u.id,
            name: u.name,
            email: u.email,
            password: '',
            employee_id: u.employee_id || '',
            roleName: u.Role?.role_name || 'Employee',
            projectId: u.projectId || '',
            managerId: u.managerId || '',
            location: u.location || '',
            status: u.status || 'Active'
          });
          setIsEditUserModalOpen(true);
        }}
        onDelete={handleDeleteUser}
      />

      {/* Bulk Upload Modal */}
      {isUploadModalOpen && (
        <BulkUploadModal onClose={() => { setIsUploadModalOpen(false); fetchUsers(); }} />
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '700px', background: 'var(--bg-primary)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Add New Employee</h3>
              <button onClick={() => setIsAddUserModalOpen(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-primary)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name *</label>
                  <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email *</label>
                  <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              {/* Work Details & Credentials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Employee ID</label>
                  <input type="text" value={newUser.employee_id} onChange={e => setNewUser({...newUser, employee_id: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location</label>
                  <select value={newUser.location} onChange={e => setNewUser({...newUser, location: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                    <option value="">-- Select Location --</option>
                    <option value="Pan India">Pan India</option>
                    <option value="North">North</option>
                    <option value="West">West</option>
                    <option value="East">East</option>
                    <option value="South">South</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Login Password *</label>
                  <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required placeholder="Enter password" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              {/* Hierarchy & Access */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>System Role *</label>
                  <select value={newUser.roleName} onChange={e => setNewUser({...newUser, roleName: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reporting Manager</label>
                  <select value={newUser.managerId} onChange={e => setNewUser({...newUser, managerId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                    <option value="">-- No Manager --</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.Role?.role_name || 'Manager'})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Department/Project(s)</label>
                  {['Program Manager', 'Operation Manager'].includes(newUser.roleName) ? (
                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '8px', background: 'var(--bg-tertiary)' }}>
                      {projects.map(p => {
                        const isChecked = newUser.projectId && newUser.projectId.split(',').includes(p.id);
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentIds = newUser.projectId ? newUser.projectId.split(',').filter(Boolean) : [];
                                let nextIds;
                                if (e.target.checked) {
                                  nextIds = [...currentIds, p.id];
                                } else {
                                  nextIds = currentIds.filter(id => id !== p.id);
                                }
                                setNewUser({ ...newUser, projectId: nextIds.join(',') });
                              }}
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <select value={newUser.projectId} onChange={e => setNewUser({...newUser, projectId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                      <option value="">-- No Project --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
              </div>



              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-glass)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddUserModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '700px', background: 'var(--bg-primary)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Edit Employee Profile</h3>
              <button onClick={() => setIsEditUserModalOpen(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-primary)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleEditUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name *</label>
                  <input type="text" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email *</label>
                  <input type="email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              {/* Password resetting */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reset Password (leave blank to keep current, visible for sharing)</label>
                <input type="text" value={editUser.password} onChange={e => setEditUser({...editUser, password: e.target.value})} placeholder="Enter new password to reset" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
              </div>

              {/* Work Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Employee ID</label>
                  <input type="text" value={editUser.employee_id} onChange={e => setEditUser({...editUser, employee_id: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location</label>
                  <select value={editUser.location} onChange={e => setEditUser({...editUser, location: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                    <option value="">-- Select Location --</option>
                    <option value="Pan India">Pan India</option>
                    <option value="North">North</option>
                    <option value="West">West</option>
                    <option value="East">East</option>
                    <option value="South">South</option>
                  </select>
                </div>
              </div>

              {/* Hierarchy & Access */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>System Role *</label>
                  <select value={editUser.roleName} onChange={e => setEditUser({...editUser, roleName: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reporting Manager</label>
                  <select value={editUser.managerId} onChange={e => setEditUser({...editUser, managerId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                    <option value="">-- No Manager --</option>
                    {managers.filter(m => m.id !== editUser.id).map(m => <option key={m.id} value={m.id}>{m.name} ({m.Role?.role_name || 'Manager'})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Department/Project(s)</label>
                  {['Program Manager', 'Operation Manager'].includes(editUser.roleName) ? (
                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '8px', background: 'var(--bg-tertiary)' }}>
                      {projects.map(p => {
                        const isChecked = editUser.projectId && editUser.projectId.split(',').includes(p.id);
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentIds = editUser.projectId ? editUser.projectId.split(',').filter(Boolean) : [];
                                let nextIds;
                                if (e.target.checked) {
                                  nextIds = [...currentIds, p.id];
                                } else {
                                  nextIds = currentIds.filter(id => id !== p.id);
                                }
                                setEditUser({ ...editUser, projectId: nextIds.join(',') });
                              }}
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <select value={editUser.projectId} onChange={e => setEditUser({...editUser, projectId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                      <option value="">-- No Project --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status *</label>
                <select value={editUser.status} onChange={e => setEditUser({...editUser, status: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-glass)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditUserModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
