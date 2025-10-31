import React from 'react';

interface CardProps {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export function Card({ title, right, children }: CardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>{title}</h3>
        {right ? <div className="card-right">{right}</div> : null}
      </div>
      <div className="card-body">{children}</div>
      <style jsx>{`
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fff; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .card-body { }
      `}</style>
    </div>
  );
}

