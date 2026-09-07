import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldCheck, ShieldAlert, ShieldX, Search, CheckCircle2, 
  Calendar, Award, Building, User, FileText, ArrowLeft, 
  Download, Printer, Share2, ExternalLink, QrCode, Camera,
  Upload, X, RefreshCw, Check, AlertTriangle, Eye
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';

// Helper to extract clean certificate ID from raw strings or full URLs
export function extractCleanCertId(input) {
  if (!input) return '';
  let str = String(input).trim();
  if (str.includes('/verify/')) {
    str = str.split('/verify/').pop().split('?')[0].split('#')[0];
  } else if (str.includes('/')) {
    str = str.split('/').pop().split('?')[0].split('#')[0];
  }
  return decodeURIComponent(str).trim().toUpperCase();
}

export default function PublicCertificateVerification() {
  const { certificateId: paramCertId } = useParams();
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState(paramCertId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // QR Scanner Modal State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (paramCertId) {
      const clean = extractCleanCertId(paramCertId);
      setSearchId(clean);
      performVerification(clean);
    }
  }, [paramCertId]);

  const performVerification = async (rawIdToVerify) => {
    const cleanId = extractCleanCertId(rawIdToVerify);
    if (!cleanId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/certificates/verify/${encodeURIComponent(cleanId)}`);
      setResult(res.data);
    } catch (err) {
      console.error('Verification query failed:', err);
      setError('Verification service temporarily unavailable. Please verify network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = extractCleanCertId(searchId);
    if (clean) {
      navigate(`/verify/${clean}`);
      performVerification(clean);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchId(val);
    // If user or barcode scanner pastes a full URL, auto-extract and verify immediately
    if (val.includes('/verify/') || val.startsWith('http://') || val.startsWith('https://')) {
      const clean = extractCleanCertId(val);
      if (clean) {
        setSearchId(clean);
        navigate(`/verify/${clean}`);
        performVerification(clean);
      }
    }
  };

  // ─── CAMERA QR SCANNER ──────────────────────────────────────────────
  const startCameraScanner = async () => {
    setIsCameraScannerOpen(true);
    setCameraError(null);
    setIsCameraScanning(true);

    // Short timeout to ensure the DOM element #qr-reader is mounted
    setTimeout(async () => {
      try {
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            // ignore
          }
        }

        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        const config = { fps: 15, qrbox: { width: 250, height: 250 } };
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // Successful QR code scan
            handleQrCodeScanned(decodedText);
          },
          (errorMessage) => {
            // scan failure callback (can be ignored as it fires continuously while looking for QR)
          }
        );
      } catch (err) {
        console.error('Camera start error:', err);
        setCameraError(err.message || 'Unable to access camera. Please check camera permissions or try file upload.');
        setIsCameraScanning(false);
      }
    }, 250);
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsCameraScanning(false);
    setIsCameraScannerOpen(false);
  };

  const handleQrCodeScanned = (scannedText) => {
    stopCameraScanner();
    const cleanId = extractCleanCertId(scannedText);
    if (cleanId) {
      setSearchId(cleanId);
      navigate(`/verify/${cleanId}`);
      performVerification(cleanId);
    }
  };

  // ─── IMAGE FILE QR DECODER ─────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Try with html5-qrcode file scanner
      const html5QrCode = new Html5Qrcode('qr-reader-hidden');
      const decodedResult = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      if (decodedResult) {
        handleQrCodeScanned(decodedResult);
        return;
      }
    } catch (err) {
      console.log('html5-qrcode scanFile fallback to jsQR:', err);
    }

    // 2. Fallback to jsQR canvas decoder
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleQrCodeScanned(code.data);
          } else {
            setError('Could not detect a valid QR code in the uploaded image. Please ensure the QR code is clearly visible or enter the Certificate ID manually.');
            setLoading(false);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File scan error:', err);
      setError('Failed to process image file. Please enter the Certificate ID manually.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #081226 0%, #0F172A 40%, #1E293B 100%)', color: '#F8FAFC', fontFamily: "'Inter', -apple-system, sans-serif", padding: '32px 16px' }}>
      
      {/* Hidden container for QR file decoder */}
      <div id="qr-reader-hidden" style={{ display: 'none' }}></div>

      {/* Top Brand Bar */}
      <div style={{ maxWidth: '880px', margin: '0 auto 32px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #00D2FF 0%, #0072FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#FFFFFF', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,114,255,0.3)' }}>
            R
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.5px' }}>
              RETAIL<span style={{ color: '#00D2FF' }}>EDGE</span> PRO
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600 }}>by Idonneous Marketing Services Pvt. Ltd.</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/certificates" style={{ color: '#00D2FF', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,210,255,0.08)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0,210,255,0.2)' }}>
            <Award size={14} /> Certificate Ledger
          </Link>
          <Link to="/login" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back to LMS
          </Link>
        </div>
      </div>

      {/* Main Verification Card */}
      <div style={{ maxWidth: '880px', margin: '0 auto', background: '#0F1A30', border: '1.5px solid #1E293B', borderRadius: '18px', padding: '36px 32px', boxShadow: '0 25px 50px rgba(0,0,0,0.45)' }}>
        
        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.3)', padding: '6px 16px', borderRadius: '20px', color: '#00D2FF', fontSize: '0.78rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '0.5px' }}>
            <ShieldCheck size={15} /> OFFICIAL CREDENTIAL VERIFICATION PORTAL
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Verify RetailEdge Pro Certificate
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: 0, maxWidth: '600px', margin: '0 auto' }}>
            Scan the QR code printed on the certificate or enter the unique Certificate ID below to validate authenticity.
          </p>
        </div>

        {/* Verification Input & Live Scan Actions */}
        <div style={{ maxWidth: '680px', margin: '0 auto 32px auto' }}>
          
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text"
                value={searchId}
                onChange={handleInputChange}
                placeholder="Paste Certificate ID or Scan QR Code (e.g. RETP-2025-05-000245)"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  background: '#081226',
                  border: '1.5px solid #334155',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !searchId.trim()}
              style={{
                padding: '0 22px',
                background: 'linear-gradient(135deg, #00D2FF 0%, #0072FF 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: loading || !searchId.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,114,255,0.35)',
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? <RefreshCw size={16} className="spin-animate" /> : <ShieldCheck size={16} />}
              {loading ? 'Verifying...' : 'VERIFY'}
            </button>
          </form>

          {/* Quick Scanner Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={startCameraScanner}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'rgba(0,210,255,0.08)',
                border: '1.5px solid rgba(0,210,255,0.3)',
                borderRadius: '8px',
                color: '#00D2FF',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Camera size={16} /> Scan with Camera / Webcam
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1.5px solid #334155',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={16} /> Upload QR / Certificate Image
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*,.pdf" 
              style={{ display: 'none' }} 
            />
          </div>

        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#00D2FF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#00D2FF' }}>Validating digital signature & security hash...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #EF4444', padding: '14px 18px', borderRadius: '10px', color: '#FCA5A5', fontSize: '0.88rem', textAlign: 'center', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#EF4444" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Result Area */}
        {result && !loading && (
          <div>
            
            {/* 🟢 STATUS: VALID / VERIFIED */}
            {(result.status === 'VALID' || result.status === 'ISSUED') && (
              <div style={{ background: '#081226', border: '2px solid #10B981', borderRadius: '16px', padding: '30px', position: 'relative', overflow: 'hidden', boxShadow: '0 0 30px rgba(16,185,129,0.15)' }}>
                
                {/* Top Status Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '18px', marginBottom: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(16,185,129,0.4)' }}>
                      <CheckCircle2 size={28} color="#10B981" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10B981', margin: 0, letterSpacing: '-0.3px' }}>
                        Official Certificate Verified ✓
                      </h2>
                      <p style={{ margin: '2px 0 0 0', color: '#94A3B8', fontSize: '0.8rem' }}>
                        Authentic credential issued by Idonneous Marketing Services Pvt. Ltd.
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', fontWeight: 700 }}>CERTIFICATE ID</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#00D2FF', letterSpacing: '1px' }}>
                      {result.certificate_id}
                    </span>
                  </div>
                </div>

                {/* Recipient Highlight */}
                <div style={{ background: '#0F1A30', border: '1.5px solid #1E293B', borderRadius: '12px', padding: '22px', marginBottom: '22px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>CONFERRED RECIPIENT</span>
                  <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', margin: '6px 0 0 0', letterSpacing: '0.5px' }}>
                    {result.participantName}
                  </h3>
                  {result.employeeId && (
                    <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                      Employee ID: {result.employeeId}
                    </span>
                  )}
                </div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  
                  <div style={{ background: '#0F1A30', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                      <Award size={14} color="#00D2FF" /> Training Program
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{result.programName}</div>
                  </div>

                  <div style={{ background: '#0F1A30', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                      <Building size={14} color="#3B82F6" /> Client & Project
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{result.clientName} ({result.projectName})</div>
                  </div>

                  <div style={{ background: '#0F1A30', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                      <User size={14} color="#10B981" /> Certified Trainer
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{result.trainerName}</div>
                  </div>

                  <div style={{ background: '#0F1A30', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                      <Calendar size={14} color="#F59E0B" /> Issue Date
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {result.issueDate ? new Date(result.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Valid'}
                    </div>
                  </div>

                </div>

                {/* Score and Attendance Badges if available */}
                {(result.score || result.attendance) && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '22px' }}>
                    {result.score && (
                      <div style={{ background: 'rgba(0,210,255,0.12)', border: '1.5px solid #00D2FF', padding: '6px 16px', borderRadius: '20px', fontSize: '0.82rem', color: '#00D2FF', fontWeight: 800 }}>
                        Score: {result.score} (Excellent)
                      </div>
                    )}
                    {result.attendance && (
                      <div style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid #10B981', padding: '6px 16px', borderRadius: '20px', fontSize: '0.82rem', color: '#34D399', fontWeight: 800 }}>
                        Attendance: {result.attendance}
                      </div>
                    )}
                  </div>
                )}

                {/* Signatures & Official Company Seal Stamp */}
                <div style={{ borderTop: '1px solid #1E293B', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                  
                  {/* Authorized Signatory */}
                  <div style={{ textAlign: 'center', width: '180px' }}>
                    <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={result.authorizedSignatureUrl || '/assets/signatures/amit_kumar_signature.svg'} 
                        alt="Authorized Signatory" 
                        style={{ maxHeight: '36px', maxWidth: '150px', objectFit: 'contain', filter: 'invert(1) brightness(1.5)' }} 
                        onError={e => { e.target.src = '/assets/signatures/mohit_tiku_signature.svg'; }}
                      />
                    </div>
                    <div style={{ borderTop: '1px solid #334155', margin: '4px 0 2px 0' }}></div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>{result.signatoryName || 'Amit Kumar'}</div>
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{result.signatoryDesignation || 'Program Manager'}</div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B' }}>Idonneous Marketing Services</div>
                  </div>

                  {/* 3D Company Seal */}
                  {result.includeCompanySeal !== false && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '68px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={result.companySealUrl || '/assets/seals/retailedge_pro_gold_seal.svg'} 
                          alt="Official Company Seal" 
                          style={{ width: '66px', height: '66px', objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(0,210,255,0.5))' }} 
                          onError={e => { e.target.src = '/assets/seals/idonneous_official_seal.svg'; }}
                        />
                      </div>
                      <span style={{ fontSize: '0.64rem', color: '#00D2FF', marginTop: '2px', fontWeight: 800, letterSpacing: '0.5px' }}>OFFICIAL VERIFIED SEAL</span>
                    </div>
                  )}

                  {/* Trainer Signature (if present) */}
                  {result.includeTrainerSignature !== false && result.trainerName && (
                    <div style={{ textAlign: 'center', width: '180px' }}>
                      <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={result.trainerSignatureUrl || '/assets/signatures/aakash_verma_signature.svg'} 
                          alt="Trainer Signature" 
                          style={{ maxHeight: '36px', maxWidth: '150px', objectFit: 'contain', filter: 'invert(1) brightness(1.5)' }} 
                        />
                      </div>
                      <div style={{ borderTop: '1px solid #334155', margin: '4px 0 2px 0' }}></div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>{result.trainerName}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Certified Lead Trainer</div>
                    </div>
                  )}

                </div>

                {/* Footer Security Bar */}
                <div style={{ borderTop: '1px solid #1E293B', marginTop: '22px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    Issuing Authority: <strong style={{ color: '#E2E8F0' }}>Idonneous Marketing Services Pvt. Ltd.</strong> • <span style={{ color: '#10B981', fontWeight: 800 }}>Immutable Credential V{result.templateVersion || '1.0'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => window.open(`/api/certificates/${result.id || result.certificate_id}/download`, '_blank')}
                      style={{ background: 'linear-gradient(135deg, #00D2FF 0%, #0072FF 100%)', border: 'none', color: '#FFFFFF', padding: '7px 16px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(0,114,255,0.3)' }}
                    >
                      <Download size={14} /> Download Official PDF
                    </button>
                    <button 
                      onClick={() => window.print()}
                      style={{ background: '#1E293B', border: '1px solid #334155', color: '#F8FAFC', padding: '7px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Printer size={13} /> Print Verification
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* 🔴 STATUS: REVOKED */}
            {result.status === 'REVOKED' && (
              <div style={{ background: '#081226', border: '2px solid #EF4444', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 0 30px rgba(239,68,68,0.15)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '2px solid #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <ShieldX size={30} color="#EF4444" />
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#EF4444', margin: '0 0 6px 0' }}>
                  Certificate Revoked
                </h2>
                <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '540px', margin: '0 auto 20px auto' }}>
                  This certificate ({result.certificate_id}) has been formally revoked and is no longer valid.
                </p>

                <div style={{ background: '#0F1A30', border: '1px solid #1E293B', borderRadius: '10px', padding: '16px', maxWidth: '480px', margin: '0 auto', textAlign: 'left' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', fontWeight: 700 }}>OFFICIAL REVOCATION REASON:</span>
                    <strong style={{ fontSize: '0.92rem', color: '#EF4444' }}>{result.revocationReason || 'Administrative requirement'}</strong>
                  </div>
                  {result.revokedAt && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', fontWeight: 700 }}>REVOCATION DATE:</span>
                      <span style={{ fontSize: '0.85rem', color: '#FFFFFF' }}>{new Date(result.revokedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🟠 STATUS: EXPIRED */}
            {result.status === 'EXPIRED' && (
              <div style={{ background: '#081226', border: '2px solid #F59E0B', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 0 30px rgba(245,158,11,0.15)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '2px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <ShieldAlert size={30} color="#F59E0B" />
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#F59E0B', margin: '0 0 6px 0' }}>
                  Certificate Expired
                </h2>
                <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '540px', margin: '0 auto 20px auto' }}>
                  This certificate was validly issued on {result.issueDate} but has exceeded its designated validity period ({result.expiryDate}).
                </p>
              </div>
            )}

            {/* ⚫ STATUS: NOT FOUND */}
            {result.status === 'NOT_FOUND' && (
              <div style={{ background: '#081226', border: '1.5px solid #334155', borderRadius: '16px', padding: '36px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(148,163,184,0.1)', border: '2px solid #64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <Search size={26} color="#94A3B8" />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px 0' }}>
                  Certificate Not Found
                </h2>
                <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
                  We could not locate a verified certificate record for ID <strong>"{searchId}"</strong>. Please double-check the ID format and try again.
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ─── MODAL: CAMERA QR SCANNER MODAL ─── */}
      {isCameraScannerOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(8,18,38,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ background: '#0F1A30', border: '1.5px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} color="#00D2FF" />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>Scan Certificate QR Code</span>
              </div>
              <button 
                onClick={stopCameraScanner}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {cameraError ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#EF4444' }}>
                  <AlertTriangle size={32} style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ fontSize: '0.88rem', margin: 0 }}>{cameraError}</p>
                  <button
                    onClick={startCameraScanner}
                    style={{ marginTop: '16px', background: '#0072FF', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '320px', borderRadius: '12px', overflow: 'hidden', background: '#000000', border: '2px solid #00D2FF' }}>
                    <div id="qr-reader" style={{ width: '100%' }}></div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '16px', textAlign: 'center', margin: '14px 0 0 0' }}>
                    Point your camera at the QR code on the certificate. Detection is automatic.
                  </p>
                </>
              )}

            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'flex-end', background: '#081226' }}>
              <button
                onClick={stopCameraScanner}
                style={{ background: '#1E293B', border: '1px solid #334155', color: '#F8FAFC', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
