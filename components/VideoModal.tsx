import React, { useEffect, useState, useRef } from 'react';
import { YoutubeShort } from '../types';

interface Props {
  short: YoutubeShort | null;
  onClose: () => void;
}

const VideoModal: React.FC<Props> = ({ short, onClose }) => {
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (short) {
      document.body.style.overflow = 'hidden';
      setIsIframeLoading(true);
      setIsMinimized(false);
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [short]);

  if (!short) return null;

  // Optimized URL with 'playsinline' and 'enablejsapi' for Android performance
  const embedUrl = `https://www.youtube-nocookie.com/embed/${short.id}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}&widget_referrer=${window.location.origin}`;

  const toggleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  return (
    <div 
      className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 transition-all duration-700 cubic-bezier(0.1, 0.9, 0.2, 1) ${isMinimized ? 'translate-y-[calc(100%-110px)] px-4' : ''}`}
    >
      {/* Background Dim - Uses Dynamic Ambient Background */}
      {!isMinimized && (
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500"
          style={{ 
            backgroundImage: `radial-gradient(circle at center, rgba(59, 130, 246, 0.15), transparent 70%), url(${short.thumbnail})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center', 
            backgroundBlendMode: 'overlay' 
          }}
          onClick={() => setIsMinimized(true)}
        />
      )}
      
      {/* Native-Style Container */}
      <div 
        ref={playerRef}
        className={`relative w-full h-full sm:max-w-2xl sm:h-[92vh] flex flex-col bg-[#0a0a0b] shadow-[0_-10px_60px_rgba(0,0,0,0.8)] border-t border-white/10 android-sheet overflow-hidden sm:rounded-[3rem] transition-all duration-500 transform-gpu`}
      >
        {/* Android Drag Handle */}
        <div 
          className="h-12 w-full flex items-center justify-center cursor-pointer shrink-0 z-30"
          onClick={toggleSize}
        >
          <div className="w-10 h-1 bg-white/10 rounded-full group-hover:bg-white/30 transition-colors"></div>
        </div>

        <div className="flex-1 flex flex-col h-full">
          <div className="flex-1 flex flex-col">
            {/* Player Canvas - Forced Aspect Ratio to prevent Layout Shift */}
            <div className={`relative w-full bg-black overflow-hidden shadow-2xl transition-all duration-700 ${isMinimized ? 'aspect-video rounded-2xl' : 'aspect-[9/16] max-h-[75vh]'}`}>
              {isIframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0b] z-20">
                  <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="mt-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Stream Initializing</p>
                </div>
              )}
              <iframe
                src={embedUrl}
                onLoad={() => setIsIframeLoading(false)}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-presentation"
                allowFullScreen
              ></iframe>
            </div>

            {/* Content Hub */}
            {!isMinimized && (
              <div className="flex-1 p-8 overflow-y-auto no-scrollbar space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded border border-blue-500/20">Aether Stream</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Premium Discovery</span>
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight tracking-tighter uppercase line-clamp-2">{short.title}</h2>
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-black text-white text-sm">
                      {short.channelTitle.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-black text-xs uppercase tracking-tight">{short.channelTitle}</p>
                      <p className="text-blue-500 text-[8px] font-black uppercase tracking-[0.2em]">Verified Hub</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-white text-black h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform">Add to Vault</button>
                  <button className="flex-1 bg-white/5 text-white h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 active:scale-95 transition-transform backdrop-blur-xl">Share Matrix</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Minimized Controller View */}
        {isMinimized && (
          <div className="absolute inset-x-0 bottom-0 h-24 flex items-center px-6 gap-4 bg-[#121214] border-t border-white/5 cursor-pointer" onClick={() => setIsMinimized(false)}>
            <div className="w-14 h-14 rounded-xl overflow-hidden shadow-2xl">
              <img src={short.thumbnail} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-[11px] font-black text-white truncate uppercase tracking-tight leading-none">{short.title}</p>
               <p className="text-[9px] font-black text-zinc-600 uppercase mt-1.5 tracking-widest leading-none">{short.channelTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-4 bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoModal;