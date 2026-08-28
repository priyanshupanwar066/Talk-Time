// Badge and Delivery Status Icons
import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface DeliveryStatusProps {
  status: 'SENT' | 'DELIVERED' | 'READ';
  className?: string;
}

export const DeliveryStatusIcon: React.FC<DeliveryStatusProps> = ({ status, className = '' }) => {
  if (status === 'READ') {
    return (
      <span className={`inline-flex items-center text-indigo-600 ${className}`} title="Read">
        <CheckCheck className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (status === 'DELIVERED') {
    return (
      <span className={`inline-flex items-center text-slate-400 ${className}`} title="Delivered">
        <CheckCheck className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center text-slate-400 ${className}`} title="Sent">
      <Check className="w-3.5 h-3.5" />
    </span>
  );
};

export const UnreadBadge: React.FC<{ count: number; className?: string }> = ({ count, className = '' }) => {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-indigo-600 rounded-full shrink-0 shadow-sm animate-pulse ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};
