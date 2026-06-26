import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Network, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OrgChart() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For demo purposes, we will attempt to fetch the hierarchy for the logged-in user or a root user.
    // In a real application, you might have a dedicated "CEO" or top-level user ID, or allow searching.
    const fetchHierarchy = async () => {
      try {
        const response = await axios.get(`/api/users/hierarchy/${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHierarchy(response.data);
      } catch (error) {
        console.error('Failed to fetch org chart', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.id) fetchHierarchy();
  }, [token, user]);

  const renderNode = (node) => {
    if (!node) return null;
    return (
      <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 16px' }}>
        <div style={{
          padding: '16px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--primary)',
          borderRadius: '12px',
          minWidth: '200px',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', margin: '0 auto 12px auto' }}>
            {node.name.charAt(0)}
          </div>
          <h4 style={{ margin: '0 0 4px 0', color: 'white' }}>{node.name}</h4>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{node.Role?.role_name || 'Employee'}</div>
        </div>
        
        {node.subordinates && node.subordinates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '2px', height: '24px', background: 'var(--border-glass)' }}></div>
            <div style={{ display: 'flex', gap: '24px', paddingTop: '24px', borderTop: node.subordinates.length > 1 ? '2px solid var(--border-glass)' : 'none', position: 'relative' }}>
              {node.subordinates.map(sub => renderNode(sub))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="view-section active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header">
        <div>
          <button onClick={() => navigate('/users')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
            <ArrowLeft size={16} /> Back to Directory
          </button>
          <h2 className="section-title">Organization Chart</h2>
          <p className="section-desc">Visual representation of your team's reporting structure.</p>
        </div>
        <div className="header-search" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', width: '300px', display: 'flex', alignItems: 'center', padding: '10px 16px', borderRadius: '8px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="Search team member..." style={{ border: 'none', background: 'none', marginLeft: '8px', width: '100%', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
      </div>

      <div className="glass-card" style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading Organization Chart...</div>
        ) : hierarchy ? (
          <div style={{ display: 'flex', justifyContent: 'center', minWidth: '100%' }}>
            {renderNode(hierarchy)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <Network size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto', display: 'block' }} />
            No reporting structure found for your profile.
          </div>
        )}
      </div>
    </div>
  );
}
