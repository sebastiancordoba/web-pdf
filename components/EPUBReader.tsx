
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ePub from 'epubjs';
import { PDFState } from '../types';

interface Props {
  epubData: ArrayBuffer;
  state: PDFState;
  onTocLoaded: (toc: any[]) => void;
  onLocationChange: (loc: any) => void;
  onLocationsReady?: (total: number) => void;
}

const EPUBReader = forwardRef(({ epubData, state, onTocLoaded, onLocationChange, onLocationsReady }: Props, ref) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    next: () => renditionRef.current?.next(),
    prev: () => renditionRef.current?.prev(),
    goTo: (cfi: string) => renditionRef.current?.display(cfi),
    goToPercentage: (percent: number) => {
      if (bookRef.current) {
        const cfi = bookRef.current.locations.cfiFromPercentage(percent);
        renditionRef.current?.display(cfi);
      }
    }
  }));

  useEffect(() => {
    if (!viewerRef.current || !epubData) return;

    const book = ePub(epubData);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      manager: 'default',
    });
    renditionRef.current = rendition;

    rendition.display();

    book.loaded.navigation.then((nav) => {
      onTocLoaded(nav.toc);
    });

    rendition.on('relocated', (location: any) => {
      onLocationChange(location);
    });

    book.ready.then(() => {
      // Generate locations for progress bar
      // This might be heavy for large books, so we do it async
      book.locations.generate(1000).then(() => {
        if (onLocationsReady) {
          onLocationsReady(book.locations.total);
        }
      });
    });

    return () => {
      if (bookRef.current) {
        bookRef.current.destroy();
      }
      renditionRef.current = null;
    };
  }, [epubData]);

  useEffect(() => {
    const handleResize = () => {
      if (renditionRef.current) {
        try {
          renditionRef.current.resize();
        } catch (e) {
          // Ignore resize errors
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (renditionRef.current) {
      setTimeout(() => {
        if (renditionRef.current) {
          try {
            renditionRef.current.resize();
          } catch (e) {
            // Ignore resize errors
          }
        }
      }, 300); // Wait for sidebar transition
    }
  }, [state.isSidebarOpen]);

  useEffect(() => {
    if (renditionRef.current) {
      const styles = {
        body: {
          'background-color': state.isDarkMode ? '#1a1b26 !important' : '#ffffff !important',
          'color': state.isDarkMode ? '#a9b1d6 !important' : '#000000 !important',
          'font-family': 'Inter, sans-serif !important',
          'line-height': '1.6 !important',
          'padding': '0 2px !important',
        },
        'img': {
          'max-width': '100% !important',
          'height': 'auto !important',
          'object-fit': 'contain',
        },
        'svg': {
          'max-width': '100% !important',
          'height': 'auto !important',
        },
        'p': {
          'text-align': 'justify !important',
          'max-width': '100% !important',
        },
        'div': {
          'max-width': '100% !important',
        }
      };
      try {
        renditionRef.current.themes.register('custom', styles);
        renditionRef.current.themes.select('custom');
        
        // Update font size based on zoom
        renditionRef.current.themes.fontSize(`${Math.round(state.zoom * 100)}%`);
        
        // Handle spread based on viewMode
        renditionRef.current.spread(state.viewMode === 'double' ? 'auto' : 'none');
        
        renditionRef.current.resize();
      } catch (e) {
        // Ignore errors during theme/resize update
      }
    }
  }, [state.isDarkMode, state.zoom, state.viewMode]);

  return (
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col items-center">
      <div ref={viewerRef} className="w-full h-full" />
    </div>
  );
});

export default EPUBReader;
