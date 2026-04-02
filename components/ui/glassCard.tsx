import * as React from 'react';

interface GlassCardProps {
  title: string;
  body: string;
  side?: 'left' | 'right';
  style?: React.CSSProperties;
}

const GlassCard: React.FC<GlassCardProps> = ({ title, body, side = 'left', style }) => {
  return (
    <div
      style={style}
      className={`
        absolute z-10 flex flex-col gap-2 p-4 rounded-lg
        w-[240px] md:w-[280px] lg:w-[300px]
        backdrop-blur-md bg-white/50 border border-white shadow-[0_0_10px_#00000027]
        ${side === 'left' ? 'left-0 md:-left-8 lg:-left-11' : 'right-0 md:-right-8 lg:-right-11'}
        -bottom-8 md:-bottom-10
      `}
    >
      <h3 className="text-lg md:text-2xl font-bold leading-loose text-[var(--secondary-500)]">
        {title}
      </h3>
      <p className="text-sm md:text-base leading-relaxed">{body}</p>
    </div>
  );
};

export default GlassCard;