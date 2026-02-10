
import React from 'react';
import { Source } from '../types';

interface Props {
  source: Source;
  index: number;
}

const SourceCard: React.FC<Props> = ({ source, index }) => {
  const url = new URL(source.uri);
  const hostname = url.hostname.replace('www.', '');
  const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  
  return (
    <a 
      href={source.uri} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex flex-col gap-2 p-3 bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/60 rounded-xl transition-all group min-w-0"
    >
      <div className="flex items-center gap-2">
        <img 
          src={favicon} 
          alt="" 
          className="w-4 h-4 rounded-sm grayscale group-hover:grayscale-0 transition-all"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider truncate">
          {hostname}
        </span>
      </div>
      <div className="text-[12px] font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-white">
        {source.title}
      </div>
      <div className="mt-auto pt-1 flex items-center gap-1.5">
        <div className="w-4 h-4 bg-zinc-800 rounded-full flex items-center justify-center text-[9px] font-bold text-zinc-400">
          {index + 1}
        </div>
      </div>
    </a>
  );
};

export default SourceCard;
