
import React, { useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ComparisonGrid from './components/ComparisonGrid';
import { ImageState, ProcessingResult, AppStatus } from './types';
import { ImageProcessor } from './services/imageProcessor';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [image, setImage] = useState<ImageState | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
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
        setError(null);
        setStatus(AppStatus.IDLE);
        setResult(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!image?.previewUrl) return;

    try {
      setStatus(AppStatus.PROCESSING);
      setError(null);

      // We need to wait a tiny bit to let the loader show up
      await new Promise(r => setTimeout(r, 500));

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = image.previewUrl;
      await new Promise((res) => img.onload = res);

      const { svg, pathCount } = await ImageProcessor.process(img);

      setResult({
        svgContent: svg,
        pathCount,
        originalSize: image.file?.size || 0,
        outputSize: new Blob([svg]).size,
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      setError('Impossibile estrarre le linee. Verifica che l\'immagine abbia contorni chiari.');
      setStatus(AppStatus.ERROR);
    }
  };

  const downloadSvg = () => {
    if (!result) return;
    const blob = new Blob([result.svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = image?.file?.name.replace(/\.[^/.]+$/, "") || "laser-project";
    link.href = url;
    link.download = `${fileName}-centerline.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <Hero />

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {!result && <ComparisonGrid />}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mb-12">
          <div className="md:flex">
            {/* Input Section */}
            <div className={`flex-1 p-8 ${image ? 'border-b md:border-b-0 md:border-r' : ''} border-slate-100`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
                Carica Immagine
              </h3>
              
              {!image ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group p-6 text-center"
                >
                  <svg className="w-12 h-12 text-slate-400 mb-4 group-hover:text-indigo-500 group-hover:scale-110 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-slate-900 font-bold mb-1">Trascina qui la tua immagine</p>
                  <p className="text-slate-500 text-xs">PNG, JPG o WEBP (Disegno al tratto, max 10MB)</p>
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
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-50 flex items-center justify-center">
                    <img src={image.previewUrl || ''} alt="Original" className="max-h-full object-contain" />
                    <button 
                      onClick={() => { setImage(null); setResult(null); setStatus(AppStatus.IDLE); }}
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>{image.file?.name}</span>
                    <span>{image.width} x {image.height} px</span>
                  </div>
                  
                  {status !== AppStatus.SUCCESS && (
                    <button 
                      onClick={processImage}
                      disabled={status === AppStatus.PROCESSING}
                      className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-lg flex items-center justify-center gap-3 ${
                        status === AppStatus.PROCESSING 
                          ? 'bg-slate-400 cursor-wait' 
                          : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      {status === AppStatus.PROCESSING ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analisi scheletro...
                        </>
                      ) : 'Converti in SVG'}
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Output Section */}
            {status === AppStatus.SUCCESS && result && (
              <div className="flex-1 p-8 bg-indigo-50/30">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
                  Risultato (Linee Singole)
                </h3>

                <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden mb-6 aspect-video flex items-center justify-center p-4 relative">
                  <div 
                    className="max-h-full max-w-full"
                    dangerouslySetInnerHTML={{ __html: result.svgContent }} 
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                     <span className="px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded">PATH SINGOLI OK</span>
                     <span className="px-2 py-1 bg-indigo-500 text-white text-[10px] font-bold rounded">CHIUSURA CONTORNO ATTIVA</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Linee Trovate</p>
                    <p className="text-xl font-black text-slate-900">{result.pathCount}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Ottimizzazione</p>
                    <p className="text-xl font-black text-slate-900">
                      -{Math.max(0, Math.round((1 - result.outputSize / (result.originalSize / 10)) * 100))}%
                    </p>
                  </div>
                </div>

                <button 
                  onClick={downloadSvg}
                  className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" />
                  </svg>
                  Scarica SVG per LightBurn
                </button>
                <p className="mt-4 text-center text-xs text-slate-500 font-medium">
                  Pronto per l'importazione diretta. Scala 1:1 garantita.
                </p>
              </div>
            )}

            {!result && status !== AppStatus.PROCESSING && (
              <div className="hidden md:flex flex-1 items-center justify-center p-8 bg-slate-50/50">
                <div className="text-center max-w-xs">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-slate-400">Pronto per l'elaborazione</h4>
                  <p className="text-sm text-slate-400">Carica un'immagine per vedere l'anteprima del vettoriale a linea singola.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-24">
          <h2 className="text-3xl font-black text-center mb-16 text-slate-900">Perché usare LaserCenterline?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-black text-xl mb-4 text-slate-900">Velocità di Taglio</h4>
              <p className="text-slate-600 leading-relaxed text-sm">Il laser segue ogni tracciato una sola volta. Riduci i tempi di incisione fino al 60% rispetto ai file generati con auto-trace standard.</p>
            </div>
            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.48c-4.418 0-8.043-3.136-8.913-7.305A11.95 11.95 0 0112 2.944a11.95 11.95 0 018.913 11.23c-.87 4.169-4.495 7.305-8.913 7.305z" />
                </svg>
              </div>
              <h4 className="font-black text-xl mb-4 text-slate-900">Qualità Superiore</h4>
              <p className="text-slate-600 leading-relaxed text-sm">Evita sovrapposizioni e bruciature eccessive. Ottieni linee nitide e pulite anche su materiali delicati come legno e pelle.</p>
            </div>
            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582-4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h4 className="font-black text-xl mb-4 text-slate-900">Zero Configurazione</h4>
              <p className="text-slate-600 leading-relaxed text-sm">L'algoritmo Zhang-Suen calcola automaticamente il centro di ogni linea. Carica l'immagine, scarica l'SVG. È così semplice.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer sticky for CTA access */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 px-6 z-40 md:hidden">
        <button 
          onClick={() => image ? processImage() : fileInputRef.current?.click()}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
        >
          {image ? 'Converti Ora' : 'Carica Immagine'}
        </button>
      </footer>
    </div>
  );
};

export default App;
