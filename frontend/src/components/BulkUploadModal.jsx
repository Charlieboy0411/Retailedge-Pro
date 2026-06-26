import React, { useState, useContext } from 'react';
import axios from 'axios';
import { UploadCloud, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function BulkUploadModal({ onClose }) {
  const { token } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      // For now, this is a mock parse of the CSV since a real CSV parser 
      // (like papaparse) would be needed for production.
      const text = await file.text();
      const rows = text.split('\n').filter(r => r.trim().length > 0);
      const headers = rows[0].split(',');
      
      const parsedUsers = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
        // Add defaults for required fields if missing
        obj.password = obj.password || 'defaultPass123';
        obj.status = obj.status || 'Active';
        return obj;
      });

      const response = await axios.post('/api/users/bulk-upload', { users: parsedUsers }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult({ success: true, count: response.data.count });
    } catch (error) {
      setResult({ success: false, message: error.response?.data?.error || 'Failed to upload' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-card" style={{ width: '500px', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>Bulk Import Users</h3>
          <button onClick={onClose} style={{ cursor: 'pointer' }}><X size={20} color="var(--text-secondary)" /></button>
        </div>

        {result ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <h4 style={{ color: result.success ? 'var(--success)' : 'var(--primary)', marginBottom: '16px' }}>
              {result.success ? `Successfully imported ${result.count} users!` : result.message}
            </h4>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '2px dashed var(--border-glass)', borderRadius: '12px', padding: '48px 24px',
                textAlign: 'center', cursor: 'pointer', background: 'var(--bg-tertiary)', marginBottom: '24px'
              }}
            >
              <UploadCloud size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
              <p style={{ fontWeight: 500, marginBottom: '8px' }}>Drag and drop your CSV file here</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>or click to browse from your computer</p>
              {file && <p style={{ color: 'var(--primary)', marginTop: '16px', fontWeight: 'bold' }}>Selected: {file.name}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? 'Uploading...' : 'Import Users'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
