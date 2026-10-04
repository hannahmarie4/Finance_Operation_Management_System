import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { useClientContext } from '../context/ClientContext';
import { Login } from '../pages/Login';

export const GlobalLayout: React.FC = () => {
  const { user } = useClientContext();

  if (!user) {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopHeader />
        <main style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
