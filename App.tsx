
import React, { useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import PreviewPanel from './components/PreviewPanel';
import { ImageState, ProcessingResult, AppStatus, ProcessingStats } from './types';
import { ImageProcessor } from './services/imageProcessor';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [image, setImage] = useState<ImageState | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setError('Formato non supportato. Carica PNG, JPG o WEBP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File troppo grande (Max 10MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage({
          file,
          previewUrl: event.target?.result as string,
          width: img.width,
          height: img.height,
        });
        setImageElement(img);
        setError(null);
        setStatus(AppStatus.IDLE);
        setResult(null);
        setShowPreview(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewConfirm = (res: ProcessingResult) => {
    setResult(res);
    setStats(res.stats);
    setStatus(AppStatus.SUCCESS);
    setShowPreview(false);
  };

  const downloadSvgLayer = (svg: string, suffix: string) => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = image?.file?.name.replace(/\.[^/.]+$/, "") || "laser-project";
    link.href = url;
    link.download = `${fileName}_${suffix}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pb-24 bg-[#FBC05D]">
      <Header />
      <Hero />

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {/* Preview Panel - shown after image upload */}
        {showPreview && !result && (
          <PreviewPanel
            imageElement={imageElement}
            onConfirm={handlePreviewConfirm}
          />
        )}

        <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#5D3A1A]/10 shadow-2xl overflow-hidden mb-12">
          <div className="md:flex">
            {/* Input Section */}
            <div className={`flex-1 p-8 ${image ? 'border-b md:border-b-0 md:border-r' : ''} border-[#5D3A1A]/10`}>
              <h3 className="text-xl font-black text-[#5D3A1A] mb-6 flex items-center gap-3 uppercase tracking-tighter">
                <span className="w-8 h-8 rounded-xl bg-[#5D3A1A] text-[#FBC05D] text-sm flex items-center justify-center">1</span>
                Carica Disegno
              </h3>

              {!image ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[500px] bg-[#FBC05D]/5 border-2 border-dashed border-[#5D3A1A]/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#5D3A1A] hover:bg-[#FBC05D]/10 transition-all group p-6 text-center"
                >
                  <svg className="w-16 h-16 text-[#5D3A1A]/30 mb-4 group-hover:text-[#5D3A1A] group-hover:scale-110 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-[#5D3A1A] font-black text-lg mb-1">Trascina qui l'immagine</p>
                  <p className="text-[#5D3A1A]/60 text-xs font-bold uppercase tracking-widest">PNG, JPG o WEBP (Max 10MB)</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative group rounded-2xl overflow-hidden border border-[#5D3A1A]/10 h-[500px] bg-slate-50 flex items-center justify-center">
                    <img src={image.previewUrl || ''} alt="Original" className="max-h-full max-w-full object-contain" />
                    <button
                      onClick={() => { setImage(null); setResult(null); setStatus(AppStatus.IDLE); }}
                      className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#5D3A1A]/50 uppercase tracking-widest">
                    <span>{image.file?.name}</span>
                    <span>{image.width} x {image.height} px</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm font-bold">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Output Section */}
            {status === AppStatus.SUCCESS && result && (
              <div className="flex-1 p-8 bg-[#5D3A1A]/5">
                <h3 className="text-xl font-black text-[#5D3A1A] mb-6 flex items-center gap-3 uppercase tracking-tighter">
                  <span className="w-8 h-8 rounded-xl bg-[#5D3A1A] text-[#FBC05D] text-sm flex items-center justify-center">2</span>
                  Pronto per il Laser
                </h3>

                <div className="bg-white rounded-2xl border border-[#5D3A1A]/10 shadow-inner overflow-hidden mb-6 h-[500px] flex items-center justify-center p-4 relative">
                  <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{
                      __html: result.svgContent
                        .replace(/width="[^"]*"/, 'width="100%"')
                        .replace(/height="[^"]*"/, 'height="100%"')
                    }}
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-green-600 text-white text-[10px] font-black rounded uppercase tracking-tighter">Vettoriale OK</span>
                    <span className="px-3 py-1 bg-[#5D3A1A] text-white text-[10px] font-black rounded uppercase tracking-tighter">Multi-Layer</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-white rounded-xl border border-[#5D3A1A]/10 text-center shadow-sm">
                    <p className="text-[10px] font-black text-green-700 uppercase mb-1 flex items-center justify-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-200"></span> Taglio
                    </p>
                    <p className="text-2xl font-black text-[#5D3A1A]">{result.stats?.outlineCount || 0}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#5D3A1A]/10 text-center shadow-sm">
                    <p className="text-[10px] font-black text-blue-700 uppercase mb-1 flex items-center justify-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></span> Incisione
                    </p>
                    <p className="text-2xl font-black text-[#5D3A1A]">{result.stats?.centerlineCount || 0}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => downloadSvgLayer(result.svgCut, 'taglio')}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
                  >
                    ✂️ Scarica Solo Taglio (Verde)
                  </button>
                  <button
                    onClick={() => downloadSvgLayer(result.svgEngrave, 'incisione')}
                    disabled={result.stats?.centerlineCount === 0}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0"
                  >
                    ✏️ Scarica Solo Incisione (Blu)
                  </button>
                  <button
                    onClick={() => downloadSvgLayer(result.svgContent, 'completo')}
                    className="w-full py-5 bg-[#5D3A1A] hover:bg-black text-[#FBC05D] rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
                  >
                    📥 Scarica File Completo
                  </button>
                </div>
                <p className="mt-6 text-center text-[10px] text-[#5D3A1A]/40 font-black uppercase tracking-[0.2em]">
                  Ottimizzato per Laboratorio GB
                </p>
              </div>
            )}

            {!result && status !== AppStatus.PROCESSING && (
              <div className="hidden md:flex flex-1 items-center justify-center p-8 bg-[#5D3A1A]/5">
                <div className="text-center max-w-xs">
                  <div className="w-20 h-20 bg-[#FBC05D]/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#5D3A1A]/20">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="font-black text-[#5D3A1A] text-xl uppercase tracking-tighter mb-2">Pronto?</h4>
                  <p className="text-sm text-[#5D3A1A]/60 font-bold">Carica un file per iniziare l'ottimizzazione del tracciato.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer sticky for CTA access */}
      {!showPreview && (
        <footer className="fixed bottom-0 left-0 right-0 bg-[#5D3A1A] border-t border-[#FBC05D]/20 py-5 px-6 z-40 md:hidden">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-[#FBC05D] text-[#5D3A1A] font-black py-4 rounded-xl shadow-xl active:scale-95 transition-transform uppercase tracking-widest"
          >
            Carica Immagine
          </button>
        </footer>
      )}
    </div>
  );
};

export default App;
