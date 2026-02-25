import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Global cache for the current PDF document to avoid re-parsing for every thumbnail
let cachedPdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
let cachedPdfData: Uint8Array | null = null;

// Global cache for rendered thumbnails: key is `${pageIndex}-${scale}`
const thumbnailCache = new Map<string, string>();

// Queue for rendering thumbnails sequentially to avoid freezing the UI
const renderQueue: Array<{ priority: number, task: () => Promise<void> }> = [];
let isRendering = false;

const processQueue = async () => {
  if (isRendering || renderQueue.length === 0) return;
  isRendering = true;
  while (renderQueue.length > 0) {
    // Sort by priority (higher priority first)
    renderQueue.sort((a, b) => b.priority - a.priority);
    const { task } = renderQueue.shift()!;
    try {
      await task();
    } catch (e) {
      // Ignore errors in individual tasks
    }
    // Small delay to yield to main thread
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  isRendering = false;
};

const getPdfDoc = async (pdfData: Uint8Array) => {
  if (cachedPdfData === pdfData && cachedPdfDoc) {
    return cachedPdfDoc;
  }
  
  if (cachedPdfDoc) {
    try { cachedPdfDoc.destroy(); } catch (e) {}
    thumbnailCache.clear();
    renderQueue.length = 0; // Clear queue for old PDF
  }
  
  cachedPdfData = pdfData;
  const loadingTask = pdfjsLib.getDocument({ 
    data: pdfData.slice(0),
    cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    verbosity: 0 
  });
  cachedPdfDoc = await loadingTask.promise;
  return cachedPdfDoc;
};

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
  const cacheKey = `${index}-${scale}`;
  const [thumb, setThumb] = useState<string | null>(() => {
    return cachedPdfData === pdfData ? (thumbnailCache.get(cacheKey) || null) : null;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const isQueued = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => { 
      isMounted.current = false; 
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (cachedPdfData !== pdfData) {
      setThumb(null);
      isQueued.current = false;
    }
  }, [pdfData]);

  useEffect(() => {
    // If we already have it in cache for the current PDF, no need to observe
    if (cachedPdfData === pdfData && thumbnailCache.has(cacheKey)) {
      setThumb(thumbnailCache.get(cacheKey)!);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isQueued.current) {
        // Double check cache before queuing
        if (cachedPdfData === pdfData && thumbnailCache.has(cacheKey)) {
          setThumb(thumbnailCache.get(cacheKey)!);
          return;
        }

        isQueued.current = true;
        // Add to render queue
        renderQueue.push({
          priority: isActive ? 10 : 1, // Prioritize active page
          task: async () => {
            if (!isMounted.current) return;
            if (cachedPdfData === pdfData && thumbnailCache.has(cacheKey)) {
              setThumb(thumbnailCache.get(cacheKey)!);
              return;
            }
            await renderThumb();
          }
        });
        processQueue();
      }
    }, { threshold: 0.1, rootMargin: '200px' }); // Load slightly before coming into view

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pdfData, index, scale, isActive]);

  const renderThumb = async () => {
    try {
      const pdf = await getPdfDoc(pdfData);
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
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        thumbnailCache.set(cacheKey, dataUrl);
        
        if (isMounted.current) {
          // Debounce the state update to prevent rapid re-renders
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => {
            if (isMounted.current) setThumb(dataUrl);
          }, 50);
        }
      }
    } catch (err) {
      // Silent fail
    } finally {
      isQueued.current = false;
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
