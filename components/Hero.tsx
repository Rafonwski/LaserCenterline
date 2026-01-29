
import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="py-8 px-4 md:py-12 bg-transparent">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-black text-[#5D3A1A] mb-2 tracking-tighter leading-tight uppercase">
          Ottimizzazione Laser <span className="opacity-50">&</span> Vettorializzazione
        </h2>
        <div className="w-24 h-1 bg-[#5D3A1A] mx-auto rounded-full"></div>
      </div>
    </section>
  );
};

export default Hero;
