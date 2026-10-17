import React from 'react';

/**
 * RetailEdge PRO Enterprise KpiCard
 * Pure presentation card with soft pastel icon containers, bold navy numbers,
 * optional subtle wave accent, and optional radial progress indicator.
 */
export default function KpiCard({
  icon: Icon,
  iconElement,
  label,
  title,
  value = 0,
  subtext,
  subtitle,
  variant = 'blue', // 'blue' | 'green' | 'purple' | 'cyan' | 'amber' | 'red' | 'pink'
  status,
  trend,
  trendDirection, // 'up' | 'down' | 'neutral'
  radialProgress, // number 0-100 or null
  waveColor, // optional hex or variant for wave accent
  loading = false,
  className = '',
  onClick
}) {
  const displayLabel = label || title;
  const displaySubtext = subtext || subtitle;
  const displayVariant = status === 'success' ? 'green' : status === 'warning' ? 'amber' : status === 'danger' ? 'red' : status === 'info' ? 'blue' : (variant || 'blue');

  if (loading) {
    return (
      <div className={`re-kpi-card re-kpi-loading ${className}`}>
        <div className="re-skeleton re-skeleton-icon" />
        <div className="re-kpi-body">
          <div className="re-skeleton re-skeleton-text" style={{ width: '60%', height: '14px' }} />
          <div className="re-skeleton re-skeleton-text" style={{ width: '40%', height: '32px', margin: '8px 0' }} />
          <div className="re-skeleton re-skeleton-text" style={{ width: '75%', height: '12px' }} />
        </div>
      </div>
    );
  }

  // Parse radial percentage if value contains '%' or radialProgress passed
  const pctValue = radialProgress !== undefined && radialProgress !== null
    ? radialProgress
    : (typeof value === 'string' && value.endsWith('%') ? parseFloat(value) : null);

  const getWaveSvgColor = () => {
    switch (displayVariant) {
      case 'green': return '#10B981';
      case 'purple': return '#8B5CF6';
      case 'cyan': return '#06B6D4';
      case 'amber': return '#F59E0B';
      case 'red': return '#EF4444';
      case 'pink': return '#EC4899';
      case 'blue':
      default: return '#2563EB';
    }
  };

  return (
    <div 
      className={`re-kpi-card re-kpi-${displayVariant} ${onClick ? 're-kpi-clickable' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="re-kpi-header">
        <div className={`re-kpi-icon-wrap re-kpi-icon-${displayVariant}`}>
          {React.isValidElement(Icon) ? Icon : Icon ? <Icon size={20} /> : iconElement}
        </div>
        <div className="re-kpi-label-group">
          <span className="re-kpi-label">{displayLabel}</span>
        </div>
      </div>

      <div className="re-kpi-main">
        <div className="re-kpi-value-block">
          <div className="re-kpi-value">{value}</div>
          {displaySubtext && <div className="re-kpi-subtext">{displaySubtext}</div>}
        </div>

        {/* Optional Radial Progress Graphic */}
        {pctValue !== null && !isNaN(pctValue) && (
          <div className="re-kpi-radial" title={`${Math.round(pctValue)}%`}>
            <svg viewBox="0 0 36 36" className="re-radial-svg">
              <path
                className="re-radial-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`re-radial-meter re-radial-meter-${displayVariant}`}
                strokeDasharray={`${Math.min(Math.max(pctValue, 0), 100)}, 100`}
                style={pctValue === 0 ? { opacity: 0 } : undefined}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Optional Trend Badge */}
      {trend && (
        <div className={`re-kpi-trend re-trend-${trendDirection || 'neutral'}`}>
          <span>{trend}</span>
        </div>
      )}

      {/* Optional Subtle Bottom Wave / Sparkline Accent */}
      {waveColor && (
        <div className="re-kpi-wave">
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="re-wave-svg">
            <path
              d="M0 35 C 50 15, 120 40, 200 10 L 200 40 L 0 40 Z"
              fill={getWaveSvgColor()}
              fillOpacity="0.12"
            />
            <path
              d="M0 35 C 50 15, 120 40, 200 10"
              stroke={getWaveSvgColor()}
              strokeWidth="2"
              strokeOpacity="0.45"
              fill="none"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
