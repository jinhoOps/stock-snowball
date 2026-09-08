import React from 'react';
import Button from '../common/Button';
import { Snowflake, Settings } from 'lucide-react';

interface GlobalNavProps {
  onOpenAdvanced?: () => void;
}

const GlobalNav: React.FC<GlobalNavProps> = ({ onOpenAdvanced }) => {
  return (
    <nav className="fixed top-0 left-0 w-full h-11 bg-apple-surface-black/80 backdrop-blur-md text-apple-on-dark z-nav flex items-center justify-between px-4 sm:px-6">
      <div className="w-full max-w-content mx-auto h-full flex items-center justify-between">
        {/* Snowball Logo */}
        <a
          href={import.meta.env.BASE_URL}
          aria-label="Stock Snowball 홈"
          className="flex items-center justify-center h-full min-w-[44px] hover:opacity-80 active:scale-95 transition-all motion-reduce:transition-none"
        >
          <Snowflake size={18} className="text-apple-primary-on-dark" />
        </a>

        {/* Navigation Items (Placeholder) */}
        <div className="hidden md:flex items-center gap-8 h-full">
          {/* Add more nav items if needed */}
        </div>

        {/* Settings Button */}
        <Button size="icon" variant="ghost"
          onClick={onOpenAdvanced}
          className="text-apple-on-dark hover:bg-white/10 hover:text-white"
          aria-label="고급 설정 열기"
        >
          <Settings size={18} className="text-apple-on-dark/80" />
        </Button>
      </div>
    </nav>
  );
};

export default GlobalNav;
