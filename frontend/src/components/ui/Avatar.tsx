// Avatar Component
import React from 'react';
import { resolveMediaUrl } from '../../services/api';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showPresence?: boolean;
  className?: string;
  isGroup?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline,
  showPresence = false,
  className = '',
  isGroup = false,
}) => {
  const getInitials = (str: string) => {
    if (!str) return '?';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const dotSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  // Consistent color from name
  const getColorFromName = (str: string) => {
    const colors = [
      'bg-blue-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-purple-500',
      'bg-cyan-500',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {src ? (
        <img
          src={resolveMediaUrl(src)}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 shadow-sm`}
          onError={(e) => {
            // fallback to initials on broken image
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
      ) : null}

      <div
        className={`${sizeClasses[size]} rounded-full ${getColorFromName(
          name
        )} text-white font-semibold flex items-center justify-center shadow-sm select-none ${
          src ? 'hidden' : 'flex'
        }`}
      >
        {isGroup ? '👥' : getInitials(name)}
      </div>

      {showPresence && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white ${dotSizes[size]} ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
