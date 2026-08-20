import React from 'react';

interface ProductHeroProps {
  title: string;
  subtitle: string;
  ctaText?: string;
  children?: React.ReactNode;
}

const ProductHero: React.FC<ProductHeroProps> = ({ title, subtitle, ctaText, children }) => {
  return (
    <section className="relative w-full min-h-[90vh] pt-[44px] flex flex-col items-center justify-start text-center overflow-hidden">
      <div className="mt-[80px] px-4 animate-apple-rise">
        <h1 className="break-keep text-apple-ink text-4xl sm:text-hero mb-2 tracking-tight">
          {title}
        </h1>
        <p className="text-apple-ink text-lead mb-6 tracking-tight">
          {subtitle}
        </p>
        {ctaText && (
          <div className="flex justify-center space-x-4 mb-12">
            <button className="bg-apple-primary text-apple-on-primary px-8 py-3 rounded-pill text-button-utility font-medium hover:bg-apple-primary-focus active:scale-95 transition-colors shadow-sm">
              {ctaText}
            </button>
          </div>
        )}
      </div>
      
      {/* Visualization Area */}
      <div className="w-full px-4 pb-20 flex-grow flex items-center justify-center animate-apple-fade [animation-delay:300ms]">
        {children}
      </div>
    </section>
  );
};

export default ProductHero;
