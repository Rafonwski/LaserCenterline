
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-2 px-4 md:px-8 border-b border-[#5D3A1A]/10 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo_gb_simple.png" alt="Cornici GB" className="h-16 w-auto" />
          <h1 className="text-2xl font-black tracking-tighter text-[#5D3A1A] uppercase">Cornici GB</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
