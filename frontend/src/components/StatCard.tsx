import React, { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: 'blue' | 'green' | 'rose' | 'gold';
  detail?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, tone, detail, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`stat-card ${tone} ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01] transition-transform duration-150' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
};

