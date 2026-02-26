import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFState } from '../types';

interface Props {
  pdfData: ArrayBuffer;
  state: PDFState;
  onPagesLoaded: (num: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const PDFReader = forwardRef(({ pdfData, state, onPagesLoaded, onLoadingChange }: Props, ref) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (onLoadingChange) onLoadingChange(loading);
  }, [loading, onLoadingChange]);
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

    // Fast Path Caching: If the page is already rendered with the EXACT same zoom and rotation, skip rendering immediately.
    const cached = renderedStateRef.current[pageNum];
    if (cached && cached.zoom === state.zoom && cached.rotation === state.rotation && !state.searchQuery) {
      // However, if there IS a search query, we still need to render the text layer for highlighting.
      return;
    }

    // Cancel any existing task for this page specifically
    if (renderTasksRef.current[pageNum]) {
      try { renderTasksRef.current[pageNum].cancel(); } catch (e) { }
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

      // Save to cache after successful mathematical render
      renderedStateRef.current[pageNum] = { zoom: state.zoom, rotation: state.rotation };

      if (state.searchQuery) {
        const currentMatch = state.searchResults[state.currentSearchResultIndex];
        const activeIdx = (currentMatch && currentMatch.page === pageNum) ? currentMatch.occurrenceIndexOnPage : null;
        highlightText(textLayerDiv, state.searchQuery, activeIdx);
      }
    } catch (err: any) {
      // Ignore cancellations
    }
  };

  const getVisiblePages = () => state.viewMode === 'double'
    ? [state.currentPage, state.currentPage + 1].filter(p => p <= state.numPages)
    : [state.currentPage];

  useEffect(() => {
    if (!pdfDocRef.current) return;

    // We intentionally DO NOT cancel rendering tasks anymore unless the zoom/rotation changed massively
    // Tasks cancel themselves only on a per-page basis above if invoked.

    const currentRenderId = ++renderIdRef.current;
    const visiblePages = getVisiblePages();

    // Create an expanded "targetPages" window for off-screen pre-rendering (1-2 pages before, 2-4 pages ahead)
    const PRE_RENDER_WINDOW = 2;
    let startPage = Math.max(1, state.currentPage - PRE_RENDER_WINDOW);
    let endPage = Math.min(state.numPages, state.currentPage + (state.viewMode === 'double' ? 1 : 0) + PRE_RENDER_WINDOW);

    const targetPages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      targetPages.push(i);
    }

    // Explicitly cancel tasks for pages that we've jumped past so they don't clog PDF.js worker
    Object.keys(renderTasksRef.current).forEach(pageNumStr => {
      const pageNum = parseInt(pageNumStr);
      if (!targetPages.includes(pageNum)) {
        try { renderTasksRef.current[pageNum].cancel(); } catch (e) { }
        delete renderTasksRef.current[pageNum];
      }
    });

    // Render immediately without debounce. The invisible pages will be processed by pdf.js transparently.
    Promise.all(targetPages.map(p => renderSinglePage(p, currentRenderId)));

  }, [state.currentPage, state.zoom, state.rotation, state.searchQuery, state.currentSearchResultIndex, state.viewMode, state.numPages]);

  const visiblePagesList = getVisiblePages();

  // Create an expanded array containing cached pages to maintain in the DOM loop (prevents unmounting lag)
  const CACHE_WINDOW = 3;
  let domStart = Math.max(1, state.currentPage - CACHE_WINDOW);
  let domEnd = Math.min(state.numPages, state.currentPage + (state.viewMode === 'double' ? 1 : 0) + CACHE_WINDOW);

  const domPages: number[] = [];
  for (let i = domStart; i <= domEnd; i++) {
    domPages.push(i);
  }

  return (
    <div className={`m-auto flex gap-4 transition-all duration-300 ${state.isDarkMode ? 'pdf-dark-mode' : ''}`}>
      {domPages.map(pageNum => {
        const isVisible = visiblePagesList.includes(pageNum);
        return (
          <div
            key={pageNum}
            className="pdf-page-wrapper relative shadow-2xl border border-gray-500/10 bg-white group"
            style={{
              display: isVisible ? 'block' : 'none',
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
        );
      })}
    </div>
  );
});

export default PDFReader;