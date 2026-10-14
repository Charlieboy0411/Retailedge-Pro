import React from 'react';

/**
 * RetailEdge PRO Enterprise StatusBadge
 * Soft semantic badges for status indications without harsh heavy blocks
 */
export default function StatusBadge({
  status = 'neutral', // 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral'
  label,
  dot = false,
  size = 'md', // 'sm' | 'md'
  className = ''
}) {
  // Normalize status string if e.g. "Active", "Completed", "Pending", "Finished", etc. are passed
  const getNormalizedVariant = (val) => {
    if (!val) return 'neutral';
    const s = String(val).toLowerCase();
    if (s.includes('active') || s.includes('complete') || s.includes('pass') || s.includes('issued') || s.includes('success') || s.includes('on track')) {
      return 'success';
    }
    if (s.includes('warn') || s.includes('review') || s.includes('pending') || s.includes('in progress')) {
      return 'warning';
    }
    if (s.includes('danger') || s.includes('risk') || s.includes('fail') || s.includes('critical') || s.includes('revoked') || s.includes('error')) {
      return 'danger';
    }
    if (s.includes('cert') || s.includes('eligible') || s.includes('special')) {
      return 'purple';
    }
    if (s.includes('info') || s.includes('live') || s.includes('scheduled')) {
      return 'info';
    }
    return 'neutral';
  };

  const variant = ['success', 'warning', 'danger', 'info', 'purple', 'neutral'].includes(status)
    ? status
    : getNormalizedVariant(status);

  const displayLabel = label !== undefined ? label : status;

  return (
    <span className={`re-badge re-badge-${variant} re-badge-${size} ${className}`}>
      {dot && <span className={`re-badge-dot re-badge-dot-${variant}`} />}
      <span className="re-badge-text">{displayLabel}</span>
    </span>
  );
}
