import React from 'react';
import { Card } from './Card';
import { AuditLog } from '../data/seed';

// ── Helpers ─────────────────────────────────────────────────────────
export function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function getActionColor(action: string): string {
  if (action === 'LOGIN_SUCCESS' || action === 'RECOMMENDATION_APPROVED' || action === 'UNIQUE_SAVED' || action === 'DOCUMENT_SCAN') return '#10B981'; // Green
  if (action === 'DUPLICATE_DETECTED') return '#F59E0B'; // Orange
  // Generic fallback colors
  if (action.includes('VALIDATED') || action.includes('APPROVED')) return '#10B981';
  if (action.includes('CREATED') || action.includes('ENCODED')) return '#0EA5E9';
  if (action.includes('RECORDED') || action.includes('SUBMITTED')) return '#F59E0B';
  return '#10B981'; // Default green
}

// ── Component ───────────────────────────────────────────────────────
export const RecentActivity: React.FC<{ logs: AuditLog[]; title?: string; onViewAll?: () => void }> = ({ logs, title = 'Recent Activity', onViewAll }) => (
  <Card style={{ padding: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>{title}</h3>
      {onViewAll ? (
        <span 
          onClick={onViewAll}
          style={{ color: '#0D9488', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          View All <i className="ti ti-arrow-right"></i>
        </span>
      ) : (
        <span style={{ padding: '4px 10px', borderRadius: 9999, background: '#ECFDF5', color: '#10B981', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          LIVE FEED
        </span>
      )}
    </div>
    {logs.length === 0 ? (
      <p style={{ color: '#94A3B8', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0' }}>No recent activity.</p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {logs.map((log) => {
          return (
            <div key={log.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: getActionColor(log.action), marginTop: 7, flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#0F172A', fontWeight: 600 }}>
                  System event: {log.action} for <strong>System</strong>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  {relativeTime(log.timestamp)} &bull; {log.userRole || 'Finance Manager'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </Card>
);

