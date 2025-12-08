import React from 'react';
import { ReportData } from '../types';

interface HeroSectionProps {
  data: ReportData;
}

const HeroSection: React.FC<HeroSectionProps> = ({ data }) => {
  // Use Picsum with the keyword for a relevant background, darker overlay for text readability
  const bgImage = `https://picsum.photos/seed/${data.backgroundImageKeyword}/1920/1080`;

  return (
    <div className="relative w-full h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-corporate-900/80 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-corporate-900 to-transparent opacity-90" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        <div className="inline-block px-4 py-1 border border-corporate-accent/50 rounded-full text-corporate-accent text-sm font-semibold tracking-wider mb-6 uppercase backdrop-blur-sm">
          战略 AI 咨询
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 tracking-tight leading-tight">
          {data.companyName}
        </h1>
        <h2 className="text-2xl md:text-3xl font-light text-slate-200 mb-8 max-w-4xl mx-auto">
          {data.reportTitle}
        </h2>
        <div className="max-w-3xl mx-auto glass-panel p-6 rounded-xl text-slate-100 text-lg leading-relaxed shadow-2xl">
          <p>{data.executiveSummary}</p>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;