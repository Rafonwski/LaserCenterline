
import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="py-12 px-4 md:py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase text-indigo-700 bg-indigo-50 rounded-full border border-indigo-100">
          Vettorializzazione Intelligente
        </span>
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
          Dalle immagini ai tuoi progetti laser in <span className="text-indigo-600">un click.</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          Converti immagini in SVG con <strong className="text-slate-900">linee singole</strong>. A differenza di LightBurn Trace, estraiamo lo scheletro per un taglio laser perfetto, veloce e senza percorsi duplicati.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Nessun Doppio Passaggio
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Ottimizzato per LightBurn
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Singoli Stroke Path
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
