import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface Props {
  index: number;
  pdfData: Uint8Array;
  isActive: boolean;
  onClick: () => void;
  isDarkMode: boolean;
  scale?: number;
  className?: string;
}

const ThumbnailItem: React.FC<Props> = ({ index, pdfData, isActive, onClick, isDarkMode, scale = 0.2, className = "" }) => {
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
      const viewport = page.getViewport({ scale: scale * dpr }); 
      
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
      className={`group relative rounded-sm cursor-pointer transition-all flex flex-col items-center gap-2 ${className} ${
        isActive 
        ? (isDarkMode ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'ring-2 ring-blue-600 bg-blue-500/10') 
        : `hover:bg-black/5 dark:hover:bg-white/5`
      }`}
    >
      <div className="w-full aspect-[1/1.4] bg-gray-500/5 rounded-sm overflow-hidden flex items-center justify-center shadow-sm border border-gray-500/10 relative">
        {thumb ? (
          <img src={thumb} alt={`P${index+1}`} className={`w-full h-full object-contain ${isDarkMode ? 'filter invert-[0.9] hue-rotate-180 contrast-[0.9] brightness-[1.1]' : ''}`} />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-500/10">
             <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin opacity-50"></div>
          </div>
        )}
      </div>
      <span className={`font-mono text-xs font-bold opacity-60 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {index + 1}
      </span>
    </div>
  );
};

export default ThumbnailItem;
