import React from 'react';
import { Apple, Search, ShoppingBag } from 'lucide-react';

const GlobalNav: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 w-full h-[44px] bg-apple-surface-black text-apple-on-dark z-50 flex items-center justify-center px-4 md:px-0">
      <div className="w-full max-w-[980px] flex items-center justify-between">
        {/* Apple Logo */}
        <a href="/" className="hover:opacity-80 transition-opacity">
          <Apple size={18} fill="currentColor" />
        </a>

        {/* Links */}
        <div className="hidden md:flex items-center space-x-[20px] text-[12px] font-text tracking-[-0.12px]">
          <a href="#" className="hover:opacity-80 transition-opacity">Store</a>
          <a href="#" className="hover:opacity-80 transition-opacity">Mac</a>
          <a href="#" className="hover:opacity-80 transition-opacity">iPad</a>
          <a href="#" className="hover:opacity-80 transition-opacity">iPhone</a>
          <a href="#" className="hover:opacity-80 transition-opacity">Watch</a>
          <a href="#" className="hover:opacity-80 transition-opacity">AirPods</a>
          <a href="#" className="hover:opacity-80 transition-opacity">TV & Home</a>
          <a href="#" className="hover:opacity-80 transition-opacity">Only on Apple</a>
          <a href="#" className="hover:opacity-80 transition-opacity">Accessories</a>
          <a href="#" className="hover:opacity-80 transition-opacity">Support</a>
        </div>

        {/* Icons */}
        <div className="flex items-center space-x-[20px]">
          <button className="hover:opacity-80 transition-opacity">
            <Search size={16} />
          </button>
          <button className="hover:opacity-80 transition-opacity">
            <ShoppingBag size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default GlobalNav;
