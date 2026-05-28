import React from 'react';

interface Props {
  cx: number;
  cy: number;
  r: number;
}

/**
 * Soft animated aurora halo placed behind the globe sphere.
 * Several conic gradients layered with CSS animation give the
 * impression of a turning ring of pale color around the world.
 */
export const AuroraRing: React.FC<Props> = ({ cx, cy, r }) => {
  const D = r * 2.5;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: cx - D / 2,
        top: cy - D / 2,
        width: D,
        height: D,
        zIndex: 0,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0 animate-aurora-spin"
        style={{
          background: 'conic-gradient(from 0deg, rgba(139,92,246,0) 0deg, rgba(139,92,246,0.32) 60deg, rgba(34,211,238,0.36) 130deg, rgba(251,191,36,0.18) 200deg, rgba(251,113,133,0.30) 280deg, rgba(139,92,246,0) 360deg)',
          borderRadius: '50%',
          filter: `blur(${Math.round(r * 0.18)}px)`,
          opacity: 0.55,
        }}
      />
      <div
        className="absolute animate-aurora-spin"
        style={{
          left: '12%', top: '12%', width: '76%', height: '76%',
          background: 'conic-gradient(from 180deg, rgba(34,211,238,0) 0deg, rgba(34,211,238,0.20) 90deg, rgba(139,92,246,0.18) 180deg, rgba(251,191,36,0.10) 270deg, rgba(34,211,238,0) 360deg)',
          borderRadius: '50%',
          filter: `blur(${Math.round(r * 0.10)}px)`,
          animationDirection: 'reverse',
          animationDuration: '60s',
          opacity: 0.6,
        }}
      />
      {/* Inner darken to keep planet readable */}
      <div
        className="absolute"
        style={{
          left: '30%', top: '30%', width: '40%', height: '40%',
          background: 'radial-gradient(circle, rgba(3,4,10,0.85) 0%, rgba(3,4,10,0) 70%)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};
