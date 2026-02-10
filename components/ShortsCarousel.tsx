import React from 'react';
import { YoutubeShort } from '../types';

interface Props {
  shorts: YoutubeShort[];
  onSelect: (short: YoutubeShort) => void;
  title?: string;
  layout?: 'grid' | 'scroll';
}

const ShortsCarousel: React.FC<Props> = ({ shorts, onSelect, title = "Trending Shorts", layout = 'grid' }) => {
  // Return null if no shorts to avoid empty layout shifts
  if (!shorts || shorts.length === 0) return null;

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header with ASTRA Red Accent */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tighter">
          <div className="w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.6)]"></div>
          {title}
        </h2>
        {layout === 'scroll' && (
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Swipe →</span>
        )}
      </div>
      
      {/* Container with Responsive Snap Scrolling */}
      <div 
        className={`flex gap-4 overflow-x-auto pb-8 no-scrollbar snap-x snap-mandatory ${
          layout === 'grid' ? 'lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:overflow-visible' : ''
        }`}
      >
        {shorts.map((short) => (
          <div 
            key={short.id}
            onClick={() => onSelect(short)}
            className="flex-shrink-0 w-[200px] sm:w-[240px] lg:w-full snap-start group cursor-pointer"
          >
            {/* The Vertical Card */}
            <div className="aspect-[9/16] rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-white/5 relative shadow-2xl transition-all duration-700 ease-in-out hover:-translate-y-3 hover:border-red-500/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              
              {/* Thumbnail with Ken Burns effect on hover */}
              <img 
                src={short.thumbnail} 
                alt={short.title} 
                className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-125"
                loading="lazy"
              />
              
              {/* Dynamic Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
              
              {/* Play Button - Centered & Animated */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
                <div className="p-5 bg-red-600 text-white rounded-full shadow-[0_0_30px_rgba(220,38,38,0.6)] ring-4 ring-red-600/20">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>

              {/* Text Meta Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2 pointer-events-none">
                <h3 className="text-[13px] font-black text-white line-clamp-2 leading-tight tracking-tight drop-shadow-xl group-hover:text-red-400 transition-colors">
                  {short.title}
                </h3>
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-black border border-white/10">
                     {short.channelTitle.charAt(0)}
                   </div>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate">
                     {short.channelTitle}
                   </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShortsCarousel;