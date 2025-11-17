
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-secondary p-6 rounded-xl shadow-lg flex items-center space-x-4 transition-transform transform hover:scale-105 hover:shadow-accent/20">
      <div className={`p-4 rounded-full ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-300 font-medium">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};

export default KpiCard;