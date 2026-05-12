import React from 'react';
import { motion } from 'framer-motion';

interface ProductHeroProps {
  title: string;
  subtitle: string;
  ctaText?: string;
  children?: React.ReactNode;
}

const ProductHero: React.FC<ProductHeroProps> = ({ title, subtitle, ctaText, children }) => {
  return (
    <section className="relative w-full min-h-screen pt-[44px] bg-apple-canvas flex flex-col items-center justify-start text-center overflow-hidden">
      <div className="mt-[80px] px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <h1 className="text-apple-ink text-hero mb-2">
          {title}
        </h1>
        <p className="text-apple-ink text-lead mb-6">
          {subtitle}
        </p>
        {ctaText && (
          <div className="flex justify-center space-x-4 mb-12">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="bg-apple-primary text-apple-on-primary px-8 py-3 rounded-pill text-button-utility font-medium hover:bg-apple-primary-focus transition-colors shadow-sm"
            >
              {ctaText}
            </motion.button>
          </div>
        )}
      </div>
      
      {/* Visualization Area */}
      <div className="w-full px-4 pb-20 flex-grow flex items-center justify-center">
        {children}
      </div>
    </section>
  );
};

export default ProductHero;
