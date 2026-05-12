import React from 'react';
import { Snowflake, Search, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

const GlobalNav: React.FC = () => {
  const navItems = [
    { label: 'Store', href: '#' },
    { label: 'Mac', href: '#' },
    { label: 'iPad', href: '#' },
    { label: 'iPhone', href: '#' },
    { label: 'Watch', href: '#' },
    { label: 'AirPods', href: '#' },
    { label: 'TV & Home', href: '#' },
    { label: 'Only on Apple', href: '#' },
    { label: 'Accessories', href: '#' },
    { label: 'Support', href: '#' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full h-[44px] bg-apple-surface-black/80 backdrop-blur-md text-apple-on-dark z-50 flex items-center justify-center px-4 md:px-0">
      <div className="w-full max-w-[980px] h-full flex items-center justify-between">
        {/* Snowball Logo */}
        <motion.a 
          href="/" 
          className="flex items-center justify-center h-full min-w-[44px] hover:opacity-80 transition-opacity"
          whileTap={{ scale: 0.95 }}
        >
          <Snowflake size={18} className="text-apple-primary-on-dark" />
        </motion.a>

        {/* Links */}
        <div className="hidden md:flex items-center h-full text-[12px] font-text tracking-[-0.12px]">
          {navItems.map((item) => (
            <motion.a
              key={item.label}
              href={item.href}
              className="px-4 h-full flex items-center hover:opacity-80 transition-opacity"
              whileTap={{ scale: 0.95 }}
            >
              {item.label}
            </motion.a>
          ))}
        </div>

        {/* Icons */}
        <div className="flex items-center h-full">
          <motion.button 
            className="flex items-center justify-center h-full min-w-[44px] hover:opacity-80 transition-opacity"
            whileTap={{ scale: 0.95 }}
          >
            <Search size={16} />
          </motion.button>
          <motion.button 
            className="flex items-center justify-center h-full min-w-[44px] hover:opacity-80 transition-opacity"
            whileTap={{ scale: 0.95 }}
          >
            <ShoppingBag size={16} />
          </motion.button>
        </div>
      </div>
    </nav>
  );
};

export default GlobalNav;
