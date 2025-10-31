import React from 'react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fallbackAnimated?: boolean;
}

export function PillButton({ fallbackAnimated = false, className, children, style, ...rest }: PillButtonProps) {
  return (
    <button
      className={`pill ${fallbackAnimated ? 'pill-fallback' : ''} ${className ?? ''}`}
      style={style}
      {...rest}
    >
      {children}
      <style jsx>{`
        .pill { border-radius: 9999px; padding: 6px 12px; border: 1px solid #e5e7eb; background: #fff; }
        @keyframes pillPulse { 0%,100%{ transform: scale(1); opacity:1;} 50%{ transform: scale(1.04); opacity:0.95;} }
        .pill-fallback { animation: pillPulse 1.2s ease-in-out infinite; }
      `}</style>
    </button>
  );
}

