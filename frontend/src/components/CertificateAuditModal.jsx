import React from 'react';
import { X, ShieldCheck, Download, Mail, Share2, RefreshCw, XCircle, FileText, Clock, User } from 'lucide-react';

export default function CertificateAuditModal({ isOpen, onClose, certificate, auditLogs = [] }) {
  if (!isOpen || !certificate) return null;

  const getActionBadge = (action) => {
    switch (action) {
      case 'ISSUED':
        return { bg: 'rgba(16,185,129,0.12)', border: '#10B981', color: '#10B981', icon: <ShieldCheck size={14} /> };
      case 'VERIFIED':
        return { bg: 'rgba(6,182,212,0.12)', border: '#06B6D4', color: '#06B6D4', icon: <ShieldCheck size={14} /> };
      case 'DOWNLOADED':
        return { bg: 'rgba(37,99,235,0.12)', border: '#2563EB', color: '#2563EB', icon: <Download size={14} /> };
      case 'EMAILED':
        return { bg: 'rgba(139,92,246,0.12)', border: '#8B5CF6', color: '#8B5CF6', icon: <Mail size={14} /> };
      case 'SHARED':
        return { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', color: '#F59E0B', icon: <Share2 size={14} /> };
      case 'REISSUED':
        return { bg: 'rgba(37,99,235,0.12)', border: '#3B82F6', color: '#3B82F6', icon: <RefreshCw size={14} /> };
      case 'REVOKED':
        return { bg: 'rgba(239,68,68,0.12)', border: '#EF4444', color: '#EF4444', icon: <XCircle size={14} /> };
      default:
        return { bg: 'rgba(100,116,139,0.12)', border: '#64748B', color: '#64748B', icon: <FileText size={14} /> };
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11,18,32,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', width: '92%', maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
              Certificate Audit & Provenance Log
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
              ID: <strong style={{ color: '#2563EB' }}>{certificate.certificate_id}</strong> ({certificate.User?.name || 'Participant'})
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Timeline Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8' }}>
              <Clock size={32} style={{ margin: '0 auto 12px auto', color: '#CBD5E1' }} />
              <p style={{ fontSize: '0.88rem', margin: 0, fontWeight: 600 }}>No prior audit actions recorded for this certificate.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {/* Vertical line indicator */}
              <div style={{ position: 'absolute', left: '16px', top: '12px', bottom: '12px', width: '2px', background: '#E2E8F0', zIndex: 0 }} />

              {auditLogs.map((log, idx) => {
                const badge = getActionBadge(log.action);
                return (
                  <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: badge.bg, border: `2px solid ${badge.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: badge.color, flexShrink: 0 }}>
                      {badge.icon}
                    </div>

                    <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                          {new Date(log.createdAt || log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.84rem', color: '#1E293B', fontWeight: 600, marginBottom: '4px' }}>
                        {log.reason || 'Standard lifecycle event'}
                      </div>

                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem', color: '#64748B' }}>
                        <span>Actor: <strong>{log.performedBy || 'System'}</strong></span>
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 20px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Close Audit Log
          </button>
        </div>

      </div>
    </div>
  );
}
