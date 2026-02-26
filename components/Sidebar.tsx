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

import ThumbnailItem from './ThumbnailItem';

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
  useEffect(() => {
    if (isOpen && state.fileType === 'pdf') {
      setTimeout(() => {
        const el = document.getElementById(`sidebar-thumb-${state.currentPage - 1}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [isOpen, state.currentPage, state.fileType]);

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
            variant="sidebar"
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