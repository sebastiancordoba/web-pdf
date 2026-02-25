import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import PDFReader from './components/PDFReader';
import EPUBReader from './components/EPUBReader';
import StatusBar from './components/StatusBar';
import CommandInput from './components/CommandInput';
import Sidebar from './components/Sidebar';
import ProgressSpine from './components/ProgressSpine';
import MapView from './components/MapView';
import { PDFState, CommandResponse, SearchResult } from './types';

// Use unpkg for the worker to ensure static asset compatibility and correct MIME types
const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

const App: React.FC = () => {
  const [state, setState] = useState<PDFState>({
    file: null,
    fileType: null,
    numPages: 0,
    currentPage: 1,
    zoom: 1.0,
    rotation: 0,
    isDarkMode: true,
    isSidebarOpen: false,
    isMapViewOpen: false,
    isBookMode: false,
    isFullscreen: false,
    fileName: 'No file selected',
    searchQuery: '',
    currentSearchResultIndex: -1,
    searchResults: [],
    viewMode: 'single',
    isControlsVisible: true,
  });

  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [commandActive, setCommandActive] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [lastResponse, setLastResponse] = useState<CommandResponse | null>(null);
  
  const lastKeyRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const pdfReaderRef = useRef<any>(null);
  const epubReaderRef = useRef<any>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      setFileData(arrayBuffer);
      setState(prev => ({
        ...prev,
        file,
        fileType: 'pdf',
        fileName: file.name,
        currentPage: 1,
        rotation: 0,
        searchQuery: '',
        searchResults: [],
        currentSearchResultIndex: -1,
        numPages: 0
      }));
      setLastResponse({ message: `Loaded ${file.name}`, type: 'success' });
    } else if (file.type === 'application/epub+zip' || file.name.toLowerCase().endsWith('.epub')) {
      const arrayBuffer = await file.arrayBuffer();
      setFileData(arrayBuffer);
      setState(prev => ({
        ...prev,
        file,
        fileType: 'epub',
        fileName: file.name,
        currentPage: 1,
        rotation: 0,
        searchQuery: '',
        searchResults: [],
        currentSearchResultIndex: -1,
        numPages: 0
      }));
      setLastResponse({ message: `Loaded ${file.name}`, type: 'success' });
    } else {
      setLastResponse({ message: "Only PDF and EPUB files are supported", type: 'error' });
    }
  };

  const handleFit = useCallback(async (mode: 'width' | 'height') => {
    if (state.fileType === 'pdf' && pdfReaderRef.current && mainRef.current) {
      const containerWidth = mainRef.current.clientWidth - 80;
      const containerHeight = mainRef.current.clientHeight - 80;
      const { widthZoom, heightZoom } = await pdfReaderRef.current.getFitZoom(containerWidth, containerHeight);
      setState(prev => ({ ...prev, zoom: mode === 'width' ? widthZoom : heightZoom }));
    }
  }, [state.fileType]);

  const performSearch = useCallback(async (query: string) => {
    if (!fileData || !query.trim()) return;
    
    if (state.fileType === 'pdf') {
      setLastResponse({ message: "Searching...", type: 'info' });
      const results: SearchResult[] = [];
      try {
        const pdf = await pdfjsLib.getDocument({ data: fileData.slice(0) }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const fullText = textContent.items.map((item: any) => item.str).join(' ');
          let occurrenceOnPage = 0;
          let pos = fullText.toLowerCase().indexOf(query.toLowerCase());
          while (pos !== -1) {
            results.push({ page: i, occurrenceIndexOnPage: occurrenceOnPage });
            occurrenceOnPage++;
            pos = fullText.toLowerCase().indexOf(query.toLowerCase(), pos + 1);
          }
        }
        const hasResults = results.length > 0;
        setState(prev => ({
          ...prev,
          searchQuery: query,
          searchResults: results,
          currentSearchResultIndex: hasResults ? 0 : -1,
          currentPage: hasResults ? results[0].page : prev.currentPage
        }));
        setLastResponse(hasResults ? { message: `Found ${results.length} matches`, type: 'success' } : { message: "No matches found", type: 'error' });
        pdf.destroy();
      } catch (err) {
        setLastResponse({ message: "Search failed", type: 'error' });
      }
    } else {
      setLastResponse({ message: "Search not supported for EPUB yet", type: 'info' });
    }
  }, [fileData, state.fileType]);

  const navigateSearch = useCallback((direction: 'next' | 'prev') => {
    setState(prev => {
      if (prev.searchResults.length === 0) return prev;
      let nextIndex = prev.currentSearchResultIndex;
      if (direction === 'next') nextIndex = (nextIndex + 1) % prev.searchResults.length;
      else nextIndex = (nextIndex - 1 + prev.searchResults.length) % prev.searchResults.length;
      return { ...prev, currentSearchResultIndex: nextIndex, currentPage: prev.searchResults[nextIndex].page };
    });
  }, []);

  const executeCommand = (cmd: string) => {
    const parts = cmd.trim().split(' ');
    const action = parts[0].toLowerCase();
    switch (action) {
      case 'export':
      case 'e':
        if (state.fileType === 'pdf') {
          pdfReaderRef.current?.exportPage(parts[1] || 'png');
        }
        break;
      case 'd':
      case 'delete':
        if (state.fileType === 'pdf') {
          deletePage(parseInt(parts[1]) || state.currentPage);
        }
        break;
      case 'w':
      case 'write':
      case 'save':
        saveFile();
        break;
      case 'q':
      case 'quit':
        window.location.reload();
        break;
      case 'noh':
        setState(prev => ({ ...prev, searchQuery: '', searchResults: [], currentSearchResultIndex: -1 }));
        break;
      case 'r':
      case 'recolor':
        setState(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }));
        break;
      case 'rot':
      case 'rotate':
        const degrees = parseInt(parts[1]) || 90;
        setState(prev => ({ ...prev, rotation: (prev.rotation + degrees) % 360 }));
        break;
      case 'view':
        setState(prev => ({ ...prev, viewMode: parts[1] === 'double' ? 'double' : 'single' }));
        break;
      case 'goto':
      case 'g':
        const targetPage = parseInt(parts[1]);
        if (targetPage > 0) {
           if (state.fileType === 'pdf' && targetPage <= state.numPages) {
             setState(prev => ({ ...prev, currentPage: targetPage }));
           } else if (state.fileType === 'epub') {
             // EPUB goto logic might need CFI or page mapping, for now just update state
             // EPUBReader handles internal navigation, but we need to sync state
           }
        }
        break;
      default:
        setLastResponse({ message: `Unknown command: ${action}`, type: 'error' });
    }
    setCommandActive(false);
  };

  const deletePage = useCallback(async (pageNum: number) => {
    if (!fileData || state.fileType !== 'pdf') return;
    try {
      const pdfDoc = await PDFDocument.load(fileData.slice(0));
      if (pdfDoc.getPageCount() <= 1) return;
      pdfDoc.removePage(pageNum - 1);
      const newPdfBytes = await pdfDoc.save();
      setFileData(newPdfBytes.buffer);
      setState(prev => ({ ...prev, numPages: pdfDoc.getPageCount(), currentPage: Math.min(prev.currentPage, pdfDoc.getPageCount()) }));
      setLastResponse({ message: `Removed page ${pageNum}`, type: 'info' });
    } catch (err) {
      setLastResponse({ message: "Failed to delete page", type: 'error' });
    }
  }, [fileData, state.fileType]);

  const saveFile = useCallback(async () => {
    if (!fileData) return;
    const blob = new Blob([fileData], { type: state.fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zathura_${state.fileName}`;
    link.click();
    setLastResponse({ message: "File Saved", type: 'success' });
  }, [fileData, state.fileName, state.fileType]);

  useEffect(() => {
    if (state.fileType === 'pdf' && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [state.currentPage, state.fileType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commandActive || searchActive || document.activeElement?.tagName === 'INPUT') return;
      
      // Handle gg jump
      if (e.key === 'g' && lastKeyRef.current === 'g') {
        e.preventDefault();
        setState(prev => ({ ...prev, currentPage: 1 }));
        lastKeyRef.current = null;
        return;
      }
      lastKeyRef.current = e.key;
      setTimeout(() => { if(lastKeyRef.current === e.key) lastKeyRef.current = null; }, 400);

      switch (e.key) {
        case ':': e.preventDefault(); setCommandActive(true); break;
        case '/': e.preventDefault(); setSearchActive(true); break;
        case 'n': e.preventDefault(); navigateSearch('next'); break;
        case 'N': e.preventDefault(); navigateSearch('prev'); break;
        case 'j': case 'ArrowDown':
          e.preventDefault();
          if (state.fileType === 'pdf' && mainRef.current) mainRef.current.scrollBy({ top: 80, behavior: 'auto' });
          break;
        case 'k': case 'ArrowUp':
          e.preventDefault();
          if (state.fileType === 'pdf' && mainRef.current) mainRef.current.scrollBy({ top: -80, behavior: 'auto' });
          break;
        case 'l': case 'ArrowRight': case ' ': case 'PageDown':
          e.preventDefault();
          if (state.fileType === 'pdf') {
            setState(prev => ({ ...prev, currentPage: Math.min(prev.numPages, prev.currentPage + (prev.viewMode === 'double' ? 2 : 1)) }));
          } else if (state.fileType === 'epub') {
            epubReaderRef.current?.next();
          }
          break;
        case 'h': case 'ArrowLeft': case 'Backspace': case 'PageUp':
          e.preventDefault();
          if (state.fileType === 'pdf') {
            setState(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - (prev.viewMode === 'double' ? 2 : 1)) }));
          } else if (state.fileType === 'epub') {
            epubReaderRef.current?.prev();
          }
          break;
        case 'G': e.preventDefault(); setState(prev => ({ ...prev, currentPage: prev.numPages })); break;
        case 'i': setState(prev => ({ ...prev, isDarkMode: !prev.isDarkMode })); break;
        case 'd': setState(prev => ({ ...prev, viewMode: prev.viewMode === 'single' ? 'double' : 'single' })); break;
        case 'Tab': e.preventDefault(); setState(prev => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen })); break;
        case 'm': setState(prev => ({ ...prev, isMapViewOpen: !prev.isMapViewOpen })); break;
        case 'b': setState(prev => ({ ...prev, isBookMode: !prev.isBookMode })); break;
        case 'p': setState(prev => ({ ...prev, isControlsVisible: !prev.isControlsVisible })); break;
        case 'f': case 'F11': e.preventDefault(); toggleFullscreen(); break;
        case '+': case '=': setState(prev => ({ ...prev, zoom: Math.min(5, prev.zoom + 0.1) })); break;
        case '-': setState(prev => ({ ...prev, zoom: Math.max(0.2, prev.zoom - 0.1) })); break;
        case 's': handleFit('width'); break;
        case 'a': handleFit('height'); break;
        case 'Escape': 
          setState(prev => ({ ...prev, searchQuery: '', searchResults: [], currentSearchResultIndex: -1 })); 
          setCommandActive(false);
          setSearchActive(false);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandActive, searchActive, state, handleFit, navigateSearch]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${state.isDarkMode ? 'bg-[#1a1b26]' : 'bg-[#f0f0f0]'}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.epub" className="hidden" />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          isOpen={state.isSidebarOpen} 
          fileData={fileData ? new Uint8Array(fileData) : null} 
          state={state}
          toc={toc}
          onPageSelect={(p) => {
            setState(prev => ({ ...prev, currentPage: p }));
            if (state.fileType === 'pdf' && mainRef.current) mainRef.current.scrollTop = 0;
          }}
          onTocSelect={(cfi) => {
            if (state.fileType === 'epub') {
              epubReaderRef.current?.goTo(cfi);
            }
          }}
          onReorder={() => {}} 
          isDarkMode={state.isDarkMode}
        />
        <main ref={mainRef} className="flex-1 flex flex-col items-center justify-center overflow-auto no-scrollbar relative p-12 scroll-smooth">
          {!fileData ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto px-6">
              <div className="text-8xl mb-8 text-blue-500 animate-fade-in">
                <i className="fa-solid fa-book-open"></i>
              </div>
              <h1 className={`text-4xl font-bold mb-4 tracking-tight ${state.isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                Zathura Web
              </h1>
              <p className={`text-lg mb-8 opacity-70 ${state.isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                A minimalist, keyboard-driven PDF & EPUB reader.
              </p>
              <button onClick={() => fileInputRef.current?.click()} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-bold transition-all shadow-xl active:scale-95 mb-12 uppercase tracking-widest text-sm">
                Open File
              </button>
              <div className={`grid grid-cols-2 gap-x-12 gap-y-3 text-left font-mono text-xs border-t pt-8 w-full max-w-md ${state.isDarkMode ? 'text-gray-400 border-gray-700/50' : 'text-gray-600 border-gray-300'}`}>
                <div className="flex justify-between"><span>j / k</span> <span>Smooth Scroll</span></div>
                <div className="flex justify-between"><span>h / l</span> <span>Page Turn</span></div>
                <div className="flex justify-between"><span>gg / G</span> <span>Start / End</span></div>
                <div className="flex justify-between"><span>:</span> <span>Command</span></div>
              </div>
            </div>
          ) : (
            state.fileType === 'pdf' ? (
              <PDFReader 
                key={state.fileName + (fileData?.byteLength || 0)}
                ref={pdfReaderRef}
                pdfData={fileData}
                state={state}
                onPagesLoaded={(n) => setState(prev => ({ ...prev, numPages: n }))}
              />
            ) : (
              <EPUBReader
                key={state.fileName + (fileData?.byteLength || 0)}
                ref={epubReaderRef}
                epubData={fileData}
                state={state}
                onTocLoaded={(t) => setToc(t)}
                onLocationsReady={(total) => {
                  setState(prev => ({ ...prev, numPages: total }));
                }}
                onLocationChange={(loc) => {
                  // Update current page/location state if needed
                  if (loc && loc.start && loc.start.percentage) {
                    const currentPage = Math.floor(loc.start.percentage * state.numPages) + 1;
                    setState(prev => ({ ...prev, currentPage }));
                  }
                }}
              />
            )
          )}
        </main>
        {state.numPages > 1 && (
          <div className="relative h-full flex items-center">
            <ProgressSpine 
              numPages={state.numPages} 
              currentPage={state.currentPage} 
              onPageSelect={(p) => {
                setState(prev => ({ ...prev, currentPage: p }));
                if (state.fileType === 'pdf' && mainRef.current) mainRef.current.scrollTop = 0;
                if (state.fileType === 'epub') {
                  const percentage = (p - 1) / (state.numPages - 1);
                  epubReaderRef.current?.goToPercentage(percentage);
                }
              }}
              isDarkMode={state.isDarkMode} 
            />
          </div>
        )}
      </div>
      <MapView 
        isOpen={state.isMapViewOpen} 
        fileData={fileData ? new Uint8Array(fileData) : null} 
        state={state}
        onPageSelect={(p) => {
          setState(prev => ({ ...prev, currentPage: p }));
          if (state.fileType === 'pdf' && mainRef.current) mainRef.current.scrollTop = 0;
          if (state.fileType === 'epub') {
            const percentage = (p - 1) / (state.numPages - 1);
            epubReaderRef.current?.goToPercentage(percentage);
          }
        }}
        onClose={() => setState(prev => ({ ...prev, isMapViewOpen: false }))}
        isDarkMode={state.isDarkMode}
      />
      <div className="z-50">
        {commandActive && <CommandInput prefix=":" onExecute={executeCommand} onCancel={() => setCommandActive(false)} isDarkMode={state.isDarkMode} />}
        {searchActive && <CommandInput prefix="/" onExecute={(q) => { performSearch(q); setSearchActive(false); }} onCancel={() => setSearchActive(false)} isDarkMode={state.isDarkMode} />}
        {!commandActive && !searchActive && state.isControlsVisible && (
          <StatusBar 
            state={state} 
            lastResponse={lastResponse}
            onOpenClick={() => fileInputRef.current?.click()}
            onToggleDarkMode={() => setState(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }))}
            onToggleViewMode={() => setState(prev => ({ ...prev, viewMode: prev.viewMode === 'single' ? 'double' : 'single' }))}
            onToggleBookMode={() => setState(prev => ({ ...prev, isBookMode: !prev.isBookMode }))}
            onToggleMapView={() => setState(prev => ({ ...prev, isMapViewOpen: !prev.isMapViewOpen }))}
            onToggleFullscreen={toggleFullscreen}
            onPageChange={(p) => setState(prev => ({ ...prev, currentPage: p }))}
            onFitWidth={() => handleFit('width')}
            onFitHeight={() => handleFit('height')}
            onNextResult={() => navigateSearch('next')}
            onPrevResult={() => navigateSearch('prev')}
          />
        )}
      </div>
    </div>
  );
};

export default App;