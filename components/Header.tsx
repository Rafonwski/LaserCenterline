
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-6 px-4 md:px-8 border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">LaserCenterline</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Pro SVG Optimization</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Guida</a>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Compatibilità</a>
          <button className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-slate-800 transition-all shadow-sm">
            Dona
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
