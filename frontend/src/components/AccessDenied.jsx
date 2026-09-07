import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

export default function AccessDenied({ 
  title = 'Access Denied', 
  message = 'Your account does not have permission to access this resource or administrative interface.',
  returnUrl = '/dashboard',
  buttonText = 'Return to Dashboard'
}) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '65vh',
      padding: '40px 20px'
    }}>
      <div style={{
        background: 'var(--bg-glass, #FFFFFF)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '16px',
        padding: '44px 36px',
        maxWidth: '540px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px -15px rgba(239, 68, 68, 0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top subtle danger highlight bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 100%)'
        }} />

        {/* Shield Icon with glowing ring */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.2)',
          color: '#EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)'
        }}>
          <ShieldAlert size={38} />
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(239, 68, 68, 0.08)',
          color: '#DC2626',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '12px'
        }}>
          <Lock size={12} /> HTTP 403 Forbidden
        </div>

        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'var(--text-primary, #0F172A)',
          margin: '0 0 10px 0'
        }}>
          {title}
        </h2>

        <p style={{
          fontSize: '0.92rem',
          color: 'var(--text-secondary, #64748B)',
          margin: '0 0 28px 0',
          lineHeight: 1.6
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(returnUrl)}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 24px',
              fontWeight: 700,
              fontSize: '0.88rem',
              borderRadius: '10px',
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={16} /> {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
