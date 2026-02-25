import React from 'react';

interface Props {
  numPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
  isDarkMode: boolean;
}

const ProgressSpine: React.FC<Props> = ({ numPages, currentPage, onPageSelect, isDarkMode }) => {
  if (numPages <= 1) return null;

  // Calculate step for major marks based on total pages
  let step = 10;
  if (numPages < 50) step = 5;
  if (numPages > 200) step = 20;
  if (numPages > 500) step = 50;
  if (numPages > 1000) step = 100;

  const segments = [];
  // Ensure we don't have too many segments if the logic above fails for some edge case
  const safeStep = Math.max(1, step);
  for (let i = 1; i <= numPages; i += safeStep) {
    segments.push(i);
  }
  // Always include the last page if not already close
  if (segments[segments.length - 1] !== numPages) {
    segments.push(numPages);
  }

  const progress = ((currentPage - 1) / (numPages - 1)) * 100;

  return (
    <div className={`w-12 h-full flex flex-col items-center justify-center py-8 select-none z-30 flex-shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-[#121216] border-l border-white/5' : 'bg-[#e8e8e8] border-l border-black/5'}`}>
      {/* The Spine Container */}
      <div className="relative w-3 h-full rounded-sm overflow-hidden shadow-inner"
           style={{
             background: isDarkMode 
               ? 'linear-gradient(to right, #2a2a30, #1a1a20, #2a2a30)' 
               : 'linear-gradient(to right, #f0f0f0, #d0d0d0, #f0f0f0)'
           }}
      >
        {/* Paper Texture (Fine lines) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none"
             style={{
               backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${isDarkMode ? '#000' : '#000'} 2px, ${isDarkMode ? '#000' : '#000'} 3px)`
             }}
        />

        {/* Major Segment Marks */}
        {segments.map((page) => (
          <div 
            key={page}
            className={`absolute w-full h-[1px] left-0 pointer-events-none ${isDarkMode ? 'bg-white/30' : 'bg-black/20'}`}
            style={{ top: `${((page - 1) / (numPages - 1)) * 100}%` }}
          />
        ))}

        {/* Current Page Indicator (The "Bookmark" or "Ribbon" slice) */}
        <div 
          className={`absolute w-full h-[3px] left-0 transition-all duration-200 ease-out shadow-[0_0_8px_rgba(59,130,246,0.6)] ${isDarkMode ? 'bg-blue-400' : 'bg-blue-600'}`}
          style={{ top: `${progress}%`, transform: 'translateY(-50%)' }}
        />
      </div>

      {/* Interactive Overlay */}
      <div 
        className="absolute inset-y-8 w-12 cursor-pointer group"
        onClick={(e) => {
           const rect = e.currentTarget.getBoundingClientRect();
           const y = e.clientY - rect.top;
           const height = rect.height;
           const p = Math.max(0, Math.min(1, y / height));
           const targetPage = Math.round(p * (numPages - 1)) + 1;
           onPageSelect(targetPage);
        }}
      >
        {/* Tooltip on Hover */}
        <div 
          className={`absolute right-10 top-0 px-2 py-1 text-[10px] font-mono rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap ${isDarkMode ? 'bg-black text-white border border-white/10' : 'bg-white text-black border border-black/10 shadow-md'}`}
          style={{ top: `${progress}%`, transform: 'translateY(-50%)' }}
        >
          Page {currentPage}
        </div>
      </div>
    </div>
  );
};

export default ProgressSpine;
