/**
 * certificateStatusHelper.js
 * Centralized presentation mapping for Certificate statuses in RetailEdge PRO.
 * Preserves underlying database ENUMs while standardizing user-facing terminology.
 */

export function mapCertificateStatus(status) {
  if (!status) return { label: '—', variant: 'neutral' };
  const raw = String(status).trim().toUpperCase();

  switch (raw) {
    case 'ISSUED':
    case 'VALID':
    case 'ACTIVE':
      return {
        label: 'Active / Verified',
        variant: 'success',
        code: 'VALID'
      };

    case 'ELIGIBLE — PENDING':
    case 'ELIGIBLE_PENDING':
    case 'PENDING':
      return {
        label: 'Eligible — Pending Issuance',
        variant: 'info',
        code: 'ELIGIBLE_PENDING'
      };

    case 'IN PROGRESS':
    case 'IN_PROGRESS':
    case 'DRAFT':
    case 'GENERATED':
      return {
        label: 'In Progress',
        variant: 'warning',
        code: 'IN_PROGRESS'
      };

    case 'NOT ELIGIBLE':
    case 'NOT_ELIGIBLE':
      return {
        label: 'Not Eligible',
        variant: 'danger',
        code: 'NOT_ELIGIBLE'
      };

    case 'REVOKED':
    case 'REPLACED':
      return {
        label: 'Revoked',
        variant: 'danger',
        code: 'REVOKED'
      };

    case 'EXPIRED':
      return {
        label: 'Expired',
        variant: 'neutral',
        code: 'EXPIRED'
      };

    default:
      return {
        label: status,
        variant: 'neutral',
        code: raw
      };
  }
}

export default mapCertificateStatus;
