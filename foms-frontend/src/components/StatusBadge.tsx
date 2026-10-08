import React from 'react';
import './StatusBadge.css';

export type BadgeStatus = string;

export interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  if (status == null) return null;
  const normalized = status.toString().toLowerCase().trim();

  let tier: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral' = 'warning'; 
  let iconClass = 'ti ti-alert-circle'; // default warning icon

  // 1. Success (Green)
  if (['active', 'done', 'delivered', 'success', 'completed', 'paid', 'inflow', 'validated', 'validated (ctc)', 'billed', 'verified', 'verified & deposited', 'finalized', 'approved'].includes(normalized)) {
    tier = 'success';
    iconClass = normalized === 'inflow' ? 'ti ti-arrow-down-left' : 'ti ti-circle-check';
  }
  // 2. Danger (Red)
  else if (['failed', 'overdue', 'outstanding', 'outflow', 'missing', 'rejected', 'error'].includes(normalized) || normalized.includes('60-90') || normalized.includes('90+')) {
    tier = 'danger';
    iconClass = normalized === 'outflow' ? 'ti ti-arrow-up-right' : 
                (normalized === 'overdue' || normalized === 'outstanding') ? 'ti ti-clock-exclamation' : 'ti ti-circle-x';
  }
  // 3. Neutral (Grey)
  else if (['deactivated', 'returned', 'cancelled'].includes(normalized)) {
    tier = 'neutral';
    iconClass = 'ti ti-circle-off';
  }
  // 4. Info (Blue)
  else if (['in transit', 'submitted', 'picked-up', 'out of delivery', 'for checking'].includes(normalized)) {
    tier = 'info';
    iconClass = normalized === 'in transit' || normalized === 'out of delivery' ? 'ti ti-truck' : 
                normalized === 'submitted' ? 'ti ti-file-check' : 'ti ti-box';
  }
  // 5. Primary (Purple)
  else if (['assigned', 'new payment'].includes(normalized)) {
    tier = 'primary';
    iconClass = normalized === 'assigned' ? 'ti ti-user-check' : 'ti ti-coin';
  }
  // 6. Warning (Orange)
  else {
    tier = 'warning';
    iconClass = ['pending', 'processing', 'preparing'].includes(normalized) ? 'ti ti-clock' :
                normalized === 'ready for pickup' ? 'ti ti-box' :
                normalized === 'returning' ? 'ti ti-arrow-back-up' :
                normalized === 'not submitted' ? 'ti ti-alert-circle' :
                normalized === 'partially paid' ? 'ti ti-chart-pie' :
                normalized.includes('days') ? 'ti ti-calendar-due' : 'ti ti-alert-circle';
  }

  return (
    <span className={`badge badge-${tier} ${className}`}>
      <i className={iconClass} style={{ fontSize: '14px', strokeWidth: '2.5px' }} />
      {status}
    </span>
  );
};

export default StatusBadge;
