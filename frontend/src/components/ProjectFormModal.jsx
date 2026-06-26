import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

export default function ProjectFormModal({ isOpen, onClose, onSave, token, editingProject, allProjects, allClients }) {
  const [formData, setFormData] = useState({
    name: '',
    project_code: '',
    clientId: '',
    brand: '',
    project_type: 'Promoter Training',
    business_unit: '',
    description: '',
    start_date: '',
    end_date: '',
    project_phase: 'Planning',
    frequency: 'One-Time',
    status: 'Active',
    country: '',
    zone: '',
    region: '',
    state: '',
    city: '',
    store: '',
    cluster: '',
    territory: '',
    participants_planned: 0,
    sessions_planned: 0,
    assessment_targets: 0,
    certification_targets: 0,
    attendance_targets: 0,
    completion_targets: 0,
    parentId: ''
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name || '',
        project_code: editingProject.project_code || '',
        clientId: editingProject.clientId || '',
        brand: editingProject.brand || '',
        project_type: editingProject.project_type || 'Promoter Training',
        business_unit: editingProject.business_unit || '',
        description: editingProject.description || '',
        start_date: editingProject.start_date || '',
        end_date: editingProject.end_date || '',
        project_phase: editingProject.project_phase || 'Planning',
        frequency: editingProject.frequency || 'One-Time',
        status: editingProject.status || 'Active',
        country: editingProject.country || '',
        zone: editingProject.zone || '',
        region: editingProject.region || '',
        state: editingProject.state || '',
        city: editingProject.city || '',
        store: editingProject.store || '',
        cluster: editingProject.cluster || '',
        territory: editingProject.territory || '',
        participants_planned: editingProject.participants_planned || 0,
        sessions_planned: editingProject.sessions_planned || 0,
        assessment_targets: editingProject.assessment_targets || 0,
        certification_targets: editingProject.certification_targets || 0,
        attendance_targets: editingProject.attendance_targets || 0,
        completion_targets: editingProject.completion_targets || 0,
        parentId: editingProject.parentId || ''
      });
      setLogoPreview(editingProject.project_logo ? `http://localhost:5000${editingProject.project_logo}` : null);
      setLogoFile(null);
    } else {
      setFormData({
        name: '', project_code: '', clientId: '', brand: '', project_type: 'Promoter Training', business_unit: '', description: '',
        start_date: '', end_date: '', project_phase: 'Planning', frequency: 'One-Time', status: 'Active',
        country: '', zone: '', region: '', state: '', city: '', store: '', cluster: '', territory: '',
        participants_planned: 0, sessions_planned: 0, assessment_targets: 0, certification_targets: 0, attendance_targets: 0, completion_targets: 0,
        parentId: ''
      });
      setLogoPreview(null);
      setLogoFile(null);
    }
    setError('');
  }, [editingProject, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Date validation
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        setError('Project End Date cannot precede Start Date.');
        setLoading(false);
        return;
      }
    }

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      if (logoFile) {
        submitData.append('project_logo', logoFile);
      }

      if (editingProject) {
        await axios.put(`/api/projects/${editingProject.id}`, submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post('/api/projects', submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter out the current project and its children from the potential parents list to prevent circular reference
  const potentialParents = allProjects.filter(p => p.id !== editingProject?.id);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-card" style={{
        background: '#FFFFFF', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: 0, borderRadius: '12px', display: 'flex', flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1F2328' }}>{editingProject ? 'Edit Project Details' : 'Add New Project'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{ padding: '12px', background: '#FEF2F2', color: '#EF4444', borderRadius: '8px', marginBottom: '24px', border: '1px solid #FEE2E2' }}>
              {error}
            </div>
          )}

          <form id="projectForm" onSubmit={handleSubmit}>
            {/* Hierarchy Section */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>Hierarchy</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label className="form-label">Mother Project (Optional)</label>
                <select name="parentId" className="form-control" value={formData.parentId} onChange={handleChange}>
                  <option value="">None (This is a Mother Project)</option>
                  {potentialParents.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <small style={{ color: '#64748B' }}>Select an existing project to make this a sub-project under it.</small>
              </div>
            </div>

            {/* Section: Basic Info */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>1. Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label className="form-label">Project Name *</label>
                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">Project Code *</label>
                <input type="text" name="project_code" className="form-control" value={formData.project_code} onChange={handleChange} required placeholder="Unique Code" />
              </div>

              <div>
                <label className="form-label">Client *</label>
                <select name="clientId" className="form-control" value={formData.clientId} onChange={handleChange} required>
                  <option value="">Select Client</option>
                  {allClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Brand *</label>
                <input type="text" name="brand" className="form-control" value={formData.brand} onChange={handleChange} required />
              </div>

              <div>
                <label className="form-label">Project Type *</label>
                <select name="project_type" className="form-control" value={formData.project_type} onChange={handleChange} required>
                  <option>Promoter Training</option>
                  <option>Beauty Advisor Training</option>
                  <option>Merchandiser Development</option>
                  <option>Product Launch Training</option>
                  <option>Compliance Training</option>
                  <option>Certification Programs</option>
                  <option>Supervisor Development</option>
                  <option>Seasonal Campaign Training</option>
                  <option>Leadership Programs</option>
                  <option>Custom Programs</option>
                </select>
              </div>
              <div>
                <label className="form-label">Business Unit</label>
                <input type="text" name="business_unit" className="form-control" value={formData.business_unit} onChange={handleChange} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description</label>
                <textarea name="description" className="form-control" rows="2" value={formData.description} onChange={handleChange}></textarea>
              </div>

              <div>
                <label className="form-label">Project Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '60px', height: '60px', border: '1px dashed #CBD5E1', borderRadius: '8px', 
                    display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', background: '#F8FAFC'
                  }}>
                    {logoPreview ? <img src={logoPreview} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon color="#94A3B8" />}
                  </div>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#3B82F6', fontWeight: 500 }}>
                    <Upload size={16} /> {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>
              </div>
            </div>

            {/* Section: Project Duration */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>2. Project Duration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label className="form-label">Start Date *</label>
                <input type="date" name="start_date" className="form-control" value={formData.start_date} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">End Date *</label>
                <input type="date" name="end_date" className="form-control" value={formData.end_date} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">Project Phase</label>
                <select name="project_phase" className="form-control" value={formData.project_phase} onChange={handleChange}>
                  <option>Planning</option>
                  <option>Execution</option>
                  <option>Monitoring</option>
                  <option>Closure</option>
                </select>
              </div>
              <div>
                <label className="form-label">Frequency</label>
                <select name="frequency" className="form-control" value={formData.frequency} onChange={handleChange}>
                  <option>One-Time</option>
                  <option>Recurring</option>
                  <option>Continuous</option>
                </select>
              </div>
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                  <option>Active</option>
                  <option>Upcoming</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                  <option>Archived</option>
                </select>
              </div>
            </div>

            {/* Section: Geography Mapping */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>3. Geography Mapping</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label className="form-label">Country</label>
                <input type="text" name="country" className="form-control" value={formData.country} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Zone</label>
                <input type="text" name="zone" className="form-control" value={formData.zone} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Region</label>
                <input type="text" name="region" className="form-control" value={formData.region} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">State</label>
                <input type="text" name="state" className="form-control" value={formData.state} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">City</label>
                <input type="text" name="city" className="form-control" value={formData.city} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Store</label>
                <input type="text" name="store" className="form-control" value={formData.store} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Cluster</label>
                <input type="text" name="cluster" className="form-control" value={formData.cluster} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Territory</label>
                <input type="text" name="territory" className="form-control" value={formData.territory} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Project Targets */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>4. Project Targets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label className="form-label">Participants Planned</label>
                <input type="number" name="participants_planned" className="form-control" value={formData.participants_planned} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Training Sessions Planned</label>
                <input type="number" name="sessions_planned" className="form-control" value={formData.sessions_planned} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Assessment Targets</label>
                <input type="number" name="assessment_targets" className="form-control" value={formData.assessment_targets} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Certification Targets</label>
                <input type="number" name="certification_targets" className="form-control" value={formData.certification_targets} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Attendance Targets</label>
                <input type="number" name="attendance_targets" className="form-control" value={formData.attendance_targets} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Completion Targets</label>
                <input type="number" name="completion_targets" className="form-control" value={formData.completion_targets} onChange={handleChange} />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', position: 'sticky', bottom: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="projectForm" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Project'}
          </button>
        </div>

      </div>
    </div>
  );
}
