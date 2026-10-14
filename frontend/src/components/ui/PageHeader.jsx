import React from 'react';

/**
 * RetailEdge PRO Enterprise PageHeader
 * Pure presentation component for authenticated dashboard page banners
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  badge,
  quote,
  actions,
  children
}) {
  return (
    <div className="re-page-header">
      <div className="re-page-header-content">
        <div className="re-page-header-text">
          {eyebrow && (
            <div className="re-page-header-eyebrow">
              <span className="re-eyebrow-badge">{eyebrow}</span>
              {badge && <span className="re-eyebrow-context">• {badge}</span>}
            </div>
          )}
          <h1 className="re-page-header-title">{title}</h1>
          {subtitle && <p className="re-page-header-subtitle">{subtitle}</p>}
        </div>

        {quote && (
          <div className="re-page-header-quote">
            {typeof quote === 'string' ? (
              quote.split('\n').map((line, idx) => (
                <div key={idx} className={idx === quote.split('\n').length - 1 ? 're-quote-highlight' : ''}>
                  {line}
                </div>
              ))
            ) : (
              quote
            )}
          </div>
        )}

        {(actions || children) && (
          <div className="re-page-header-actions">
            {actions}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
