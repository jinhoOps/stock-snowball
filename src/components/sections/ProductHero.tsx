import React from 'react';

interface ProductHeroProps {
  title: string;
  subtitle: string;
  ctaText?: string;
  children?: React.ReactNode;
}

const ProductHero: React.FC<ProductHeroProps> = ({ title, subtitle, ctaText = "시작하기", children }) => {
  return (
    <section className="relative w-full min-h-screen pt-[44px] bg-apple-canvas flex flex-col items-center justify-start text-center overflow-hidden">
      <div className="mt-[80px] px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <h1 className="text-apple-ink text-hero mb-2 tracking-[-0.28px]">
          {title}
        </h1>
        <p className="text-apple-ink text-lead mb-6">
          {subtitle}
        </p>
        <div className="flex justify-center space-x-4 mb-12">
          <button className="bg-apple-primary text-apple-on-primary px-[22px] py-[11px] rounded-full text-body hover:bg-apple-primary-focus transition-colors active:scale-95 duration-200">
            {ctaText}
          </button>
        </div>
      </div>
      
      {/* Visualization Area */}
      <div className="w-full max-w-[1200px] px-4 pb-20 flex-grow flex items-center justify-center">
        {children}
      </div>
    </section>
  );
};

export default ProductHero;
