import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle 
} from 'lucide-react';
import './StatusBadge.css';

export type BadgeStatus = string;

export interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  if (status == null) return null;
  const normalized = status.toString().toLowerCase().trim();

  let tier: 'success' | 'warning' | 'danger' = 'warning'; 
  let Icon = AlertCircle;

  // 1. Critical / Negative (Red)
  if (['failed', 'overdue', 'outflow', 'missing', 'deactivated', 'cancelled', 'returned', 'rejected'].includes(normalized) || normalized.includes('60-90') || normalized.includes('90+')) {
    tier = 'danger';
    Icon = XCircle;
  }
  // 2. Positive / Success (Green)
  else if (['active', 'done', 'delivered', 'success', 'completed', 'paid', 'inflow', 'validated', 'validated (ctc)', 'billed', 'verified', 'verified & deposited', 'finalized'].includes(normalized)) {
    tier = 'success';
    Icon = CheckCircle2;
  }

  return (
    <span className={`badge badge-${tier} ${className}`}>
      <Icon size={14} strokeWidth={2.5} />
      {status}
    </span>
  );
};

export default StatusBadge;
