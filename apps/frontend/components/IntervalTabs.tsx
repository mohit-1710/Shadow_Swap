import React from 'react';
import type { Interval } from '../hooks/useMarketChart';

interface Props {
  value: Interval;
  onChange: (i: Interval) => void;
  className?: string;
}

const intervals: Interval[] = ['1D', '1W', '1M', '6M', '1Y'];

export function IntervalTabs({ value, onChange, className }: Props) {
  return (
    <div className={`interval-tabs ${className ?? ''}`}>
      {intervals.map((i) => (
        <button
          key={i}
          className={`tab ${i === value ? 'active' : ''}`}
          onClick={() => onChange(i)}
          type="button"
        >
          {i}
        </button>
      ))}
      <style jsx>{`
        .interval-tabs { display: inline-flex; gap: 8px; }
        .tab { cursor: pointer; border: 1px solid #e5e7eb; background: #fff; padding: 4px 8px; border-radius: 9999px; }
        .tab.active { background: #111827; color: #fff; border-color: #111827; }
      `}</style>
    </div>
  );
}

