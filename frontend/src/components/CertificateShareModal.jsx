import React, { useState } from 'react';
import { X, Copy, Check, Share2, Mail, Download, ExternalLink, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { copyTextToClipboard } from '../utils/clipboard';

export default function CertificateShareModal({ isOpen, onClose, certificate, token }) {
  if (!isOpen || !certificate) return null;

  const [copied, setCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(null);

  const certId = certificate.certificate_id || certificate.id;
  const verificationUrl = `${window.location.origin}/verify/${certId}`;
  const participantName = certificate.User?.name || 'Participant';
  const programName = certificate.Training?.title || certificate.Project?.name || 'Training Program';

  const handleCopyLink = async () => {
    const success = await copyTextToClipboard(verificationUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎓 *Official Training Certification Conferred*\n\n` +
      `I have successfully completed the *${programName}* on RetailEdge Pro!\n\n` +
      `● *Certificate ID:* ${certId}\n` +
      `● *Recipient:* ${participantName}\n` +
      `● *Verify Credential:* ${verificationUrl}\n\n` +
      `_Issued by Idonneous Marketing Services Pvt. Ltd._`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSendEmail = async () => {
    setEmailSending(true);
    setEmailSuccess(null);
    try {
      await axios.post(`/api/certificates/${certificate.id}/email`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmailSuccess(`Certificate PDF successfully emailed to ${certificate.User?.email || 'participant'}`);
    } catch (err) {
      console.error('Email error:', err);
      setEmailSuccess('Failed to dispatch email. Please check network/SMTP configuration.');
    } finally {
      setEmailSending(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const downloadUrl = `/api/certificates/${certificate.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await axios.get(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Certificate_${(participantName || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}_${certId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.warn('Blob download fallback to direct URL:', err);
      window.open(`/api/certificates/${certificate.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`, '_blank');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,18,32,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', width: '92%', maxWidth: '540px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
              Share & Deliver Certificate
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
              {participantName} • {certId}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Public Verification Link */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Public Verification Link
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                readOnly 
                value={verificationUrl}
                style={{ flex: 1, padding: '10px 14px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.82rem', color: '#0F172A', fontWeight: 600 }}
              />
              <button 
                onClick={handleCopyLink}
                style={{ padding: '0 16px', background: copied ? '#10B981' : '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Share Channels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            
            {/* WhatsApp */}
            <button 
              onClick={handleWhatsAppShare}
              style={{ padding: '14px', background: 'rgba(37,211,102,0.1)', border: '1.5px solid #25D366', borderRadius: '10px', color: '#075E54', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <MessageCircle size={18} color="#25D366" /> Share on WhatsApp
            </button>

            {/* Email Dispatch */}
            <button 
              onClick={handleSendEmail}
              disabled={emailSending}
              style={{ padding: '14px', background: 'rgba(37,99,235,0.08)', border: '1.5px solid #2563EB', borderRadius: '10px', color: '#1D4ED8', fontWeight: 700, fontSize: '0.84rem', cursor: emailSending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Mail size={18} color="#2563EB" /> {emailSending ? 'Sending...' : 'Email PDF to Recipient'}
            </button>

          </div>

          {emailSuccess && (
            <div style={{ background: emailSuccess.includes('successfully') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${emailSuccess.includes('successfully') ? '#10B981' : '#EF4444'}`, padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', color: emailSuccess.includes('successfully') ? '#065F46' : '#991B1B', fontWeight: 600 }}>
              {emailSuccess}
            </div>
          )}

          {/* High-res Download option */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Print-Ready A4 PDF</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>High-resolution vector rendering with QR code</div>
            </div>
            <button 
              onClick={handleDownloadPdf}
              style={{ padding: '8px 16px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} /> Download PDF
            </button>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 20px', background: '#E2E8F0', color: '#0F172A', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
