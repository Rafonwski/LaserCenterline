
import React from 'react';

const ComparisonGrid: React.FC = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8 mb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">X</div>
          <h3 className="font-bold text-slate-900">Trace Standard (Outline)</h3>
        </div>
        <div className="aspect-square bg-slate-50 rounded-xl mb-4 overflow-hidden border border-slate-100 flex items-center justify-center relative">
          <svg className="w-24 h-24" viewBox="0 0 100 100">
            {/* Simulation of double lines */}
            <path d="M20,20 L80,20 L80,22 L22,22 L22,80 L20,80 Z" fill="none" stroke="#ef4444" strokeWidth="0.5" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 p-3 bg-red-50 text-[10px] font-bold text-red-800 border-t border-red-100 text-center">
            PROBLEMA: Due linee per ogni tratto (bordo sx + dx)
          </div>
        </div>
        <p className="text-xs text-slate-500 italic text-center">Incisione doppia, tempi lunghi, risultato impreciso.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border-2 border-indigo-600 shadow-lg shadow-indigo-100 relative">
        <div className="absolute -top-3 right-6 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase">Consigliato</div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
          <h3 className="font-bold text-slate-900">LaserCenterline (Single Path)</h3>
        </div>
        <div className="aspect-square bg-indigo-50 rounded-xl mb-4 overflow-hidden border border-indigo-100 flex items-center justify-center relative">
          <svg className="w-24 h-24" viewBox="0 0 100 100">
            {/* Simulation of single line */}
            <path d="M21,21 L80,21 M21,21 L21,80" fill="none" stroke="#4f46e5" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 p-3 bg-indigo-600 text-[10px] font-bold text-white text-center">
            SOLUZIONE: Linea singola centrale (Centerline)
          </div>
        </div>
        <p className="text-xs text-slate-500 italic text-center">Taglio laser pulito, velocità massima, zero duplicazioni.</p>
      </div>
    </div>
  );
};

export default ComparisonGrid;
