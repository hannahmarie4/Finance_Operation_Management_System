import React, { createContext, useContext, useState, useEffect } from 'react';
import { SEEDED_AUDIT_LOGS, AuditLog } from '../data/seed';
import api from '../services/api';
import { isDemoMode, shouldLoadDemoSeeds } from '../config/runtimeMode';

interface AuditContextType {
  logs: AuditLog[];
  logAction: (action: string, module: string, recordType: string, recordId: string, details: string, userFullName: string, userRole: string, userId: string) => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.get('/audit-logs')
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          // Backend logs mapped to frontend AuditLog interface
          const backendLogs = res.data.map((l: any, idx: number) => ({
            id: l.id || l.logId || `AL-${Date.now()}-${idx}`,
            action: l.action || 'UNKNOWN',
            module: l.entityName || l.module || 'System',
            recordType: l.entityName || l.recordType || 'Record',
            recordId: l.entityId || l.recordId || '',
            details: l.details || '',
            userFullName: l.userId || l.userName || l.userFullName || 'Unknown User',
            userRole: l.userRole || 'Staff',
            userId: l.userId || '',
            ipAddress: l.ipAddress || '192.168.1.1',
            timestamp: l.loggedAt || l.timestamp || l.createdAt || new Date().toISOString()
          }));
          if (isDemoMode && shouldLoadDemoSeeds) {
            const existingIds = new Set(backendLogs.map((l: any) => l.id));
            const seedToKeep = SEEDED_AUDIT_LOGS.filter(s => !existingIds.has(s.id));
            setLogs([...backendLogs, ...seedToKeep].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
          } else {
            setLogs(backendLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
          }
        }
      })
      .catch(err => {
        console.warn('Failed to fetch audit logs.', err);
        if (isDemoMode && shouldLoadDemoSeeds) setLogs([...SEEDED_AUDIT_LOGS]);
      });
  }, []);

  const logAction = (action: string, module: string, recordType: string, recordId: string, details: string, userFullName: string, userRole: string, userId: string) => {
    const newLog: AuditLog = {
      id: `AL-${Date.now()}`,
      action,
      module,
      recordType,
      recordId,
      details,
      userFullName,
      userRole: userRole as any,
      userId,
      ipAddress: '192.168.1.1', // Mock IP
      timestamp: new Date().toISOString()
    };
    setLogs(prev => [newLog, ...prev]);
  };

  return (
    <AuditContext.Provider value={{ logs, logAction }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
