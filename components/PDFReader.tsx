import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFState } from '../types';

interface Props {
  pdfData: ArrayBuffer;
  state: PDFState;
  onPagesLoaded: (num: number) => void;
}

const PDFReader = forwardRef(({ pdfData, state, onPagesLoaded }: Props, ref) => {
  const [loading, setLoading] = useState(false);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTasksRef = useRef<{ [key: number]: any }>({});
  const renderIdRef = useRef<number>(0);
  const renderedStateRef = useRef<{ [key: number]: { zoom: number; rotation: number } }>({});

  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const textLayerRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useImperativeHandle(ref, () => ({
    exportPage: (format: string = 'png') => {
      const canvas = canvasRefs.current[state.currentPage];
      if (!canvas) return;
      const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(mime, 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `page_${state.currentPage}.${format}`;
      link.click();
    },
    getFitZoom: async (containerWidth: number, containerHeight: number) => {
      if (!pdfDocRef.current) return { widthZoom: 1, heightZoom: 1 };
      const page = await pdfDocRef.current.getPage(state.currentPage);
      // Use standard scale 1 to get base dimensions
      const viewport = page.getViewport({ scale: 1, rotation: state.rotation });
      
      const widthDivider = state.viewMode === 'double' ? 2 : 1;
      // Subtract a small buffer for margins/scrollbars
      return {
        widthZoom: (containerWidth / widthDivider) / viewport.width,
        heightZoom: containerHeight / viewport.height
      };
    }
  }));

  // Initial Load Effect
  useEffect(() => {
    renderedStateRef.current = {};
    let active = true;
    let loadingTask: any = null;

    const loadPdf = async () => {
      setLoading(true);
      try {
        loadingTask = pdfjsLib.getDocument({ 
          data: pdfData.slice(0),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/standard_fonts/',
          verbosity: 0
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("PDF Load Timeout")), 15000)
        );

        const pdf = await Promise.race([loadingTask.promise, timeoutPromise]) as pdfjsLib.PDFDocumentProxy;
        
        if (!active) {
          pdf.destroy();
          return;
        }
        pdfDocRef.current = pdf;
        onPagesLoaded(pdf.numPages);
      } catch (error) {
        if (active) {
          console.error('Error loading PDF:', error);
          setLoading(false); 
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPdf();
    
    return () => {
      active = false;
      if (loadingTask && loadingTask.destroy) loadingTask.destroy();
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfData]);

  const highlightText = (textLayerDiv: HTMLDivElement, query: string, activeIndexOnPage: number | null) => {
    requestAnimationFrame(() => {
      const spans = Array.from(textLayerDiv.querySelectorAll('span'));
      
      if (!query) {
        spans.forEach(span => {
          if (span.querySelector('mark')) {
            span.textContent = span.textContent;
          }
        });
        return;
      }

      const lowerQuery = query.toLowerCase();
      const queryLen = query.length;
      let globalOccurrenceIdx = 0;
      let activeElement: HTMLElement | null = null;

      spans.forEach((span) => {
        const text = span.textContent || '';
        if (!text.toLowerCase().includes(lowerQuery)) return;

        const lowerText = text.toLowerCase();
        const nodes: Node[] = [];
        let start = 0;
        let pos = lowerText.indexOf(lowerQuery);

        while (pos !== -1) {
          if (pos > start) nodes.push(document.createTextNode(text.substring(start, pos)));
          const matchText = text.substring(pos, pos + queryLen);
          const mark = document.createElement('mark');
          mark.textContent = matchText;
          mark.className = 'search-highlight';
          if (activeIndexOnPage === globalOccurrenceIdx) {
            mark.classList.add('search-highlight-active');
            activeElement = mark;
          }
          nodes.push(mark);
          globalOccurrenceIdx++;
          start = pos + queryLen;
          pos = lowerText.indexOf(lowerQuery, start);
        }
        if (start < text.length) nodes.push(document.createTextNode(text.substring(start)));
        
        span.innerHTML = '';
        const fragment = document.createDocumentFragment();
        nodes.forEach(node => fragment.appendChild(node));
        span.appendChild(fragment);
      });

      if (activeElement) {
        (activeElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    });
  };

  const renderSinglePage = async (pageNum: number, renderId: number) => {
    if (!pdfDocRef.current || pageNum > state.numPages || pageNum < 1) return;
    
    const canvas = canvasRefs.current[pageNum];
    const textLayerDiv = textLayerRefs.current[pageNum];
    if (!canvas || !textLayerDiv) return;

    // Cancel any existing task for this page specifically (though we cleared all in useEffect, this is a safety check)
    if (renderTasksRef.current[pageNum]) {
      try { renderTasksRef.current[pageNum].cancel(); } catch (e) {}
    }

    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      if (renderId !== renderIdRef.current) return;

      const dpr = (window.devicePixelRatio || 1) * 2; // Double the DPR for sharper rendering
      const safeRotation = ((Math.round(state.rotation / 90) * 90) % 360 + 360) % 360;

      // 1. Calculate high-resolution viewport for Canvas (Device Pixels)
      const canvasViewport = page.getViewport({ scale: state.zoom * dpr, rotation: safeRotation });

      // 2. Calculate logical viewport for CSS / TextLayer (CSS Pixels)
      const cssWidth = canvasViewport.width / dpr;
      const cssHeight = canvasViewport.height / dpr;

      // 3. Set Canvas Dimensions (Integer Device Pixels)
      canvas.width = Math.floor(canvasViewport.width);
      canvas.height = Math.floor(canvasViewport.height);

      // 4. Set CSS Dimensions (CSS Pixels)
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      // 5. Prepare Text Layer
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = `${cssWidth}px`;
      textLayerDiv.style.height = `${cssHeight}px`;
      textLayerDiv.style.setProperty('--scale-factor', state.zoom.toString());

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      const textContentPromise = page.getTextContent();

      const renderTask = page.render({
        canvasContext: context,
        viewport: canvasViewport,
        intent: 'display',
        canvas: canvas as any 
      });
      renderTasksRef.current[pageNum] = renderTask;
      
      await renderTask.promise;
      if (renderId !== renderIdRef.current) return;

      const textContent = await textContentPromise;
      if (renderId !== renderIdRef.current) return;

      const textViewport = page.getViewport({ scale: state.zoom, rotation: safeRotation });

      // @ts-ignore
      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: textViewport
      });
      await textLayer.render();
      
      if (state.searchQuery) {
        const currentMatch = state.searchResults[state.currentSearchResultIndex];
        const activeIdx = (currentMatch && currentMatch.page === pageNum) ? currentMatch.occurrenceIndexOnPage : null;
        highlightText(textLayerDiv, state.searchQuery, activeIdx);
      }
    } catch (err: any) {
      // Ignore cancellations
    }
  };

  useEffect(() => {
    if (!pdfDocRef.current) return;
    
    // Cancel all pending render tasks from previous effect run
    Object.values(renderTasksRef.current).forEach(task => {
      try { task.cancel(); } catch(e) {}
    });
    renderTasksRef.current = {};

    const currentRenderId = ++renderIdRef.current;
    const pagesToRender = state.viewMode === 'double' 
      ? [state.currentPage, state.currentPage + 1].filter(p => p <= state.numPages)
      : [state.currentPage];

    // Render immediately without debounce for faster perceived performance
    Promise.all(pagesToRender.map(p => renderSinglePage(p, currentRenderId)));

  }, [state.currentPage, state.zoom, state.rotation, state.searchQuery, state.currentSearchResultIndex, state.viewMode, state.numPages]);

  const visiblePages = state.viewMode === 'double' 
    ? [state.currentPage, state.currentPage + 1].filter(p => p <= state.numPages)
    : [state.currentPage];

  return (
    <div className={`flex gap-4 items-center justify-center transition-all duration-300 min-h-full ${state.isDarkMode ? 'pdf-dark-mode' : ''}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] z-20 pointer-events-none">
          <div className="text-white mono text-xs tracking-widest bg-black/60 px-4 py-2 rounded animate-pulse uppercase border border-white/10 shadow-lg">
            Loading Document...
          </div>
        </div>
      )}
      
      {visiblePages.map(pageNum => (
        <div 
          key={pageNum}
          className="pdf-page-wrapper relative shadow-2xl border border-gray-500/10 bg-white group"
          style={{ 
            minWidth: '100px', 
            minHeight: '100px',
            paddingLeft: state.isBookMode && pageNum % 2 === 0 ? '24px' : '0',
            paddingRight: state.isBookMode && pageNum % 2 !== 0 ? '24px' : '0',
            transition: 'padding 0.3s ease'
          }}
        >
          <canvas 
            ref={el => { canvasRefs.current[pageNum] = el; }}
            className="block" 
          />
          <div 
            ref={el => { textLayerRefs.current[pageNum] = el; }}
            className="textLayer" 
          />
          {state.viewMode === 'double' && (
            <div className="absolute -bottom-6 left-0 right-0 text-center mono text-[10px] opacity-30 font-bold uppercase tracking-widest pointer-events-none">
              Page {pageNum}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

export default PDFReader;