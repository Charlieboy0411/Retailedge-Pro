import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Award, Calendar, Download, Printer, ShieldCheck, X } from 'lucide-react';

export default function Certificates() {
  const { token, user } = useContext(AuthContext);
  const [certificates, setCertificates] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, [token]);

  const fetchCertificates = async () => {
    try {
      const response = await axios.get('/api/certificates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificates(response.data);
    } catch (error) {
      console.error('Failed to fetch certificates', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async (cert) => {
    try {
      const response = await axios.get(`/api/certificates/${cert.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate_${cert.User?.name.replace(/\s+/g, '_') || 'Student'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF. Please try again.');
    }
  };

  return (
    <div className="view-section active" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div className="section-header" style={{ flexShrink: 0 }}>
        <div>
          <h2 className="section-title">Certificates Vault</h2>
          <p className="section-desc">View and download your earned training achievements and quiz completions.</p>
        </div>
      </div>

      {/* Grid of Certificates */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {certificates.map((cert) => (
            <div key={cert.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', minHeight: '200px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--success-glow, rgba(16, 185, 129, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success, #10b981)' }}>
                    <Award size={24} />
                  </div>
                  <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={12} /> Verified
                  </span>
                </div>
                
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Certificate of Completion</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Assigned Project: <strong style={{ color: 'var(--text-primary)' }}>{cert.Project?.name}</strong>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Calendar size={14} /> Earned on {cert.issueDate}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCert(cert)} style={{ flex: 1, justifyContent: 'center' }}>
                  Preview
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleDownloadPDF(cert)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>

        {certificates.length === 0 && (
          <div className="glass-card" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Award size={64} style={{ opacity: 0.15, margin: '0 auto 16px auto', display: 'block' }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 500, margin: '0 0 8px 0' }}>No Certificates Earned Yet</p>
            <p style={{ fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto' }}>
              Complete all lessons assigned to your project inside the Trainings tab to earn your certification.
            </p>
          </div>
        )}
      </div>

      {/* Certificate Preview Modal */}
      {selectedCert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '850px', width: '95%' }}>
            
            {/* Close Button Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedCert(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* High Fidelity Certificate Template Card */}
            <div id="certificate-download-node" className="certificate-print-area" style={{
              background: '#FFFFFF',
              border: 'none',
              padding: '24px',
              color: '#1F2328',
              boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
              borderRadius: '2px',
              fontFamily: '"Montserrat", sans-serif',
              position: 'relative',
              textAlign: 'center',
              overflow: 'hidden',
              minHeight: '600px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Corporate Brand Swooshes (Idonneous Red & Charcoal) */}
              <div style={{ position: 'absolute', top: '-150px', right: '-150px', width: '350px', height: '350px', background: 'radial-gradient(circle, #D71920 40%, #1F2328 41%, #1F2328 50%, transparent 51%)', borderRadius: '50%', opacity: 0.9 }}></div>
              <div style={{ position: 'absolute', bottom: '-150px', left: '-150px', width: '350px', height: '350px', background: 'radial-gradient(circle, #D71920 40%, #1F2328 41%, #1F2328 50%, transparent 51%)', borderRadius: '50%', opacity: 0.9 }}></div>

              {/* Inner Decorative Border */}
              <div style={{
                border: '2px solid #1F2328',
                outline: '1px solid #D71920',
                outlineOffset: '-6px',
                padding: '40px 24px',
                flex: 1,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                background: 'rgba(255,255,255,0.95)'
              }}>
                {/* Brand Corners */}
                <div style={{ position: 'absolute', top: -1, left: -1, width: 30, height: 30, borderTop: '4px solid #D71920', borderLeft: '4px solid #D71920' }}></div>
                <div style={{ position: 'absolute', top: -1, right: -1, width: 30, height: 30, borderTop: '4px solid #D71920', borderRight: '4px solid #D71920' }}></div>
                <div style={{ position: 'absolute', bottom: -1, left: -1, width: 30, height: 30, borderBottom: '4px solid #D71920', borderLeft: '4px solid #D71920' }}></div>
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 30, height: 30, borderBottom: '4px solid #D71920', borderRight: '4px solid #D71920' }}></div>

                {/* Seal on Top Left */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', width: '90px', height: '90px', background: '#D71920', borderRadius: '50%', border: '4px solid #FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 4px 10px rgba(215, 25, 32, 0.3)' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', lineHeight: '1.2' }}>OFFICIAL<br/>CERT</span>
                  {/* Ribbon tails */}
                  <div style={{ position: 'absolute', bottom: '-20px', left: '10px', width: '20px', height: '30px', background: '#1F2328', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)', zIndex: -1 }}></div>
                  <div style={{ position: 'absolute', bottom: '-20px', right: '10px', width: '20px', height: '30px', background: '#1F2328', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)', zIndex: -1 }}></div>
                </div>

                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                  <img src="/logo.png" alt="Idonneous Logo" style={{ height: '36px' }} />
                  <div style={{ letterSpacing: '3px', fontSize: '1rem', fontWeight: 800, color: '#1F2328', textTransform: 'uppercase' }}>
                    RetailEdge Pro
                  </div>
                </div>

                <h1 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0 0 4px 0', color: '#D71920', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  CERTIFICATE
                </h1>
                <div style={{ fontSize: '1.4rem', letterSpacing: '4px', color: '#1F2328', marginBottom: '40px', fontWeight: 700 }}>
                  OF COMPLETION
                </div>

                <p style={{ fontSize: '1rem', color: '#5F6875', margin: '0 0 24px 0', fontWeight: 500 }}>
                  This certificate is proudly presented to
                </p>

                <h2 style={{ fontFamily: '"Sacramento", cursive', fontSize: '4.5rem', fontWeight: 'bold', margin: '0 0 16px 0', color: '#1F2328', borderBottom: '2px solid #D71920', paddingBottom: '8px', minWidth: '500px', display: 'inline-block' }}>
                  {selectedCert.User?.name}
                </h2>

                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#5F6875', maxWidth: '650px', margin: '16px auto 50px auto' }}>
                  For successfully completing the rigorous program requirements, live interactive training sessions, and achieving superior performance benchmarks in:
                  <br />
                  <strong style={{ fontSize: '1.25rem', color: '#D71920', display: 'block', marginTop: '12px', fontWeight: 800 }}>
                    {selectedCert.Project?.name}
                  </strong>
                </p>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', padding: '0 50px', marginTop: 'auto' }}>
                  
                  {/* Left Signature */}
                  <div style={{ textAlign: 'center', minWidth: '200px' }}>
                    <div style={{ fontFamily: '"Sacramento", cursive', fontSize: '2.5rem', color: '#1F2328', fontWeight: 'bold', marginBottom: '8px' }}>Mohit Tiku</div>
                    <div style={{ height: '2px', background: '#D71920', margin: '4px 0' }}></div>
                    <div style={{ fontSize: '0.85rem', color: '#5F6875', fontWeight: 600 }}>Managing Director<br/>RetailEdge Pro</div>
                  </div>

                  {/* Center Flourish */}
                  <div style={{ color: '#D71920', fontSize: '1.5rem', paddingBottom: '20px' }}>
                    ♦
                  </div>

                  {/* Right Signature / Date */}
                  <div style={{ textAlign: 'center', minWidth: '200px' }}>
                    <div style={{ fontSize: '1.2rem', color: '#1F2328', paddingBottom: '6px', marginBottom: '8px', paddingTop: '10px', fontWeight: 700 }}>{selectedCert.issueDate}</div>
                    <div style={{ height: '2px', background: '#D71920', margin: '4px 0' }}></div>
                    <div style={{ fontSize: '0.85rem', color: '#5F6875', fontWeight: 600 }}>Date of Issue<br/>Verified Credential</div>
                  </div>

                </div>

              </div>
            </div>

            {/* Action Panel */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', background: 'rgba(255,255,255,0.1)' }}>
                <Printer size={16} /> Print Certificate
              </button>
              <button className="btn btn-primary" onClick={() => handleDownloadPDF(selectedCert)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} /> Download PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
