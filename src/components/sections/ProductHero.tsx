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
    <section className="relative w-full min-h-[90vh] pt-[44px] bg-apple-canvas flex flex-col items-center justify-start text-center overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mt-[80px] px-4"
      >
        <h1 className="text-apple-ink text-4xl sm:text-hero mb-2 tracking-tight">
          {title}
        </h1>
        <p className="text-apple-ink text-lead mb-6 tracking-tight">
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
      </motion.div>
      
      {/* Visualization Area */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="w-full px-4 pb-20 flex-grow flex items-center justify-center"
      >
        {children}
      </motion.div>
    </section>
  );
};

export default ProductHero;
