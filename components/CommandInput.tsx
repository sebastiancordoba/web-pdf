
import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onExecute: (cmd: string) => void;
  onCancel: () => void;
  isDarkMode: boolean;
  prefix?: string;
}

const CommandInput: React.FC<Props> = ({ onExecute, onCancel, isDarkMode, prefix = ':' }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onExecute(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={`w-full flex items-center px-3 py-1 mono ${isDarkMode ? 'bg-[#1a1b26] text-[#a9b1d6]' : 'bg-white text-gray-800'} border-t border-blue-500/50`}>
      <span className="mr-2 text-blue-500 font-bold">{prefix}</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Add delay to prevent immediate blur cancellation on mouse clicks
          setTimeout(onCancel, 150);
        }}
        className="flex-1 bg-transparent outline-none border-none text-sm"
        placeholder={prefix === '/' ? 'Search...' : 'Command...'}
      />
    </div>
  );
};

export default CommandInput;
