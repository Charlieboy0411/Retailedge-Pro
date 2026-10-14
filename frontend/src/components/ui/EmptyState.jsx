import React from 'react';
import { FileSearch, Inbox, Search, Database } from 'lucide-react';

/**
 * RetailEdge PRO Enterprise EmptyState
 * Clean, executive empty state presentation matching enterprise guidelines.
 */
export default function EmptyState({
  icon: CustomIcon,
  variant = 'search', // 'search' | 'data' | 'inbox'
  title = 'No records found',
  description = 'Try adjusting your filters, date range, or project selection.',
  action = null,
  className = '',
  compact = false
}) {
  const renderIcon = () => {
    if (CustomIcon) return <CustomIcon size={compact ? 24 : 36} />;
    switch (variant) {
      case 'data':
        return <Database size={compact ? 24 : 36} />;
      case 'inbox':
        return <Inbox size={compact ? 24 : 36} />;
      case 'search':
      default:
        return (
          <div className="re-empty-icon-stack">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="8" width="24" height="32" rx="4" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" fill="#F8FAFC" />
              <line x1="16" y1="16" x2="28" y2="16" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="22" x2="24" y2="22" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="28" x2="22" y2="28" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <circle cx="30" cy="30" r="9" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2" />
              <line x1="36" y1="36" x2="43" y2="43" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className={`re-empty-state ${compact ? 're-empty-compact' : ''} ${className}`}>
      <div className="re-empty-icon-wrap">
        {renderIcon()}
      </div>
      <h3 className="re-empty-title">{title}</h3>
      {description && <p className="re-empty-desc">{description}</p>}
      {action && <div className="re-empty-action">{action}</div>}
    </div>
  );
}
