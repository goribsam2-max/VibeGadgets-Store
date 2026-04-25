import React from 'react';
import Icon from '../components/Icon';

const Logo: React.FC<{ className?: string, scale?: number, centerOrigin?: boolean }> = ({ className = '', scale = 1, centerOrigin = false }) => {
  return (
    <div 
      className={`inline-flex items-center bg-[#06331e] px-4 py-2 rounded-xl shadow-lg border border-[#0a4a2b] ${className}`}
      style={{ transform: `scale(${scale})`, transformOrigin: centerOrigin ? 'center center' : 'left center' }}
    >
      <Icon name="store" className="text-emerald-400 mr-2.5" />
      <h1 className="font-black tracking-tight leading-none flex items-baseline">
        <span className="text-white">ভাইব</span>
        <span className="text-emerald-400 ml-1">গ্যাজেট</span>
      </h1>
    </div>
  );
};

export default Logo;
