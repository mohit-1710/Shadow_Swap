import React from 'react';

interface CloseXProps extends React.HTMLAttributes<HTMLSpanElement> {
  animated?: boolean;
  size?: number;
}

export function CloseX({ animated = false, size = 16, style, className, ...rest }: CloseXProps) {
  return (
    <span
      aria-hidden
      className={`${animated ? 'x-anim' : ''} ${className ?? ''}`}
      style={{ display: 'inline-block', width: size, height: size, lineHeight: 0, ...style }}
      {...rest}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      <style jsx>{`
        @keyframes pillPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.9; }
        }
        .x-anim { animation: pillPulse 1.2s ease-in-out infinite; }
      `}</style>
    </span>
  );
}

