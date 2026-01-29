
import React, { useState, useEffect } from 'react';
import { ProcessingParams, ProcessingStats, ProcessingResult } from '../types';
import { ImageProcessor } from '../services/imageProcessor';

interface PreviewPanelProps {
    imageElement: HTMLImageElement | null;
    onConfirm: (result: ProcessingResult) => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ imageElement, onConfirm }) => {
    // Simplified State: Only 2 main sliders
    const [params, setParams] = useState<ProcessingParams>({
        detailLevel: 50,          // 0-100
        centerlineSensitivity: 50,// 0-100
        smoothingLevel: 3         // Hidden / Default
    });

    const [appliedParams, setAppliedParams] = useState<ProcessingParams | null>(null);
    const [result, setResult] = useState<ProcessingResult | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial setup
    useEffect(() => {
        if (!imageElement) return;
        generatePreview(params);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageElement]);

    const generatePreview = async (paramsToUse: ProcessingParams) => {
        if (!imageElement) return;
        setIsGenerating(true);
        try {
            const res = await ImageProcessor.preview(imageElement, paramsToUse);
            setResult(res);
            setAppliedParams(paramsToUse);
        } catch (error) {
            console.error('Preview generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdatePreview = () => {
        generatePreview(params);
    };

    const downloadSvg = (svg: string, suffix: string) => {
        if (!svg) return;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laser_output_${suffix}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Helper to detect changes
    const isDirty = !appliedParams ||
        params.detailLevel !== appliedParams.detailLevel ||
        params.centerlineSensitivity !== appliedParams.centerlineSensitivity;

    if (!imageElement) return null;

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-[#5D3A1A]/10 shadow-2xl overflow-hidden mb-8">
            <div className="bg-[#5D3A1A] px-6 py-5 flex justify-between items-center">
                <h3 className="text-[#FBC05D] font-black text-lg flex items-center gap-3 uppercase tracking-tighter">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Parametri di Taglio
                </h3>
            </div>

            <div className="md:flex">
                {/* Controls Panel */}
                <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-[#5D3A1A]/10 flex flex-col justify-center">

                    {/* PRIMARY SLIDER: Detail Level */}
                    <div className="mb-10">
                        <label className="flex items-center justify-between mb-3">
                            <span className="text-lg font-black text-[#5D3A1A] uppercase tracking-tighter">Livello Dettaglio</span>
                            <span className="text-xs font-black text-[#FBC05D] bg-[#5D3A1A] px-3 py-1 rounded-full">
                                {params.detailLevel}%
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={params.detailLevel}
                            onChange={(e) => setParams({ ...params, detailLevel: parseInt(e.target.value) })}
                            className="w-full h-3 bg-[#5D3A1A]/10 rounded-lg appearance-none cursor-pointer accent-[#5D3A1A] mb-2"
                        />
                        <div className="flex justify-between text-[10px] text-[#5D3A1A]/40 font-black uppercase tracking-widest">
                            <span>Solo Esterno</span>
                            <span>Tutti i Dettagli</span>
                        </div>
                        <p className="text-xs text-[#5D3A1A]/60 mt-4 leading-relaxed font-bold">
                            Regola la complessità. <b className="text-[#5D3A1A]">0%</b> solo contorno, <b className="text-[#5D3A1A]">100%</b> tracciamento totale.
                        </p>
                    </div>

                    {/* SECONDARY SLIDER: Centerline Sensitivity */}
                    <div className="mb-8 p-5 bg-[#FBC05D]/5 rounded-2xl border border-[#5D3A1A]/5">
                        <label className="flex items-center justify-between mb-3">
                            <span className="text-sm font-black text-[#5D3A1A] uppercase tracking-tighter">Sensibilità Centerline</span>
                            <span className="text-xs font-black text-[#5D3A1A] bg-white px-2 py-1 rounded border border-[#5D3A1A]/10">
                                {params.centerlineSensitivity}%
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={params.centerlineSensitivity}
                            onChange={(e) => setParams({ ...params, centerlineSensitivity: parseInt(e.target.value) })}
                            className="w-full h-2 bg-[#5D3A1A]/10 rounded-lg appearance-none cursor-pointer accent-[#5D3A1A]"
                        />
                        <div className="flex justify-between mt-2 text-[9px] text-[#5D3A1A]/30 font-black uppercase tracking-tighter italic">
                            <span>Outline Doppie</span>
                            <span>Linee Singole</span>
                        </div>
                    </div>

                    {/* Update Button */}
                    <button
                        onClick={handleUpdatePreview}
                        disabled={!isDirty || isGenerating}
                        className={`w-full py-5 rounded-xl font-black text-lg shadow-xl transform transition-all duration-200 flex items-center justify-center gap-3 uppercase tracking-widest
                            ${isDirty
                                ? 'bg-[#5D3A1A] text-[#FBC05D] hover:bg-black hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                    >
                        {isGenerating ? (
                            <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            isDirty ? '🔄 Aggiorna Anteprima' : 'Anteprima OK'
                        )}
                    </button>

                </div>

                {/* Preview Area */}
                <div className="flex-1 bg-[#5D3A1A]/5 p-6 flex flex-col items-center justify-center min-h-[500px]">
                    {result ? (
                        <div className="relative w-full h-full flex flex-col items-center">
                            <div
                                className="w-full flex-grow bg-white rounded-2xl shadow-inner border border-[#5D3A1A]/10 p-6 overflow-hidden flex items-center justify-center relative min-h-[400px]"
                                dangerouslySetInnerHTML={{
                                    __html: result.svgContent.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"')
                                }}
                            />

                            {/* Legend */}
                            <div className="flex gap-6 mt-6 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 rounded-md bg-green-600 border border-green-700 shadow-sm shadow-green-100"></div>
                                    <span className="text-[10px] font-black text-[#5D3A1A] uppercase tracking-widest">Taglio (Verde)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 rounded-md bg-blue-600 border border-blue-700 shadow-sm shadow-blue-100"></div>
                                    <span className="text-[10px] font-black text-[#5D3A1A] uppercase tracking-widest">Incisione (Blu)</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-[#5D3A1A]/40 flex flex-col items-center">
                            <svg className="animate-spin h-10 w-10 text-[#5D3A1A] mb-4 opacity-20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="font-bold uppercase tracking-widest text-xs">Elaborazione in corso...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Final Confirmation Section */}
            <div className="bg-[#5D3A1A]/10 px-8 py-6 border-t border-[#5D3A1A]/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-[#5D3A1A]/60 text-xs font-bold uppercase tracking-widest">
                    {result && (
                        <span>Ottimizzazione Completata</span>
                    )}
                </div>
                <button
                    onClick={() => result && onConfirm(result)}
                    disabled={!result || isGenerating}
                    className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-xl font-black shadow-xl shadow-green-100 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:bg-slate-300 disabled:shadow-none min-w-[250px] uppercase tracking-widest"
                >
                    {isGenerating ? 'Calcolo...' : '✅ Genera File Finali'}
                </button>
            </div>
        </div>
    );
};

export default PreviewPanel;
