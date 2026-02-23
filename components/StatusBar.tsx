
import React, { useState, useEffect } from 'react';
import { PDFState, CommandResponse } from '../types';

interface Props {
  state: PDFState;
  lastResponse: CommandResponse | null;
  onOpenClick: () => void;
  onToggleDarkMode: () => void;
  onToggleViewMode: () => void;
  onPageChange: (page: number) => void;
  onFitWidth: () => void;
  onFitHeight: () => void;
  onNextResult: () => void;
  onPrevResult: () => void;
}

const StatusBar: React.FC<Props> = ({ 
  state, 
  lastResponse, 
  onOpenClick, 
  onToggleDarkMode, 
  onToggleViewMode,
  onPageChange, 
}) => {
  const [localPage, setLocalPage] = useState(state.currentPage.toString());

  useEffect(() => {
    setLocalPage(state.currentPage.toString());
  }, [state.currentPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPage(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(localPage);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum <= state.numPages) {
        onPageChange(pageNum);
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  return (
    <div className={`w-full flex items-center justify-between px-4 py-1.5 mono status-bar border-t border-gray-700/50 select-none z-50`}>
      <div className="flex items-center gap-6">
        <button onClick={onOpenClick} className="flex items-center gap-2 text-blue-400 font-bold text-[11px] hover:text-blue-300 transition-colors">
          <i className="fa-solid fa-file-pdf text-[10px]"></i>
          <span className="truncate max-w-[250px] uppercase tracking-wider">{state.fileName}</span>
        </button>
        
        {lastResponse && (
          <div className={`text-[10px] uppercase font-bold tracking-widest ${
            lastResponse.type === 'error' ? 'text-red-400' : 
            lastResponse.type === 'success' ? 'text-green-400' : 'text-gray-400'
          }`}>
            {lastResponse.message}
          </div>
        )}

        {state.searchQuery && (
          <div className="flex items-center gap-2 px-2 py-0.5 bg-yellow-500/10 rounded border border-yellow-500/30 text-yellow-500 text-[10px]">
            <span className="opacity-60">/</span>
            <span className="font-bold">{state.searchQuery}</span>
            <span className="opacity-60 ml-1">[{state.currentSearchResultIndex + 1}/{state.searchResults.length}]</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-8 text-[11px]">
        <div className="flex items-center gap-4">
          <button onClick={onToggleViewMode} className={`uppercase font-bold tracking-tighter ${state.viewMode === 'double' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
            {state.viewMode}
          </button>
          <button onClick={onToggleDarkMode} className={`uppercase font-bold tracking-tighter ${state.isDarkMode ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
            Recolor
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-bold">{Math.round(state.zoom * 100)}%</span>
        </div>
        
        <div className="flex items-center gap-1 bg-gray-800/40 px-3 py-0.5 rounded-sm border border-gray-700/30">
          <input 
            type="text" 
            value={localPage} 
            onChange={handleInputChange} 
            onKeyDown={handleKeyDown} 
            className="w-8 bg-transparent border-none outline-none text-right font-bold text-blue-300" 
          />
          <span className="text-gray-600 font-bold">/</span>
          <span className="text-gray-500 font-bold">{state.numPages}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
