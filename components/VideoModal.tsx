import React, { useEffect, useState } from 'react';
import { YoutubeShort } from '../types';

interface Props {
  short: YoutubeShort | null;
  onClose: () => void;
}

const VideoModal: React.FC<Props> = ({ short, onClose }) => {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  useEffect(() => {
    if (short) {
      document.body.style.overflow = 'hidden';
      setIsIframeLoading(true);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [short]);

  if (!short) return null;

  /**
   * FIX 1: The 'origin' parameter is required by YouTube when using 'enablejsapi=1' 
   * to prevent 'Untrusted Origin' errors. window.location.origin dynamically 
   * provides your current URL (e.g., http://localhost:3000).
   */
  const origin = window.location.origin;
  const embedUrl = `https://www.youtube.com/embed/${short.id}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${origin}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-[400px] aspect-[9/16] bg-zinc-950 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10 animate-in zoom-in-95 duration-300 ease-out z-10 flex flex-col group">
        
        {isIframeLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-zinc-900">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin shadow-[0_0_15px_rgba(220,38,38,0.3)]"></div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Establishing Stream</p>
          </div>
        )}

        <button 
          onClick={onClose}
          className="absolute top-8 right-8 z-30 p-3 bg-black/40 hover:bg-red-600 rounded-full text-white transition-all backdrop-blur-xl border border-white/10 active:scale-90"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <iframe
          src={embedUrl}
          onLoad={() => setIsIframeLoading(false)}
          className={`w-full h-full transition-opacity duration-700 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
          frameBorder="0"
          /**
           * FIX 2: You MUST include 'autoplay' in the 'allow' attribute string.
           * Browsers block autoplaying frames unless this explicit permission is granted.
           */
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          /**
           * FIX 3: Referrer Policy. YouTube requires the referrer to verify the origin.
           */
          referrerPolicy="strict-origin-when-cross-origin"
          title={short.title}
        ></iframe>

        {!isIframeLoading && (
          <div className="absolute bottom-0 left-0 right-0 p-10 pt-24 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
             <h4 className="text-white text-lg font-black tracking-tight leading-snug drop-shadow-2xl mb-2 line-clamp-2">
               {short.title}
             </h4>
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-black text-white">
                 {short.channelTitle.charAt(0)}
               </div>
               <p className="text-zinc-300 text-sm font-bold tracking-tight">{short.channelTitle}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoModal;