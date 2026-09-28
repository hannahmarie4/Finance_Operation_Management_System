import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card } from './Card';

const deliveryData = [
  { name: 'Mon', Deliveries: 45, Returned: 4, Failed: 2 },
  { name: 'Tue', Deliveries: 62, Returned: 6, Failed: 1 },
  { name: 'Wed', Deliveries: 38, Returned: 3, Failed: 4 },
  { name: 'Thu', Deliveries: 78, Returned: 7, Failed: 3 },
  { name: 'Fri', Deliveries: 68, Returned: 5, Failed: 2 },
  { name: 'Sat', Deliveries: 32, Returned: 1, Failed: 1 },
  { name: 'Sun', Deliveries: 15, Returned: 0, Failed: 0 },
];

const orderStatusData = [
  { name: 'Delivered', value: 400, color: '#00A99D' },
  { name: 'Failed', value: 30, color: '#DC2626' },
  { name: 'In Transit', value: 300, color: '#0284C7' },
  { name: 'Pending', value: 150, color: '#D97706' },
  { name: 'Returned', value: 50, color: '#64748B' },
];

export const DeliveryPerformanceChart: React.FC = () => {
  const [activeTab, setActiveTab] = useState('7D');

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-chart-line" style={{ color: '#00A99D', fontSize: '1.2rem' }}></i>
          Delivery Performance
        </h3>
        <div style={{ display: 'flex', background: '#F8FAFC', borderRadius: '24px', padding: '4px', gap: '4px' }}>
          {['Today', '7D', '30D', 'Custom'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 'none',
                background: activeTab === tab ? '#FFFFFF' : 'transparent',
                color: activeTab === tab ? '#0EA5E9' : '#64748B',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={deliveryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
            <Tooltip
              cursor={{ fill: '#F1F5F9' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
            <Bar dataKey="Deliveries" fill="#00A99D" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Returned" fill="#64748B" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Failed" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export const OrderStatusChart: React.FC = () => {
  return (
    <DonutWidget
      title="Order Status Breakdown"
      subtitle="ALL TIME"
      icon="ti-box"
      data={orderStatusData}
      centerLabel="ORDERS"
    />
  );
};

export const DonutWidget: React.FC<{
  title: string;
  subtitle?: string;
  icon?: string;
  data: { name: string; value: number; color: string }[];
  centerNumber?: number | string;
  centerLabel?: string;
  footerLeftIcon?: string;
  footerLeftLabel?: string;
  footerLeftValue?: string;
  footerRightLabel?: string;
  onFooterRightClick?: () => void;
}> = ({ title, subtitle, icon, data, centerNumber, centerLabel, footerLeftIcon, footerLeftLabel, footerLeftValue, footerRightLabel, onFooterRightClick }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const displayNumber = centerNumber !== undefined ? centerNumber : total;

  return (
    <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>{title}</h3>
          {subtitle && <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.4 }}>{subtitle}</p>}
        </div>
        {icon && (
          <i className={`ti ${icon}`} style={{ fontSize: '1.25rem', color: '#00A99D' }} />
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 180, height: 180, margin: '20px auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontSize: '13px', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>{displayNumber}</span>
            {centerLabel && <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{centerLabel}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
          {data.map(item => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{item.name}</span>
              </div>
              <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 800 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {(footerLeftLabel || footerRightLabel) && (
        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 24, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
            {footerLeftIcon && <i className={`ti ${footerLeftIcon}`} style={{ color: '#00A99D', fontSize: '14px' }} />}
            {footerLeftLabel && <span>{footerLeftLabel}:</span>}
            {footerLeftValue && <span style={{ fontWeight: 800, color: '#0F172A' }}>{footerLeftValue}</span>}
          </div>
          {footerRightLabel && (
            <div onClick={onFooterRightClick} style={{ fontSize: '12px', fontWeight: 800, color: '#00A99D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {footerRightLabel} <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
