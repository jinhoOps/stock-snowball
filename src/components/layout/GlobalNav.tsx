import React from 'react';
import { Snowflake } from 'lucide-react';
import { motion } from 'framer-motion';

const GlobalNav: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 w-full h-[44px] bg-apple-surface-black/80 backdrop-blur-md text-apple-on-dark z-50 flex items-center justify-center px-4 md:px-0">
      <div className="w-full max-w-[980px] h-full flex items-center">
        {/* Snowball Logo */}
        <motion.a 
          href="/" 
          className="flex items-center justify-center h-full min-w-[44px] hover:opacity-80 transition-opacity"
          whileTap={{ scale: 0.95 }}
        >
          <Snowflake size={18} className="text-apple-primary-on-dark" />
        </motion.a>
      </div>
    </nav>
  );
};

export default GlobalNav;
