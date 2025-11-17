import React from 'react';

interface InfoCardProps {
  title: string;
  value: string;
  subValue?: string;
  titleBgColor: string;
  titleTextColor?: string;
  onDoubleClick?: () => void;
  topLeftBadge?: string | number;
  topRightBadge?: string | number;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, value, subValue, titleBgColor, titleTextColor = 'text-white', onDoubleClick, topLeftBadge, topRightBadge }) => {
  return (
    <div 
        // Added mt-5 to create space for the overlapping badges above.
        className="relative flex flex-col rounded-lg shadow-lg border border-gray-700 bg-secondary cursor-pointer transition-transform transform hover:scale-105 hover:shadow-accent/20 mt-5"
        onDoubleClick={onDoubleClick}
        aria-label={`View details for ${title}`}
        role="button"
        tabIndex={0}
    >
        {/* Top Left Badge for Quantity */}
        {topLeftBadge !== undefined && Number(topLeftBadge) > 0 && (
            <div className="absolute top-0 left-0.5 z-10 bg-theme-5 text-black text-sm font-bold w-9 h-9 rounded-full flex items-center justify-center shadow-md -translate-y-1/2">
                {topLeftBadge}
            </div>
        )}

        {/* Top Right Badge for Percentage */}
        {topRightBadge !== undefined && (
            <div className="absolute top-0 right-0.5 z-10 bg-accent-secondary text-white text-xs font-bold w-9 h-9 rounded-full flex items-center justify-center shadow-md p-1 -translate-y-1/2">
                {topRightBadge}
            </div>
        )}

      {/* Increased top padding to pt-2 to avoid text overlapping with badge. Added rounded top corners. */}
      <div className={`${titleBgColor} px-2 pt-2 pb-1 ${titleTextColor} text-xs font-semibold text-center rounded-t-lg`}>
        {title}
      </div>
      <div className="p-2 text-center flex-grow flex flex-col justify-center min-h-[40px]">
        <p className="font-bold text-lg leading-tight text-white">{value}</p>
        {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
      </div>
    </div>
  );
};

export default InfoCard;