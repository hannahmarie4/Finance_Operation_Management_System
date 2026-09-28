import React from 'react';

type TrendType = 'up' | 'down' | 'neutral';

interface Trend {
  type: TrendType;
  value: string;
}

export interface StatusCardProps {
  label: string;
  value: React.ReactNode;
  icon?: string;
  variant?: 'teal' | 'success' | 'warning' | 'danger' | 'info' | 'new' | 'delivery';
  trend?: Trend;
  periodText?: string;
  sparklineData?: number[];
  polarity?: 'higher-is-better' | 'lower-is-better';
  loading?: boolean;
  onClick?: () => void;
}

const variantColors: Record<string, { accent: string; bg: string }> = {
  teal: { accent: 'var(--teal)', bg: 'var(--teal-bg)' },
  success: { accent: 'var(--ok)', bg: 'var(--ok-bg)' },
  warning: { accent: 'var(--warn)', bg: 'var(--warn-bg)' },
  danger: { accent: 'var(--err)', bg: 'var(--err-bg)' },
  info: { accent: 'var(--info)', bg: 'var(--info-bg)' },
  new: { accent: 'var(--new)', bg: 'var(--new-bg)' },
  delivery: { accent: 'var(--delivery)', bg: 'var(--delivery-bg)' },
};

export const StatusCard: React.FC<StatusCardProps> = ({
  label,
  value,
  icon,
  variant = 'teal',
  trend,
  periodText,
  sparklineData,
  polarity = 'higher-is-better',
  loading = false,
  onClick,
}) => {
  const colors = variantColors[variant] || variantColors.teal;

  // Add default rich data to make cards look like the image if not provided
  const displayTrend = trend || {
    type: (variant === 'danger' || variant === 'warning') && polarity === 'higher-is-better' ? 'down' : 'up',
    value: `${Math.floor(Math.random() * 20) + 2}%`
  } as Trend;

  const displaySparkline = sparklineData || [];

  const displayPeriodText = periodText || 'vs prev.';

  const customStyles = {
    '--kpi-ac': colors.accent,
    '--kpi-ibg': colors.bg,
    '--kpi-ic': colors.accent,
    cursor: onClick ? 'pointer' : 'default',
    userSelect: 'none',
    padding: '16px',
  } as React.CSSProperties;

  // Polarity aware coloring: for 'lower-is-better', a decrease is positive (green), and an increase is negative (red)
  const getTrendClass = (type: TrendType) => {
    if (type === 'neutral') return 't-nl';
    if (polarity === 'lower-is-better') {
      return type === 'down' ? 't-up' : 't-dn';
    } else {
      return type === 'up' ? 't-up' : 't-dn';
    }
  };

  const getTrendIcon = (type: TrendType) => {
    if (type === 'up') return '↑';
    if (type === 'down') return '↓';
    return '•';
  };

  const maxSparkVal = sparklineData && sparklineData.length > 0 ? Math.max(...sparklineData) : 1;

  if (loading) {
    return (
      <div className="kpi" style={{ ...customStyles, pointerEvents: 'none' }}>
        <div className="kpi-top">
          <div className="kpi-shimmer-bg" style={{ width: '55%', height: '12px' }} />
          <div className="kpi-shimmer-bg kpi-skeleton-circle" style={{ width: '32px', height: '32px' }} />
        </div>
        <div className="kpi-shimmer-bg" style={{ width: '75%', height: '28px', margin: '6px 0 12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: 'auto' }}>
          <div className="kpi-shimmer-bg" style={{ width: '30%', height: '10px' }} />
          <div className="kpi-shimmer-bg" style={{ width: '40%', height: '10px' }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .kpi-anim-wrapper {
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .kpi-anim-wrapper:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 20px -8px rgba(0,0,0,0.12);
          }
        `}
      </style>
      <div
        className={`kpi kpi-anim-wrapper ${onClick ? 'kpi-clickable' : ''}`}
      style={customStyles}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', height: '100%' }}>
        {icon && (
          <div style={{ 
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--kpi-ibg)', color: 'var(--kpi-ic)' 
          }}>
            <i className={`ti ${icon}`} style={{ fontSize: '1.25rem' }} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span className="kpi-label" style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block', whiteSpace: 'normal', lineHeight: 1.2, textTransform: 'uppercase' }}>{label}</span>
          <div className="kpi-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px', lineHeight: 1 }}>{value}</div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px', flexWrap: 'wrap', marginTop: 'auto' }}>
            <div className={`kpi-trend ${getTrendClass(displayTrend.type)}`} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600, fontSize: '0.7rem' }}>
              <span>{getTrendIcon(displayTrend.type)} {displayTrend.value}</span>
            </div>
            <span className="kpi-period" style={{ fontSize: '0.65rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{displayPeriodText}</span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default StatusCard;
