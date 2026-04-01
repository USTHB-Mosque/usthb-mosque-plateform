import * as React from 'react';
import Image from 'next/image';
import { ArrowLeftIcon } from 'lucide-react';
import GlassCard from './glassCard';

interface Stat {
  value: string;
  label: string;
}

interface SectionBlockProps {
  heading: string;
  body: string;
  imageSrc: string;
  imageAlt?: string;
  cardTitle: string;
  cardBody: string;
  ctaLabel?: string;
  ctaHref?: string;
  imagePosition?: 'left' | 'right';
  backgroundColor?: string;
  stats?: Stat[];
}

const styles = {
  heroSection: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 50,
    padding: '64px 100px',
  } as React.CSSProperties,

  textCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    height: '100%',
    width: '30%',
    flex: 1,
    gap: 26,
    textAlign: 'right',
  } as React.CSSProperties,

  heading: {
    fontFamily: 'var(--font-khalid)',
    fontSize: 44,
    fontWeight: 600,
    padding: '16px 0',
    fontDisplay: 'swap',
  } as React.CSSProperties,

  body: {
    fontSize: 24,
    fontWeight: 400,
    lineHeight: '200%',
    textAlign: 'justify',
  } as React.CSSProperties,

  cta: {
    display: 'flex',
    justifyContent: 'center',
    gap: 5,
    alignItems: 'center',
    backgroundColor: '#0DE9C31A',
    fontWeight: 700,
    fontSize: 16,
    lineHeight: '200%',
    color: 'var(--primary-1000)',
    padding: '3px 24px',
    borderRadius: 8,
    border: '1px solid #fff',
    willChange: 'transform',
    textDecoration: 'none',
  } as React.CSSProperties,

  imageCol: {
    flex: 1,
    width: '30%',
    position: 'relative',
  } as React.CSSProperties,

  imageWrapper: {
    flex: 1,
    minWidth: 0,
    height: 420,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 8,
    contain: 'layout',
  } as React.CSSProperties,
} as const;

const SectionBlock: React.FC<SectionBlockProps> = ({
  heading,
  body,
  imageSrc,
  imageAlt = 'mosque',
  cardTitle,
  cardBody,
  ctaLabel = 'عرض الفهرس الكامل',
  ctaHref = '#',
  imagePosition = 'right',
  backgroundColor,
  stats,
}) => {
  const imageColumn = (
    <div style={styles.imageCol}>
      <div style={styles.imageWrapper}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={600}
          height={392}
          priority
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            borderRadius: 5,
          }}
        />
      </div>
      <GlassCard title={cardTitle} body={cardBody} side={imagePosition === 'right' ? 'left' : 'right'} />
    </div>
  );

  const textColumn = (
    <div style={styles.textCol}>
      <h2 style={styles.heading}>{heading}</h2>
      <p style={styles.body}>{body}</p>

      {stats && stats.length > 0 && (
        <dl style={{ display: 'flex', gap: 40 }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <dd style={{ fontWeight: 700, fontSize: 28, color: 'var(--primary-1000)' }}>{stat.value}</dd>
              <dt style={{ fontWeight: 700, fontSize: 20 }}>{stat.label}</dt>
            </div>
          ))}
        </dl>
      )}

      <a href={ctaHref} style={styles.cta}>
        {ctaLabel}
        <ArrowLeftIcon />
      </a>
    </div>
  );

  return (
    <section style={{ ...styles.heroSection, backgroundColor }}>
      {imagePosition === 'left' ? (
        <>
          {imageColumn}
          {textColumn}
        </>
      ) : (
        <>
          {textColumn}
          {imageColumn}
        </>
      )}
    </section>
  );
};

export default SectionBlock;