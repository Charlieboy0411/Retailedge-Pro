import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

export default function ClientFormModal({ isOpen, onClose, onSave, token, editingClient }) {
  const [formData, setFormData] = useState({
    name: '',
    client_code: '',
    client_type: 'Corporate',
    industry: 'Retail',
    website: '',
    status: 'Active',
    primary_contact_name: '',
    designation: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    alternate_contact_number: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pin_code: '',
    sla_agreement: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_type: 'Annual',
    renewal_frequency: 'Yearly',
    notes: ''
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name || '',
        client_code: editingClient.client_code || '',
        client_type: editingClient.client_type || 'Corporate',
        industry: editingClient.industry || 'Retail',
        website: editingClient.website || '',
        status: editingClient.status || 'Active',
        primary_contact_name: editingClient.primary_contact_name || '',
        designation: editingClient.designation || '',
        primary_contact_email: editingClient.primary_contact_email || '',
        primary_contact_phone: editingClient.primary_contact_phone || '',
        alternate_contact_number: editingClient.alternate_contact_number || '',
        address: editingClient.address || '',
        city: editingClient.city || '',
        state: editingClient.state || '',
        country: editingClient.country || '',
        pin_code: editingClient.pin_code || '',
        sla_agreement: editingClient.sla_agreement || '',
        contract_start_date: editingClient.contract_start_date || '',
        contract_end_date: editingClient.contract_end_date || '',
        contract_type: editingClient.contract_type || 'Annual',
        renewal_frequency: editingClient.renewal_frequency || 'Yearly',
        notes: editingClient.notes || ''
      });
      setLogoPreview(editingClient.client_logo ? `http://localhost:5000${editingClient.client_logo}` : null);
      setLogoFile(null);
    } else {
      setFormData({
        name: '', client_code: '', client_type: 'Corporate', industry: 'Retail', website: '', status: 'Active',
        primary_contact_name: '', designation: '', primary_contact_email: '', primary_contact_phone: '', alternate_contact_number: '',
        address: '', city: '', state: '', country: '', pin_code: '',
        sla_agreement: '', contract_start_date: '', contract_end_date: '', contract_type: 'Annual', renewal_frequency: 'Yearly', notes: ''
      });
      setLogoPreview(null);
      setLogoFile(null);
    }
    setError('');
  }, [editingClient, isOpen]);

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
    if (formData.contract_start_date && formData.contract_end_date) {
      if (new Date(formData.contract_end_date) < new Date(formData.contract_start_date)) {
        setError('Contract End Date cannot precede Start Date.');
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
        submitData.append('logo', logoFile);
      }

      if (editingClient) {
        await axios.put(`/api/clients/${editingClient.id}`, submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post('/api/clients', submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1F2328' }}>{editingClient ? 'Edit Client Details' : 'Add New Client'}</h2>
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

          <form id="clientForm" onSubmit={handleSubmit}>
            {/* Section: Basic Info */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>1. Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label className="form-label">Client Name *</label>
                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">Client Code *</label>
                <input type="text" name="client_code" className="form-control" value={formData.client_code} onChange={handleChange} required placeholder="Unique Code" />
              </div>

              <div>
                <label className="form-label">Client Logo</label>
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

              <div>
                <label className="form-label">Client Type</label>
                <select name="client_type" className="form-control" value={formData.client_type} onChange={handleChange}>
                  <option>Corporate</option>
                  <option>Retail Agency</option>
                  <option>Franchise</option>
                  <option>Distributor</option>
                </select>
              </div>

              <div>
                <label className="form-label">Industry</label>
                <select name="industry" className="form-control" value={formData.industry} onChange={handleChange}>
                  <option>Retail</option>
                  <option>FMCG</option>
                  <option>Pharmaceuticals</option>
                  <option>Cosmetics</option>
                  <option>Electronics</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Website</label>
                <input type="url" name="website" className="form-control" value={formData.website} onChange={handleChange} placeholder="https://..." />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Suspended</option>
                </select>
              </div>
            </div>

            {/* Section: Contact Info */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>2. Contact Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label className="form-label">Primary Contact Name *</label>
                <input type="text" name="primary_contact_name" className="form-control" value={formData.primary_contact_name} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">Designation</label>
                <input type="text" name="designation" className="form-control" value={formData.designation} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Email Address *</label>
                <input type="email" name="primary_contact_email" className="form-control" value={formData.primary_contact_email} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">Phone Number *</label>
                <input type="text" name="primary_contact_phone" className="form-control" value={formData.primary_contact_phone} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">Alternate Contact Number</label>
                <input type="text" name="alternate_contact_number" className="form-control" value={formData.alternate_contact_number} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Address Info */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>3. Address Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Address</label>
                <input type="text" name="address" className="form-control" value={formData.address} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">City</label>
                <input type="text" name="city" className="form-control" value={formData.city} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">State</label>
                <input type="text" name="state" className="form-control" value={formData.state} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Country</label>
                <input type="text" name="country" className="form-control" value={formData.country} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">PIN Code</label>
                <input type="text" name="pin_code" className="form-control" value={formData.pin_code} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Commercial Details */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>4. Commercial Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label className="form-label">SLA Agreement</label>
                <select name="sla_agreement" className="form-control" value={formData.sla_agreement} onChange={handleChange}>
                  <option value="">Select SLA</option>
                  <option>Gold - 99%</option>
                  <option>Silver - 95%</option>
                  <option>Standard - 90%</option>
                </select>
              </div>
              <div>
                <label className="form-label">Contract Type</label>
                <select name="contract_type" className="form-control" value={formData.contract_type} onChange={handleChange}>
                  <option>Annual</option>
                  <option>Multi-Year</option>
                  <option>Pilot</option>
                  <option>Project Based</option>
                </select>
              </div>
              <div>
                <label className="form-label">Contract Start Date</label>
                <input type="date" name="contract_start_date" className="form-control" value={formData.contract_start_date} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Contract End Date</label>
                <input type="date" name="contract_end_date" className="form-control" value={formData.contract_end_date} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label">Renewal Frequency</label>
                <select name="renewal_frequency" className="form-control" value={formData.renewal_frequency} onChange={handleChange}>
                  <option>Yearly</option>
                  <option>Quarterly</option>
                  <option>Monthly</option>
                </select>
              </div>
            </div>

            {/* Section: Additional Information */}
            <h3 style={{ color: '#3E5C8A', marginBottom: '16px', fontSize: '1rem' }}>5. Additional Information</h3>
            <div style={{ marginBottom: '32px' }}>
              <label className="form-label">Notes</label>
              <textarea name="notes" className="form-control" rows="3" value={formData.notes} onChange={handleChange}></textarea>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', position: 'sticky', bottom: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="clientForm" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Client'}
          </button>
        </div>

      </div>
    </div>
  );
}
