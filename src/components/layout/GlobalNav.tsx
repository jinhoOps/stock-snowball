import React from 'react';
import { Snowflake, Settings } from 'lucide-react';

interface GlobalNavProps {
  onOpenAdvanced?: () => void;
}

const GlobalNav: React.FC<GlobalNavProps> = ({ onOpenAdvanced }) => {
  return (
    <nav className="fixed top-0 left-0 w-full h-[44px] bg-apple-surface-black/80 backdrop-blur-md text-apple-on-dark z-50 flex items-center justify-between px-4">
      <div className="w-full max-w-[980px] mx-auto h-full flex items-center justify-between">
        {/* Snowball Logo */}
        <a
          href={import.meta.env.BASE_URL}
          className="flex items-center justify-center h-full min-w-[44px] hover:opacity-80 active:scale-95 transition-all"
        >
          <Snowflake size={18} className="text-apple-primary-on-dark" />
        </a>

        {/* Navigation Items (Placeholder) */}
        <div className="hidden md:flex items-center gap-8 h-full">
          {/* Add more nav items if needed */}
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenAdvanced}
          className="flex items-center justify-center h-[44px] w-[44px] text-apple-ink-muted hover:opacity-80 active:scale-90 transition-all"
          aria-label="고급 설정 열기"
        >
          <Settings size={18} className="text-apple-on-dark/80" />
        </button>
      </div>
    </nav>
  );
};

export default GlobalNav;
