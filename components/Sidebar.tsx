import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFState } from '../types';

interface Props {
  isOpen: boolean;
  fileData: Uint8Array | null;
  state: PDFState;
  toc?: any[];
  onPageSelect: (p: number) => void;
  onTocSelect: (cfi: string) => void;
  onReorder: (from: number, to: number) => void;
  isDarkMode: boolean;
}

const ThumbnailItem: React.FC<{
  index: number;
  pdfData: Uint8Array;
  isActive: boolean;
  onClick: () => void;
  isDarkMode: boolean;
}> = ({ index, pdfData, isActive, onClick, isDarkMode }) => {
  const [thumb, setThumb] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !rendered.current) {
        renderThumb();
      }
    }, { threshold: 0.1 });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pdfData]);

  const renderThumb = async () => {
    rendered.current = true;
    try {
      const loadingTask = pdfjsLib.getDocument({ 
        data: pdfData.slice(0),
        cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
        cMapPacked: true,
        verbosity: 0 
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(index + 1);
      
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: 0.2 * dpr }); 
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ 
          canvasContext: context, 
          viewport,
          intent: 'display',
          canvas: canvas as any
        }).promise;
        setThumb(canvas.toDataURL('image/jpeg', 0.8));
      }
      pdf.destroy();
    } catch (err) {
      // Silent fail
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={onClick}
      className={`group relative p-3 rounded-sm cursor-pointer transition-all flex items-center gap-4 border-l-2 ${
        isActive 
        ? (isDarkMode ? 'bg-blue-500/10 border-blue-500 text-blue-100' : 'bg-blue-500/10 border-blue-600 text-blue-800') 
        : `border-transparent hover:bg-black/5 dark:hover:bg-white/5 ${isDarkMode ? 'text-gray-400 opacity-60 hover:opacity-100' : 'text-gray-600 opacity-70 hover:opacity-100'}`
      }`}
    >
      <div className="w-16 h-24 bg-gray-500/5 rounded-sm overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-500/10">
        {thumb ? (
          <img src={thumb} alt={`P${index+1}`} className="w-full h-full object-contain" />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-500/10">
             <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin opacity-50"></div>
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="mono text-lg font-bold opacity-80">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

const TocItem: React.FC<{
  item: any;
  onSelect: (cfi: string) => void;
  isDarkMode: boolean;
  level?: number;
}> = ({ item, onSelect, isDarkMode, level = 0 }) => {
  return (
    <div className="flex flex-col">
      <div 
        onClick={() => onSelect(item.href)}
        className={`p-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {item.label}
      </div>
      {item.subitems && item.subitems.length > 0 && (
        <div>
          {item.subitems.map((sub: any, idx: number) => (
            <TocItem key={idx} item={sub} onSelect={onSelect} isDarkMode={isDarkMode} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<Props> = ({ isOpen, fileData, state, toc, onPageSelect, onTocSelect, isDarkMode }) => {
  if (!isOpen) return null;

  return (
    <div className={`w-64 h-full border-r border-gray-700/30 overflow-y-auto no-scrollbar flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-[#16161e] text-[#a9b1d6]' : 'bg-gray-50 text-gray-800'}`}>
      <div className={`p-4 border-b font-mono text-[10px] uppercase tracking-widest opacity-60 flex justify-between ${isDarkMode ? 'border-gray-700/20' : 'border-gray-300/40'}`}>
        <span>{state.fileType === 'epub' ? 'Table of Contents' : 'Pages'}</span>
        {state.fileType === 'pdf' && <span className="font-bold">{state.currentPage} / {state.numPages}</span>}
      </div>
      <div className="flex-1 p-2 space-y-1">
        {state.fileType === 'pdf' && fileData && Array.from({ length: state.numPages }).map((_, idx) => (
          <ThumbnailItem 
            key={idx}
            index={idx}
            pdfData={fileData}
            isActive={state.currentPage === idx + 1}
            isDarkMode={isDarkMode}
            onClick={() => onPageSelect(idx + 1)}
          />
        ))}
        {state.fileType === 'epub' && toc && toc.map((item, idx) => (
          <TocItem 
            key={idx}
            item={item}
            onSelect={onTocSelect}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;