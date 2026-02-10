
import React from 'react';
import { Thread, AppView } from '../types';

interface Props {
  threads: Thread[];
  activeThreadId: string | null;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onOpenSettings: () => void;
  currentView: AppView;
  setView: (view: AppView) => void;
  isOpen?: boolean;
  onClose?: () => void;
  vpnEnabled: boolean;
}

const Sidebar: React.FC<Props> = ({ 
  threads, activeThreadId, onNewThread, onSelectThread, onOpenSettings, currentView, setView, isOpen = false, onClose, vpnEnabled 
}) => {
  return (
    <>
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#1e1f20] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="p-4 flex flex-col h-full">
          {/* Logo */}
          <div className="px-4 py-6 flex items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-white">Bagewadi</span>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-[#333537] rounded-full text-zinc-400">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>

          {/* New Chat Button */}
          <button 
            onClick={() => { onNewThread(); onClose?.(); setView('home'); }}
            className="flex items-center gap-3 px-4 py-3 bg-[#1a1c1e] hover:bg-[#333537] text-zinc-300 rounded-full transition-all mb-8 w-fit"
          >
            <svg className="w-5 h-5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            <span className="text-sm font-medium pr-2">New chat</span>
          </button>

          {/* Main Navigation */}
          <nav className="space-y-1 mb-8">
            <button
              onClick={() => { setView('home'); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${currentView === 'home' ? 'bg-[#333537] text-white' : 'text-zinc-400 hover:bg-[#333537]'}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Home
            </button>
            <button
              onClick={() => { setView('discover'); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${currentView === 'discover' ? 'bg-[#333537] text-white' : 'text-zinc-400 hover:bg-[#333537]'}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Discover
            </button>
          </nav>

          {/* Recent History */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-4 py-2 text-xs font-medium text-zinc-500 mb-2">Recent</div>
            <div className="space-y-1">
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setView('home'); onSelectThread(t.id); onClose?.(); }}
                  className={`w-full text-left px-4 py-2.5 rounded-full text-sm truncate transition-colors flex items-center gap-3 ${
                    activeThreadId === t.id ? 'bg-[#333537] text-white' : 'text-zinc-400 hover:bg-[#333537] hover:text-zinc-200'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <span className="truncate">{t.title || 'Untitled'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-auto space-y-1 pt-4 border-t border-[#333537]">
            <button 
              onClick={() => { onOpenSettings(); onClose?.(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:bg-[#333537] rounded-full transition-all text-sm font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Settings
            </button>
            <div className="px-4 py-3 flex items-center gap-2 text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
               <div className={`w-1.5 h-1.5 rounded-full ${vpnEnabled ? 'bg-blue-400 animate-pulse' : 'bg-red-400'}`}></div>
               Tunnel: {vpnEnabled ? 'Secure' : 'Off'}
            </div>
          </div>
        </div>
      </div>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
    </>
  );
};

export default Sidebar;
