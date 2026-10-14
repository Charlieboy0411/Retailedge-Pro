import React from 'react';

/**
 * RetailEdge PRO Enterprise LoadingSkeleton
 * Subtle skeleton animations for KPI cards, tables, and views
 */
export default function LoadingSkeleton({
  variant = 'card', // 'kpi' | 'table' | 'card' | 'banner'
  count = 1,
  rows = 5,
  cols = 4,
  className = ''
}) {
  if (variant === 'kpi') {
    return (
      <div className={`re-skeleton-kpi-grid ${className}`}>
        {Array.from({ length: count || 4 }).map((_, i) => (
          <div key={i} className="re-kpi-card re-kpi-skeleton">
            <div className="re-skeleton re-skeleton-icon" />
            <div className="re-kpi-body" style={{ width: '100%' }}>
              <div className="re-skeleton re-skeleton-text" style={{ width: '50%', height: '12px' }} />
              <div className="re-skeleton re-skeleton-text" style={{ width: '35%', height: '28px', margin: '8px 0' }} />
              <div className="re-skeleton re-skeleton-text" style={{ width: '70%', height: '11px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`re-skeleton-table-wrap ${className}`}>
        <div className="re-skeleton-table-header">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="re-skeleton re-skeleton-text" style={{ height: '14px', width: `${60 + (i % 3) * 15}%` }} />
          ))}
        </div>
        <div className="re-skeleton-table-body">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={rIdx} className="re-skeleton-table-row">
              {Array.from({ length: cols }).map((_, cIdx) => (
                <div key={cIdx} className="re-skeleton re-skeleton-text" style={{ height: '13px', width: `${40 + ((rIdx + cIdx) % 4) * 15}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`re-page-header re-skeleton-banner ${className}`}>
        <div className="re-skeleton re-skeleton-text" style={{ width: '25%', height: '14px' }} />
        <div className="re-skeleton re-skeleton-text" style={{ width: '55%', height: '32px', margin: '10px 0' }} />
        <div className="re-skeleton re-skeleton-text" style={{ width: '45%', height: '16px' }} />
      </div>
    );
  }

  // Default 'card' variant
  return (
    <div className={`re-card re-skeleton-card ${className}`}>
      <div className="re-skeleton re-skeleton-text" style={{ width: '40%', height: '18px', marginBottom: '16px' }} />
      <div className="re-skeleton re-skeleton-text" style={{ width: '100%', height: '14px', marginBottom: '8px' }} />
      <div className="re-skeleton re-skeleton-text" style={{ width: '85%', height: '14px', marginBottom: '8px' }} />
      <div className="re-skeleton re-skeleton-text" style={{ width: '60%', height: '14px' }} />
    </div>
  );
}
