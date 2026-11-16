import React, { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: 'blue' | 'green' | 'rose' | 'gold';
  detail?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, tone, detail }) => {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
};

