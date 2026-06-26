import React, { useState, useEffect, useContext } from 'react';
import { Briefcase, Plus, Search, Eye, Edit2, Trash2, Download, Users, FolderOpen, Activity, AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ProjectFormModal from '../components/ProjectFormModal';

export default function Projects() {
  const { token } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  // State for tracking which mother projects are expanded to show sub-projects
  const [expandedProjects, setExpandedProjects] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, clientRes] = await Promise.all([
        axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProjects(projRes.data);
      setClients(clientRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const toggleExpand = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const handleOpenModal = (project = null) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleSave = () => {
    handleCloseModal();
    fetchData();
  };

  const handleDelete = async (project) => {
    if (window.confirm(`Are you sure you want to delete project: ${project.name}?`)) {
      try {
        await axios.delete(`/api/projects/${project.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete project');
      }
    }
  };

  // Build Hierarchy (Mother Projects and their Sub-projects)
  const motherProjects = projects.filter(p => !p.parentId);
  const subProjects = projects.filter(p => p.parentId);

  // Group sub-projects by parent ID
  const subProjectsMap = {};
  subProjects.forEach(sp => {
    if (!subProjectsMap[sp.parentId]) subProjectsMap[sp.parentId] = [];
    subProjectsMap[sp.parentId].push(sp);
  });

  // KPI Calculations
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const upcomingProjects = projects.filter(p => p.status === 'Upcoming').length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  
  // Aggregate targets across all projects
  const participantsCovered = projects.reduce((sum, p) => sum + (p.participants_planned || 0), 0);
  
  // Mock data for Health Score for now
  const healthScore = 96; 

  const filterProject = (p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.project_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.Client?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : p.status === statusFilter;
    return matchesSearch && matchesStatus;
  };

  return (
    <div className="view-section active">
      {/* Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
            <FolderOpen size={22} color="#1F2328" />
          </div>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
              Project Management
            </h2>
            <p className="section-desc" style={{ margin: '4px 0 0' }}>
              Plan, execute, monitor, and govern retail training projects.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Add Project
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#E0F2FE', padding: '12px', borderRadius: '50%', color: '#0284C7' }}><Briefcase size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Total Projects</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{totalProjects}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#DCFCE7', padding: '12px', borderRadius: '50%', color: '#16A34A' }}><Activity size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Active Projects</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{activeProjects}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FEF9C3', padding: '12px', borderRadius: '50%', color: '#CA8A04' }}><FolderOpen size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Upcoming Projects</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{upcomingProjects}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#F3E8FF', padding: '12px', borderRadius: '50%', color: '#9333EA' }}><Users size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Participants Covered</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{participantsCovered}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FFEDD5', padding: '12px', borderRadius: '50%', color: '#EA580C' }}><AlertTriangle size={24} /></div>
          <div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Health Score</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', color: '#1E293B' }}>{healthScore}%</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-card" style={{ padding: '24px' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ margin: 0, color: '#1F2328', fontSize: '1.1rem' }}>Project Repository</h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Search projects..." 
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
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading projects...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#EF4444' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569', width: '40px' }}></th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Project Name</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Code</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Client & Brand</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Participants</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {motherProjects.filter(filterProject).map(mother => {
                  const children = subProjectsMap[mother.id] || [];
                  const isExpanded = !!expandedProjects[mother.id];
                  
                  return (
                    <React.Fragment key={mother.id}>
                      {/* Mother Project Row */}
                      <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FFFFFF' }}>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          {children.length > 0 && (
                            <button 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              onClick={() => toggleExpand(mother.id)}
                            >
                              {isExpanded ? <ChevronDown size={18} color="#64748B" /> : <ChevronRight size={18} color="#64748B" />}
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', background: '#F8FAFC', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #E2E8F0' }}>
                            {mother.project_logo ? (
                              <img src={`http://localhost:5000${mother.project_logo}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <FolderOpen size={16} color="#94A3B8" />
                            )}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: '#1E293B', display: 'block' }}>{mother.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>MOTHER PROJECT</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: '#475569', fontWeight: 500 }}>{mother.project_code || '-'}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ display: 'block', color: '#1E293B', fontWeight: 500 }}>{mother.Client?.name || '-'}</span>
                          <span style={{ display: 'block', color: '#64748B', fontSize: '0.85rem' }}>{mother.brand || '-'}</span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center', color: '#475569' }}>{mother.participants_planned || 0}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                            background: mother.status === 'Active' ? '#DCFCE7' : mother.status === 'Completed' ? '#F1F5F9' : '#FEF9C3',
                            color: mother.status === 'Active' ? '#16A34A' : mother.status === 'Completed' ? '#64748B' : '#CA8A04'
                          }}>
                            {mother.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button className="btn btn-secondary" style={{ padding: '6px', border: 'none', background: 'transparent' }} onClick={() => handleOpenModal(mother)} title="Edit">
                              <Edit2 size={18} color="#64748B" />
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '6px', border: 'none', background: 'transparent' }} onClick={() => handleDelete(mother)} title="Delete">
                              <Trash2 size={18} color="#EF4444" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Sub-projects (if expanded) */}
                      {isExpanded && children.map(child => (
                        <tr key={child.id} style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                          <td style={{ padding: '16px' }}></td>
                          <td style={{ padding: '16px', paddingLeft: '48px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#CBD5E1' }}></div>
                            <span style={{ fontWeight: 500, color: '#334155' }}>{child.name}</span>
                          </td>
                          <td style={{ padding: '16px', color: '#64748B', fontSize: '0.9rem' }}>{child.project_code || '-'}</td>
                          <td style={{ padding: '16px', color: '#64748B', fontSize: '0.9rem' }}>
                            {child.Client?.name || '-'} / {child.brand || '-'}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>{child.participants_planned || 0}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600,
                              background: child.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                              color: child.status === 'Active' ? '#16A34A' : '#64748B'
                            }}>
                              {child.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button className="btn btn-secondary" style={{ padding: '6px', border: 'none', background: 'transparent' }} onClick={() => handleOpenModal(child)} title="Edit">
                                <Edit2 size={16} color="#64748B" />
                              </button>
                              <button className="btn btn-secondary" style={{ padding: '6px', border: 'none', background: 'transparent' }} onClick={() => handleDelete(child)} title="Delete">
                                <Trash2 size={16} color="#EF4444" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {motherProjects.filter(filterProject).length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No projects found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProjectFormModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSave} 
        token={token} 
        editingProject={editingProject} 
        allProjects={projects}
        allClients={clients}
      />

    </div>
  );
}
