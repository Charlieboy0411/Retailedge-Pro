import React, { useState, useEffect, useContext } from 'react';
import { Briefcase, Plus, Search, Eye, Edit2, Trash2, Download, Users, FolderOpen, Activity, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ClientFormModal from '../components/ClientFormModal';

export default function ClientManagement() {
  const { token } = useContext(AuthContext);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(res.data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchClients();
    }
  }, [token]);

  const handleOpenModal = (client = null) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSave = () => {
    handleCloseModal();
    fetchClients();
  };

  const handleDelete = async (client) => {
    if (client.activeProjectsCount > 0) {
      alert(`Cannot delete client. They have ${client.activeProjectsCount} active project(s).`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
      try {
        await axios.delete(`/api/clients/${client.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchClients();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete client');
      }
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.primary_contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.primary_contact_email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate KPIs
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'Active').length;
  const activeProjectsCount = clients.reduce((sum, c) => sum + (c.activeProjectsCount || 0), 0);
  
  // Mock data for SLA & Users for now
  const clientUsers = 5842; 
  const slaCompliance = 98;

  return (
    <div className="view-section active">
      {/* Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
            <Briefcase size={22} color="#1F2328" />
          </div>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
              Client Management
            </h2>
            <p className="section-desc" style={{ margin: '4px 0 0' }}>
              Manage all client organizations and their engagement.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Add Client
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#E0F2FE', padding: '12px', borderRadius: '50%', color: '#0284C7' }}><Users size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Total Clients</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{totalClients}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#DCFCE7', padding: '12px', borderRadius: '50%', color: '#16A34A' }}><Activity size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Active Clients</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{activeClients}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#F3E8FF', padding: '12px', borderRadius: '50%', color: '#9333EA' }}><FolderOpen size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Active Projects</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{activeProjectsCount}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FFEDD5', padding: '12px', borderRadius: '50%', color: '#EA580C' }}><AlertTriangle size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>SLA Compliance</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{slaCompliance}%</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-card" style={{ padding: '24px' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ margin: 0, color: '#1F2328', fontSize: '1.1rem' }}>All Clients</h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Search clients..." 
                className="form-control"
                style={{ paddingLeft: '38px', width: '250px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="form-control" 
              style={{ width: '150px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">Status: All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading clients...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#EF4444' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Client Name</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Primary Contact</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Email</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Phone</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Active Projects</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>SLA Compliance</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', background: '#F8FAFC', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #E2E8F0' }}>
                        {client.client_logo ? (
                          <img src={`http://localhost:5000${client.client_logo}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{client.name.charAt(0)}</span>
                        )}
                      </div>
                      <span style={{ fontWeight: 500, color: '#1E293B' }}>{client.name}</span>
                    </td>
                    <td style={{ padding: '16px', color: '#475569' }}>{client.primary_contact_name || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{client.primary_contact_email || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{client.primary_contact_phone || '-'}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#475569' }}>{client.activeProjectsCount || 0}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        background: client.status === 'Active' ? '#DCFCE7' : client.status === 'Suspended' ? '#FEE2E2' : '#F1F5F9',
                        color: client.status === 'Active' ? '#16A34A' : client.status === 'Suspended' ? '#EF4444' : '#64748B'
                      }}>
                        {client.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#1E293B' }}>
                      {client.sla_agreement ? client.sla_agreement.split(' - ')[1] || 'N/A' : 'N/A'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px', border: 'none', background: 'transparent' }} onClick={() => handleOpenModal(client)} title="View/Edit">
                          <Eye size={18} color="#64748B" />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px', border: 'none', background: 'transparent' }} onClick={() => handleDelete(client)} title="Delete">
                          <Trash2 size={18} color="#EF4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No clients found matching the criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClientFormModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSave} 
        token={token} 
        editingClient={editingClient} 
      />

    </div>
  );
}