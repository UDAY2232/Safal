import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase().replace(/[\s_]+/g, '-');

  // Tone mapping
  let badgeClass = normalized;
  if (['closed', 'paid', 'approved', 'profit', 'active', 'paid/cleared', 'paid-cleared'].includes(normalized)) {
    badgeClass = 'approved';
  } else if (['open', 'rejected', 'loss', 'inactive'].includes(normalized)) {
    badgeClass = 'rejected';
  } else if (['pending', 'pending-approval', 'payment-pending', 'partially-paid', 'partially-reimbursed', 'draft', 'pending-cost-data', 'pending-sales-data', 'in-progress'].includes(normalized)) {
    badgeClass = 'pending';
  }

  // Format label for display
  const label = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span />
      {label}
    </span>
  );
};

