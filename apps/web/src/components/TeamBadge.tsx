import React from 'react';
import { IPL_TEAMS } from '@ipl-auction/shared';

interface TeamBadgeProps {
  teamId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isSelected?: boolean;
  isDisabled?: boolean;
  ownerName?: string | null;
  onClick?: () => void;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  teamId,
  size = 'md',
  isSelected = false,
  isDisabled = false,
  ownerName,
  onClick,
}) => {
  const team = IPL_TEAMS.find((t) => t.id === teamId) || {
    id: teamId,
    name: teamId,
    shortName: teamId,
    primaryColor: '#334155',
    secondaryColor: '#94A3B8',
    textColor: '#FFFFFF',
  };

  const sizeClasses = {
    sm: 'w-8 h-8 sm:w-10 sm:h-10 text-[10px] sm:text-xs border-2',
    md: 'w-11 h-11 sm:w-14 sm:h-14 text-xs sm:text-sm border-2',
    lg: 'w-14 h-14 sm:w-20 sm:h-20 text-xs sm:text-base border-2 sm:border-3',
    xl: 'w-18 h-18 sm:w-24 sm:h-24 text-sm sm:text-lg border-3 sm:border-4',
  }[size];

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      className={`relative group flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
        isDisabled ? 'opacity-40 cursor-not-allowed filter grayscale' : 'hover:scale-105'
      }`}
    >
      <div
        className={`rounded-full flex items-center justify-center font-bold tracking-wider shadow-lg ${sizeClasses} transition-all duration-300`}
        style={{
          backgroundColor: team.primaryColor,
          color: team.textColor,
          borderColor: isSelected ? '#F97316' : team.secondaryColor,
          boxShadow: isSelected
            ? '0 0 15px rgba(249, 115, 22, 0.8), inset 0 0 10px rgba(255,255,255,0.3)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        }}
      >
        <span>{team.shortName}</span>
      </div>

      {isSelected && (
        <span className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-md text-xs">
          ✓
        </span>
      )}

      {ownerName && (
        <span className="mt-1 text-[11px] text-slate-300 font-medium max-w-[80px] truncate text-center bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">
          {ownerName}
        </span>
      )}
    </div>
  );
};
