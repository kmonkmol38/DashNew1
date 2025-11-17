
import React from 'react';

// A reusable component for the yellow boxes in the flowchart
const FlowchartNode: React.FC<{ label: React.ReactNode; className?: string }> = ({ label, className = '' }) => (
  <div
    onClick={() => { /* Placeholder for future functionality */ }}
    className={`bg-[#f5b945] text-black p-3 rounded-lg font-semibold text-center cursor-pointer transition-transform transform hover:scale-105 shadow-lg min-w-[160px] ${className}`}
  >
    {label}
  </div>
);

// A reusable component for the arrows between nodes
const Arrow: React.FC = () => (
    <div className="flex items-center">
        <div className="w-10 h-1 bg-[#f5b945]"></div>
        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-[#f5b945]"></div>
    </div>
);

const Flowchart: React.FC = () => {
  const revenueSources = [
    <>EHRC Fleets<br />Rental &amp; Fuel Back<br />Charge</>,
    <>Internal Fleets<br />Rental &amp; Fuel Back<br />Charge</>,
    <>External Fleets<br />Rental &amp; Fuel Back<br />Charge</>,
    <>Maintenance Job<br />Card Back Charge</>,
    <>Driver &amp; Operator<br />Rental Back<br />Charge</>,
    <>GPS Device Rental<br />Back Charge</>,
  ];

  // Y positions for the start of each line, in viewBox coordinates (0-100).
  const lineYPositions = [12, 26, 41, 59, 74, 88];

  return (
    <div className="mt-8 bg-black p-8 rounded-xl shadow-lg relative overflow-hidden">
        <h3 className="text-xl font-display text-center font-bold text-[#f5b945] mb-8">Business Flow Overview</h3>
      <div className="flex items-center justify-center gap-10 md:gap-10 relative z-10 flex-wrap">
        {/* Left Column: Revenue Sources */}
        <div className="flex flex-col gap-3">
          {revenueSources.map((label, index) => (
            <FlowchartNode key={index} label={label} />
          ))}
        </div>

        {/* Right Flow: Revenue -> Cost -> Profit */}
        <div className="flex items-center gap-2">
          <FlowchartNode label="Revenue" />
          <Arrow />
          <FlowchartNode label="Cost" />
          <Arrow />
          <FlowchartNode label="Profit" />
        </div>
      </div>
      
      {/* SVG Overlay for Square Dotted Lines */}
      <div className="absolute top-0 left-0 w-1/2 h-full z-0 pointer-events-none">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
            {lineYPositions.map((y, index) => (
                <path
                    key={index}
                    d={`M 60 ${y} H 80 V 50 H 100`}
                    stroke="#f5b945"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                    fill="none"
                />
            ))}
        </svg>
      </div>
    </div>
  );
};

export default Flowchart;
