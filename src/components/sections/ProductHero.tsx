import React from 'react';
import Button from '../common/Button';

interface ProductHeroProps {
  title: string;
  subtitle: string;
  ctaText?: string;
  children?: React.ReactNode;
}

const ProductHero: React.FC<ProductHeroProps> = ({ title, subtitle, ctaText, children }) => {
  return (
    <section className="relative w-full min-h-[90vh] pt-11 flex flex-col items-center justify-start">
      <div className="mt-12 max-w-content px-4 text-center animate-apple-rise sm:mt-20 sm:px-6">
        <h1 className="break-keep text-apple-ink font-display text-display-sm sm:text-hero mb-2 tracking-tight">
          {title}
        </h1>
        <p className="break-keep text-balance text-apple-ink text-body sm:text-lead mb-8 tracking-tight">
          {subtitle}
        </p>
        {ctaText && (
          <div className="flex justify-center space-x-4 mb-12">
            <Button variant="primary">
              {ctaText}
            </Button>
          </div>
        )}
      </div>
      
      {/* Visualization Area */}
      <div className="w-full px-4 sm:px-6 pb-16 flex-grow flex items-center justify-center animate-apple-fade [animation-delay:300ms]">
        {children}
      </div>
    </section>
  );
};

export default ProductHero;
