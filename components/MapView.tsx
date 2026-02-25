import React from 'react';
import ThumbnailItem from './ThumbnailItem';
import { PDFState } from '../types';

interface Props {
  isOpen: boolean;
  fileData: Uint8Array | null;
  state: PDFState;
  onPageSelect: (p: number) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

const MapView: React.FC<Props> = ({ isOpen, fileData, state, onPageSelect, onClose, isDarkMode }) => {
  if (!isOpen || !fileData) return null;

  const pages = Array.from({ length: state.numPages }, (_, i) => i);
  const chunks = [];
  for (let i = 0; i < state.numPages; i += 10) {
    chunks.push(pages.slice(i, i + 10));
  }

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col ${isDarkMode ? 'bg-[#1a1b26]/95' : 'bg-[#f0f0f0]/95'} backdrop-blur-md transition-opacity duration-200 animate-fade-in`}>
      <div className={`flex justify-between items-center px-8 py-6 border-b ${isDarkMode ? 'border-gray-700/30' : 'border-gray-300/30'}`}>
        <div className="flex items-center gap-4">
          <h2 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            Page Map
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-mono ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            {state.numPages} Pages
          </span>
        </div>
        <button 
          onClick={onClose}
          className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-500/10 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
        >
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
        <div className="max-w-7xl mx-auto space-y-12">
          {chunks.map((chunk, chunkIndex) => (
            <div key={chunkIndex} className="animate-slide-up" style={{ animationDelay: `${chunkIndex * 0.05}s` }}>
              <div className={`flex items-center gap-4 mb-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className={`h-px flex-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest">
                  {chunkIndex * 10 + 1} — {Math.min((chunkIndex + 1) * 10, state.numPages)}
                </span>
                <div className={`h-px flex-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-300'}`}></div>
              </div>
              
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-8">
                {chunk.map(pageIndex => (
                  <ThumbnailItem 
                    key={pageIndex}
                    index={pageIndex}
                    pdfData={fileData}
                    isActive={state.currentPage === pageIndex + 1}
                    onClick={() => {
                      onPageSelect(pageIndex + 1);
                      onClose();
                    }}
                    isDarkMode={isDarkMode}
                    scale={0.25}
                    className="hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapView;
