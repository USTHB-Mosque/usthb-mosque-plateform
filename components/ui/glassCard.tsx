import * as React from 'react';

interface GlassCardProps {
  title: string;
  body: string;
  side?: 'left' | 'right';
  style?: React.CSSProperties;
}

const GlassCard: React.FC<GlassCardProps> = ({ title, body, side = 'left', style }) => {
  const positionStyle: React.CSSProperties =
    side === 'left'
      ? { bottom: -40, left: -43 }
      : { bottom: -40, right: -43 };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'absolute',
        width: 300,
        height: 150,
        padding: '16px',
        borderRadius: 8,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        background: 'rgba(255, 255, 255, 0.49)',
        border: '1px solid #fff',
        boxShadow: '0 0 10px #00000027',
        willChange: 'transform',
        isolation: 'isolate',
        ...positionStyle,
        ...style,
      }}
    >
      <h3
        style={{
          fontWeight: 700,
          color: 'var(--secondary-500)',
          fontSize: 24,
          lineHeight: '200%',
        }}
      >
        {title}
      </h3>
      <p style={{ lineHeight: '150%' }}>{body}</p>
    </div>
  );
};

export default GlassCard;