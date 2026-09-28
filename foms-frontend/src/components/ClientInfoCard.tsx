import React from 'react';
import { StatusBadge } from './StatusBadge';

export interface ClientData {
  id: string;
  name: string;
  contactPerson?: string;
  address: string;
  region: string;
  billingSchedule: string;
  status: string;
}

export const ClientInfoCard: React.FC<{ client: ClientData }> = ({ client }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: '#0F172A', color: 'white', padding: '32px 24px', borderRadius: '12px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Company Code</p>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{client.id} · {client.name}</h2>
        <div style={{ width: 'fit-content' }}>
          <StatusBadge status={client.status} />
        </div>
      </div>
    </div>
  );
};
