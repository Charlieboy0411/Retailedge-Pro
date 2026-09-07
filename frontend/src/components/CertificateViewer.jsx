import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  X, Download, Printer, ExternalLink, ShieldCheck, ShieldAlert, 
  Award, QrCode, AlertCircle, CheckCircle2, FileText, User, 
  Calendar, Clock, Check, Eye
} from 'lucide-react';

export default function CertificateViewer({
  isOpen,
  onClose,
  certificateId,
  token,
  initialData = null
}) {
  const [certData, setCertData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    if (isOpen && certificateId) {
      fetchCertificate();
    } else if (!isOpen) {
      setCertData(null);
      setError('');
    }
  }, [isOpen, certificateId]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      setError('');
      const authToken = token || localStorage.getItem('jwt') || localStorage.getItem('token');
      const res = await axios.get(`/api/certificates/${encodeURIComponent(certificateId)}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      // Handle response structure { certificate: ..., auditLogs: ... } or direct object
      const data = res.data?.certificate || res.data;
      setCertData(data);
    } catch (err) {
      console.error('Failed to load certificate details:', err);
      if (err.response?.status === 403) {
        setError('Forbidden: You do not have permission to view this certificate.');
      } else if (err.response?.status === 404) {
        setError('The certificate document could not be loaded. Please try again or contact the administrator.');
      } else {
        setError(err.response?.data?.error || 'Failed to load certificate.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!certData) return;
    try {
      setDownloading(true);
      const authToken = token || localStorage.getItem('jwt') || localStorage.getItem('token');
      const targetId = certData.id || certData.certificate_id;
      
      const response = await axios.get(`/api/certificates/${encodeURIComponent(targetId)}/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (certData.User?.name || certData.recipientName || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `Certificate_${safeName}_${certData.certificate_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      if (err.response?.status === 403) {
        alert('Forbidden: You do not have permission to download this certificate.');
      } else {
        alert('Failed to download certificate PDF. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenVerification = () => {
    if (!certData?.certificate_id) return;
    window.open(`/verify/${encodeURIComponent(certData.certificate_id)}`, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  const isRevoked = certData?.status === 'REVOKED' || certData?.status === 'Revoked';
  const statusColor = isRevoked ? '#EF4444' : '#10B981';
  const statusText = isRevoked ? 'REVOKED' : (certData?.status || 'ISSUED');

  // Seal position parser
  const getSealPlacementStyle = (pos) => {
    if (!pos) return { position: 'absolute', top: '6%', right: '16%', width: '82px', height: '82px' };
    if (typeof pos === 'string') {
      if (pos === 'top-right') return { position: 'absolute', top: '6%', right: '16%', width: '82px', height: '82px' };
      if (pos === 'bottom-right') return { position: 'absolute', bottom: '12%', right: '16%', width: '82px', height: '82px' };
      if (pos === 'bottom-left') return { position: 'absolute', bottom: '12%', left: '8%', width: '82px', height: '82px' };
      if (pos === 'top-left') return { position: 'absolute', top: '6%', left: '8%', width: '82px', height: '82px' };
    }
    const x = pos.x !== undefined ? pos.x : 84;
    const y = pos.y !== undefined ? pos.y : 6;
    const scale = (pos.scale || 100) / 100;
    const baseW = 82 * scale;
    const baseH = 82 * scale;
    return {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: `${baseW}px`,
      height: `${baseH}px`,
      transform: 'translate(-50%, -50%)',
      zIndex: 10
    };
  };

  const participantName = certData?.User?.name || certData?.recipientName || certData?.participantName || 'Verified Learner';
  const employeeId = certData?.User?.employee_id || certData?.employeeId || 'N/A';
  const programTitle = certData?.Training?.title || certData?.program || certData?.Project?.name || 'Retail Excellence Certification';
  const projectName = certData?.Project?.name || certData?.projectName || 'Enterprise Retail Program';
  const trainerName = certData?.trainerName || certData?.Trainer?.name || 'Aakash Verma';
  const signatoryName = certData?.signatoryName || certData?.certificateSnapshot?.authorizedSignatory?.name || 'Mohit Tiku';
  const signatoryDesignation = certData?.signatoryDesignation || certData?.certificateSnapshot?.authorizedSignatory?.designation || 'Managing Director';
  const sealUrl = certData?.companySealUrl || certData?.certificateSnapshot?.companySeal?.asset || '/assets/seals/retailedge_pro_gold_seal.svg';
  const authSigUrl = certData?.authorizedSignatureUrl || certData?.certificateSnapshot?.authorizedSignatory?.signatureAsset || '/assets/signatures/amit_kumar_signature.svg';
  const issueDateStr = certData?.issueDate 
    ? new Date(certData.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recent';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        color: '#0F172A',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1080px',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: isRevoked ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: statusColor
            }}>
              {isRevoked ? <ShieldAlert size={22} /> : <Award size={22} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Certificate Viewer: {certData?.certificate_id || certificateId}
                </h3>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: `${statusColor}18`,
                  color: statusColor,
                  border: `1px solid ${statusColor}33`
                }}>
                  {statusText}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                {participantName} • {projectName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading || !certData}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: (downloading || !certData) ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Download size={14} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>

            <button
              onClick={handlePrint}
              disabled={!certData}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                color: '#334155',
                border: '1px solid #CBD5E1',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: !certData ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={14} />
              Print
            </button>

            <button
              onClick={handleOpenVerification}
              disabled={!certData}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#F1F5F9',
                color: '#0284C7',
                border: '1px solid #CBD5E1',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: !certData ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ExternalLink size={14} />
              Verify
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748B' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: '3px solid #0284C7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
              Loading verified certificate canvas...
            </div>
          ) : error ? (
            <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>Certificate Unavailable</div>
              <div style={{ fontSize: '0.88rem' }}>{error}</div>
            </div>
          ) : certData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '20px', alignItems: 'start' }}>
              
              {/* ─── LEFT: EXACT HIGH-FIDELITY CERTIFICATE CANVAS ─── */}
              <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                
                {/* Revocation Warning Alert if revoked */}
                {isRevoked && (
                  <div style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#FEF2F2',
                    border: '1.5px solid #EF4444',
                    color: '#991B1B',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldAlert size={20} color="#EF4444" />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>CERTIFICATE REVOKED</div>
                        <div style={{ fontSize: '0.75rem', color: '#B91C1C' }}>
                          Reason: {certData.revocationReason || 'Administrative revocation'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#EF4444', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>
                      INVALID
                    </span>
                  </div>
                )}

                {/* Outer Certificate Frame */}
                <div style={{
                  width: '100%',
                  aspectRatio: '1.414 / 1',
                  background: '#081226',
                  padding: '10px',
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)'
                }}>
                  {/* Inner White Canvas with Gold Border */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1.5px solid #C5A059',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    
                    {/* Top-Right Polygon Geometry */}
                    <svg viewBox="0 0 300 300" style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', pointerEvents: 'none', zIndex: 1 }} fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M 80 0 L 300 0 L 300 220 Z" fill="#0B1A38" opacity="0.95"/>
                      <path d="M 140 0 L 300 0 L 300 160 Z" fill="#142C54" opacity="0.85"/>
                      <path d="M 200 0 L 300 0 L 300 100 Z" fill="#1E3A8A" opacity="0.75"/>
                      <line x1="80" y1="0" x2="300" y2="220" stroke="#C5A059" strokeWidth="2"/>
                    </svg>

                    {/* Official Company Seal Medallion */}
                    {certData.includeCompanySeal !== false && (
                      <div style={{
                        ...getSealPlacementStyle(certData.sealPosition || certData.certificateSnapshot?.companySeal?.position),
                        zIndex: 5
                      }}>
                        <img 
                          src={sealUrl} 
                          alt="Gold Seal Medallion" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={e => { e.target.src = '/assets/seals/retailedge_pro_gold_seal.svg'; }}
                        />
                      </div>
                    )}

                    {/* REVOKED Watermark Overlay (Displayed visibly without altering original text) */}
                    {isRevoked && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        background: 'rgba(239, 68, 68, 0.08)'
                      }}>
                        <div style={{
                          transform: 'rotate(-25deg)',
                          border: '6px solid #EF4444',
                          padding: '12px 36px',
                          color: '#EF4444',
                          fontSize: '2.4rem',
                          fontWeight: 900,
                          letterSpacing: '8px',
                          textTransform: 'uppercase',
                          background: 'rgba(255, 255, 255, 0.92)',
                          boxShadow: '0 8px 30px rgba(239, 68, 68, 0.35)',
                          borderRadius: '8px'
                        }}>
                          REVOKED
                        </div>
                      </div>
                    )}

                    {/* Canvas Body Content */}
                    <div style={{ padding: '16px 22px 6px 22px', position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      
                      {/* Top Bar: Brand & Certificate ID */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg, #00D2FF 0%, #0072FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 900, fontSize: '14px' }}>
                            R
                          </div>
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#081226', lineHeight: 1.1 }}>
                              RetailEdge <span style={{ color: '#0072FF', fontWeight: 900 }}>PRO</span>
                            </div>
                            <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#64748B' }}>
                              Trainer-Led Learning & Performance Platform
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', marginRight: '100px' }}>
                          <div style={{ fontSize: '0.5rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.8px' }}>CERTIFICATE ID</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#081226', fontFamily: 'monospace' }}>{certData.certificate_id}</div>
                          <div style={{ width: '20px', height: '2px', background: '#0072FF', marginLeft: 'auto', marginTop: '2px' }}></div>
                        </div>
                      </div>

                      {/* Title Block */}
                      <div style={{ textAlign: 'center', margin: '2px 0' }}>
                        <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.5rem', fontWeight: 900, color: '#081226', letterSpacing: '2px', margin: 0, textTransform: 'uppercase' }}>
                          CERTIFICATE
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '1px 0 0 0' }}>
                          <div style={{ width: '36px', height: '1px', background: '#C5A059' }}></div>
                          <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#C5A059', letterSpacing: '2px' }}>OF COMPLETION</div>
                          <div style={{ width: '36px', height: '1px', background: '#C5A059' }}></div>
                        </div>
                      </div>

                      {/* Recipient Block */}
                      <div style={{ textAlign: 'left', marginTop: '1px' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748B', letterSpacing: '1px' }}>THIS IS TO CERTIFY THAT</div>
                        <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.1rem', color: '#081226', lineHeight: 1.1, margin: '2px 0' }}>
                          {participantName}
                        </div>
                        <div style={{ width: '280px', height: '1.5px', background: 'linear-gradient(90deg, #C5A059 0%, #E5C07B 60%, transparent 100%)', marginBottom: '4px' }}></div>
                      </div>

                      {/* Statement & Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '12px', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.35 }}>
                          <div>has successfully completed the training program</div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1D4ED8', margin: '2px 0' }}>
                            {programTitle}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: '#64748B' }}>
                            and has demonstrated the required knowledge and skills through training, assessment and evaluation.
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderLeft: '1px solid #E2E8F0', paddingLeft: '10px' }}>
                          <div>
                            <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#64748B' }}>PROGRAM</div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#081226' }}>{projectName}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#64748B' }}>COMPLETION DATE</div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#081226' }}>{issueDateStr}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.48rem', fontWeight: 800, color: '#64748B' }}>SCORE / GRADE</div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#081226' }}>
                              {certData.assessmentScore ? `${certData.assessmentScore}%` : '88%'} (Passed)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lower Signatures & QR Code */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                        <div style={{ width: '160px' }}>
                          <div style={{ height: '30px', display: 'flex', alignItems: 'center' }}>
                            <img 
                              src={authSigUrl} 
                              alt="Signature" 
                              style={{ maxHeight: '28px', maxWidth: '120px', objectFit: 'contain' }}
                              onError={e => { e.target.src = '/assets/signatures/amit_kumar_signature.svg'; }}
                            />
                          </div>
                          <div style={{ borderTop: '1px solid #081226', width: '130px', margin: '1px 0 2px 0' }}></div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#081226' }}>{signatoryName}</div>
                          <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#475569' }}>{signatoryDesignation}</div>
                          <div style={{ fontSize: '0.5rem', color: '#64748B' }}>Idonneous Marketing Services Pvt. Ltd.</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '42px', height: '42px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QrCode size={36} color="#081226" />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.52rem', fontWeight: 800, color: '#081226' }}>VERIFY CERTIFICATE</div>
                            <div style={{ fontSize: '0.46rem', color: '#64748B' }}>Scan QR or visit</div>
                            <div style={{ fontSize: '0.48rem', fontWeight: 700, color: '#0072FF' }}>retailedgepro.com/verify</div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Ribbon Footer Bar */}
                    <div style={{ width: '100%', height: '26px', background: '#081226', borderTop: '1px solid #C5A059', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px' }}>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.46rem', fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase' }}>
                        <span>👥 TRAINER CONTROLLED</span>
                        <span>▶️ LIVE TRAINING</span>
                        <span>📋 ASSESSMENTS</span>
                        <span>🎖️ CERTIFICATION</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#FFFFFF' }}>IDONNEOUS</div>
                        <div style={{ fontSize: '0.44rem', color: '#00D2FF' }}>www.idonneous.com</div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* ─── RIGHT: CERTIFICATE METADATA & AUDIT DETAILS ─── */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '18px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Certificate Details
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Certificate ID:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#0284C7' }}>{certData.certificate_id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Participant:</span>
                    <strong>{participantName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Employee ID:</span>
                    <span>{employeeId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Program:</span>
                    <span style={{ textAlign: 'right', maxWidth: '160px' }}>{programTitle}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Project:</span>
                    <strong>{projectName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Trainer:</span>
                    <span>{trainerName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Issue Date:</span>
                    <span>{issueDateStr}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Attendance %:</span>
                    <strong style={{ color: '#10B981' }}>{certData.attendancePercentage ? `${certData.attendancePercentage}%` : '95%'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Assessment Score:</span>
                    <strong style={{ color: '#8B5CF6' }}>{certData.assessmentScore ? `${certData.assessmentScore}%` : '88%'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Status:</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: `${statusColor}18`,
                      color: statusColor
                    }}>
                      {statusText}
                    </span>
                  </div>

                  {isRevoked && (
                    <div style={{ marginTop: '8px', padding: '10px', background: '#FEF2F2', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
                      <div style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 800 }}>REVOCATION RECORD</div>
                      <div style={{ fontSize: '0.75rem', color: '#B91C1C', marginTop: '2px' }}>
                        Reason: {certData.revocationReason || 'N/A'}
                      </div>
                      {certData.revokedAt && (
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                          Date: {new Date(certData.revokedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                    Verification Link:
                  </div>
                  <div style={{
                    padding: '8px',
                    background: '#FFFFFF',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.72rem',
                    color: '#0284C7',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}>
                    {window.location.origin}/verify/{certData.certificate_id}
                  </div>
                </div>

              </div>

            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#F8FAFC'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
