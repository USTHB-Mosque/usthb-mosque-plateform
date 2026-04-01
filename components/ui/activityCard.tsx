import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface ActivityCardAction {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface ActivityCardProps {
  title: string;
  imageSrc: string;
  imageAlt?: string;
  description?: string;
  hadith?: React.ReactNode;
  badge?: string;
  actions?: ActivityCardAction[];
  gridColumn?: string;
  gridRow?: string;
  showArrow?: boolean;
}

const gradientOverlay = 'linear-gradient(to top, #243245 0%, #243245c0 50%, #24324553 100%)';

const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  imageSrc,
  imageAlt = '',
  description,
  hadith,
  badge,
  actions,
  gridColumn,
  gridRow,
  showArrow = false,
}) => {
  return (
    <div
      style={{
        gridRow,
        gridColumn,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Arrow button */}
      {showArrow && (
        <button
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            backgroundColor: '#243245',
            height: 30,
            width: 30,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 15,
            cursor: 'pointer',
            zIndex: 10,
            border: 'none',
          }}
        >
          <ArrowUpRight color="var(--primary-1000)" size={18} />
        </button>
      )}

      {/* Image */}
      <img
        src={imageSrc}
        alt={imageAlt}
        style={{
          borderRadius: 12,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* Dark gradient overlay + content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          background: gradientOverlay,
          zIndex: 3,
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 24,
          gap: 24,
        }}
      >
        {/* Badge */}
        {badge && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 24,
              backgroundColor: 'var(--primary-600)',
              padding: '4px 8px',
              paddingTop: 7,
              borderRadius: 8,
              fontSize: 14,
              alignSelf: 'flex-start',
              color: '#fff',
            }}
          >
            {badge}
          </div>
        )}

        {/* Text */}
        <div style={{ color: '#ffffffd6' }}>
          <h2
            style={{
              fontSize: 24,
              color: '#ffffff',
              fontWeight: 700,
              fontFamily: 'var(--font-khalid)',
            }}
          >
            {title}
          </h2>
          {description && <p style={{ fontSize: 14 }}>{description}</p>}
          {hadith && <p style={{ fontSize: 14 }}>{hadith}</p>}
        </div>

        {/* Action buttons */}
        {actions && actions.length > 0 && (
          <div style={{ display: 'flex', width: '100%', gap: 16 }}>
            {actions.map((action, i) =>
              action.variant === 'primary' ? (
                <button
                  key={i}
                  onClick={action.onClick}
                  style={{
                    flex: 1,
                    color: '#ffffff',
                    fontSize: 18,
                    border: '1px solid #1fc7abb2',
                    borderRadius: 8,
                    backgroundColor: '#1fc7ab7e',
                    padding: '8px 0',
                    cursor: 'pointer',
                    boxShadow: 'inset 0 4px 8px #ffffff2b',
                  }}
                >
                  {action.label}
                </button>
              ) : (
                <button
                  key={i}
                  onClick={action.onClick}
                  style={{
                    flex: 1,
                    color: '#fff',
                    fontSize: 18,
                    border: '1px solid #ffffff89',
                    borderRadius: 8,
                    backgroundColor: '#ffffff22',
                    padding: '8px 0',
                    cursor: 'pointer',
                    boxShadow: 'inset 0 4px 8px #00000039',
                  }}
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;