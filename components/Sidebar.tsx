import React, { useState } from 'react';
import { Thread, AppView, DiscoveryMode } from '../types';

interface Props {
  threads: Thread[];
  activeThreadId: string | null;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onOpenSettings: () => void;
  currentView: AppView;
  setView: (view: AppView) => void;
  discoveryMode: DiscoveryMode;
  setDiscoveryMode: (mode: DiscoveryMode) => void;
  isOpen?: boolean;
  onClose?: () => void;
  vpnEnabled: boolean;
}

const Sidebar: React.FC<Props> = ({ 
  threads, activeThreadId, onNewThread, onSelectThread, onOpenSettings, currentView, setView, 
  discoveryMode, setDiscoveryMode, isOpen = false, onClose, vpnEnabled 
}) => {
  const [isDiscoverExpanded, setIsDiscoverExpanded] = useState(true);

  return (
    <>
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0f0f10] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) flex flex-col border-r border-white/5 shadow-2xl`}>
        <div className="p-6 flex flex-col h-full space-y-6">
          
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-2xl font-black tracking-tighter text-white uppercase flex items-center gap-2">
              B<span className="text-blue-500">AGE</span>WADI
            </span>
          </div>

          <button 
            onClick={() => { onNewThread(); onClose?.(); setView('home'); }}
            className="flex items-center gap-3 px-6 py-4 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-white/5 rounded-2xl transition-all active-tap shadow-lg"
          >
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            <span className="text-[11px] font-black uppercase tracking-widest">New Synthesis</span>
          </button>

          <nav className="space-y-1">
            <button
              onClick={() => { setView('home'); onClose?.(); }}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                currentView === 'home' ? 'bg-white/10 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Home
            </button>

            {/* Discovery Section with Sub-categories */}
            <div className="space-y-0.5">
              <button
                onClick={() => { setView('discover'); setIsDiscoverExpanded(!isDiscoverExpanded); }}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  currentView === 'discover' ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Discovery
                </div>
                <svg className={`w-3 h-3 transition-transform ${isDiscoverExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              
              {isDiscoverExpanded && (
                <div className="ml-9 space-y-0.5 animate-in slide-in-from-top-2 duration-300">
                  {[
                    { id: 'all', label: 'Global Feed', icon: <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM2 9h20M9 22V9"/> },
                    { id: 'youtube', label: 'YouTube', icon: <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></> },
                    { id: 'shorts', label: 'Shorts', icon: <path d="m16 11-4 4-4-4M12 5v10"/> },
                    { id: 'music', label: 'Music', icon: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></> }
                  ].map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => { setView('discover'); setDiscoveryMode(sub.id as DiscoveryMode); onClose?.(); }}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        currentView === 'discover' && discoveryMode === sub.id ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">{sub.icon}</svg>
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => { setView('library'); onClose?.(); }}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                currentView === 'library' ? 'bg-white/10 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              Vault
            </button>
          </nav>

          <div className="flex-1 overflow-y-auto no-scrollbar pt-4">
            <div className="px-4 py-2 text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">History</div>
            <div className="space-y-0.5">
              {threads.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setView('home'); onSelectThread(t.id); onClose?.(); }}
                  className={`w-full text-left px-5 py-2.5 rounded-lg text-[10px] truncate transition-all ${
                    activeThreadId === t.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="truncate font-bold uppercase tracking-tight">{t.title || 'Synthesis Output'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
            <button 
              onClick={() => { onOpenSettings(); onClose?.(); }}
              className="w-full flex items-center gap-4 px-5 py-3 text-zinc-600 hover:text-zinc-300 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Settings
            </button>
            
            <div className="flex items-center gap-4 p-4 bg-zinc-900/40 rounded-[2rem] border border-white/10 group active-tap cursor-pointer relative overflow-hidden shadow-xl">
               <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop" 
                      alt="Bagewadi User" 
                      className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                    />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-[#191a1b] shadow-sm animate-pulse"></div>
               </div>
               <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-black uppercase text-white tracking-tight truncate">Sync Architect</span>
                  <span className="text-[8px] font-black uppercase text-zinc-600 tracking-[0.2em]">{vpnEnabled ? 'Encrypted' : 'Direct Link'}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
      {isOpen && <div className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-md" onClick={onClose} />}
    </>
  );
};

export default Sidebar;