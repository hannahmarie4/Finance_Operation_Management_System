import React, { useState } from 'react';
import { Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { shouldLoadDemoSeeds } from '../config/runtimeMode';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'alert' | 'success';
}

const DUMMY_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'System Update', description: 'The server will go down for maintenance at 12:00 AM.', timestamp: '10 mins ago', read: false, type: 'info' },
  { id: '2', title: 'Order Failed', description: 'Delivery failed for Waybill SP-12345.', timestamp: '1 hour ago', read: false, type: 'alert' },
  { id: '3', title: 'Delivery Success', description: 'Package successfully delivered to Sofia.', timestamp: '2 hours ago', read: true, type: 'success' },
];

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    shouldLoadDemoSeeds ? DUMMY_NOTIFICATIONS : []
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => !n.read);

  const markAllAsUnread = () => {
    setNotifications(notifications.map(n => ({ ...n, read: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="section-card" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={24} style={{ color: 'var(--teal)' }} />
          <span>Notifications</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={markAllAsUnread}>
            <CheckCheck size={16} /> Mark all as Unread
          </button>
          <button className="btn btn-outline" onClick={clearAll}>
            <Trash2 size={16} /> Clear All
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('all')}
        >
          All Notification
        </button>
        <button 
          className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('unread')}
        >
          Unread {notifications.filter(n => !n.read).length > 0 && `(${notifications.filter(n => !n.read).length})`}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
            <div className="empty-state-icon" style={{ marginBottom: '12px', background: 'var(--teal-bg)', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-md)' }}>
              <Bell size={28} style={{ color: 'var(--teal)' }} />
            </div>
            <div className="empty-state-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tp)' }}>You are all caught up.</div>
            <div className="empty-state-desc" style={{ fontSize: '0.85rem', color: 'var(--tt)', marginTop: '6px' }}>New system alerts and order updates will appear here as they come in.</div>
          </div>
        ) : (
          filtered.map(n => (
            <div 
              key={n.id} 
              style={{
                background: n.read ? 'transparent' : 'rgba(0, 169, 157, 0.04)',
                border: '1px solid var(--border)',
                borderLeft: !n.read ? '4px solid var(--teal)' : '1px solid var(--border)',
                padding: '16px',
                borderRadius: 'var(--r-sm)',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                cursor: 'pointer',
                transition: 'all var(--mt-std) var(--ease-std)'
              }}
              onClick={() => markAsRead(n.id)}
            >
              <div style={{
                color: n.type === 'alert' ? 'var(--err)' : n.type === 'success' ? 'var(--ok)' : 'var(--teal)',
                background: 'var(--s1)',
                padding: '10px',
                borderRadius: 'var(--r-sm)'
              }}>
                {n.type === 'alert' && <AlertTriangle size={20} />}
                {n.type === 'success' && <CheckCircle2 size={20} />}
                {n.type === 'info' && <Info size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--tp)', fontSize: '0.95rem' }}>{n.title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--tt)' }}>{n.timestamp}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ts)' }}>{n.description}</p>
                <div style={{ marginTop: '10px' }}>
                  <StatusBadge status={n.type === 'alert' ? 'Failed' : n.type === 'success' ? 'Active' : 'Pending'} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
