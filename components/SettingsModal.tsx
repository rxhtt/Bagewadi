import React, { useState } from 'react';
import { perplexity } from '../services/perplexityService';
import { ImageProvider } from '../types';

interface ImageKeys {
  openai: string[];
  stability: string[];
  replicate: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: string[];
  onSaveKeys: (keys: string[]) => void;
  imageKeys: ImageKeys;
  onSaveImageKeys: (provider: ImageProvider, keys: string[]) => void;
  youtubeKeys: string[];
  onSaveYoutubeKeys: (keys: string[]) => void;
  activeImageProvider: ImageProvider;
  onSetActiveImageProvider: (provider: ImageProvider) => void;
  vpnEnabled: boolean;
  onToggleVPN: (enabled: boolean) => void;
}

const SettingsModal: React.FC<Props> = ({ 
  isOpen, onClose, apiKeys, onSaveKeys, youtubeKeys, onSaveYoutubeKeys,
  vpnEnabled, onToggleVPN 
}) => {
  const [newKey, setNewKey] = useState('');
  const [activeTab, setActiveTab] = useState<'intelligence' | 'youtube' | 'network'>('intelligence');

  if (!isOpen) return null;

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    
    // As requested: No limitations, no mandatory validation check whatsoever
    if (activeTab === 'intelligence') {
      onSaveKeys([...apiKeys, newKey.trim()]);
    } else if (activeTab === 'youtube') {
      onSaveYoutubeKeys([...youtubeKeys, newKey.trim()]);
    }
    setNewKey('');
  };

  const tabs = [
    { id: 'intelligence', label: 'AI Nodes', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg> },
    { id: 'youtube', label: 'Streams', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="15" x="2" y="4.5" rx="2.18"/><polygon points="10 9 15 12 10 15 10 9"/></svg> },
    { id: 'network', label: 'Network', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-6 transition-all duration-500 animate-in fade-in">
      <div className="w-full h-[90vh] sm:h-auto sm:max-w-5xl bg-[#191a1b] sm:rounded-[3rem] rounded-t-[3rem] border-t sm:border border-white/10 shadow-[0_-30px_150px_rgba(0,0,0,1)] flex flex-col md:flex-row overflow-hidden">
        
        {/* Mobile Nav - Modern Segmented Control */}
        <div className="flex md:hidden items-center border-b border-white/5 bg-black/40 p-5 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl w-full">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="ml-4 p-3 bg-zinc-800 rounded-full text-zinc-400 active:scale-90 transition-all">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <aside className="hidden md:flex w-72 bg-black/30 border-r border-white/5 p-12 flex-col gap-5 shrink-0">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">System</h2>
            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] mt-1">Infrastructure</p>
          </div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-5 px-6 py-5 rounded-[1.75rem] transition-all group ${
                activeTab === tab.id ? 'bg-zinc-800 text-white shadow-2xl scale-110' : 'text-zinc-600 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <div className={`${activeTab === tab.id ? 'text-blue-500' : 'text-zinc-800 group-hover:text-zinc-600'}`}>{tab.icon}</div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
            </button>
          ))}
        </aside>

        <main className="flex-1 flex flex-col p-8 sm:p-16 overflow-hidden bg-gradient-to-br from-transparent to-blue-500/[0.01]">
          <header className="hidden md:flex items-center justify-between mb-16">
            <div>
              <h3 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{tabs.find(t => t.id === activeTab)?.label}</h3>
              <p className="text-[11px] font-black text-zinc-600 uppercase tracking-widest mt-4">Manage neural cluster and relay nodes.</p>
            </div>
            <button onClick={onClose} className="p-5 hover:bg-zinc-800 rounded-full text-zinc-500 transition-all active:scale-90 border border-white/5 shadow-2xl">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar pr-0 sm:pr-4">
            {activeTab === 'network' ? (
              <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                <div className="p-12 bg-zinc-900/60 rounded-[3.5rem] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none"></div>
                  <div className="space-y-3 text-center sm:text-left z-10">
                    <h4 className="text-2xl font-black text-white uppercase tracking-widest">Global Relay</h4>
                    <p className="text-[11px] text-zinc-600 font-black uppercase tracking-tighter max-w-xs leading-relaxed">Tunnel all matrix traffic through a secure peer-to-peer relay cluster.</p>
                  </div>
                  <button 
                    onClick={() => onToggleVPN(!vpnEnabled)}
                    className={`relative inline-flex h-14 w-28 items-center rounded-full transition-all duration-700 shadow-inner z-10 ${vpnEnabled ? 'bg-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.4)]' : 'bg-zinc-800'}`}
                  >
                    <span className={`inline-block h-11 w-11 transform rounded-full bg-white transition-all duration-700 ${vpnEnabled ? 'translate-x-15 shadow-2xl' : 'translate-x-1.5'}`} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-14 animate-in slide-in-from-bottom-8 duration-700">
                <div className="space-y-8">
                  <label className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em]">Inject Node Key</label>
                  <div className="flex flex-col sm:flex-row gap-5">
                    <input
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder={`Enter node authorization token...`}
                      className="flex-1 bg-zinc-900 border-2 border-white/5 rounded-[2rem] px-10 py-7 text-base text-white focus:outline-none focus:border-blue-600 transition-all font-black placeholder-zinc-800 shadow-inner"
                    />
                    <button
                      onClick={handleAddKey}
                      disabled={!newKey}
                      className="px-16 py-7 bg-white text-black font-black uppercase text-[12px] tracking-widest rounded-[2rem] hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-2xl disabled:opacity-20"
                    >
                      Inject
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em]">Active Cluster nodes</label>
                    <span className="text-[10px] font-black text-zinc-800 uppercase">{(activeTab === 'intelligence' ? apiKeys : youtubeKeys).length} nodes online</span>
                  </div>
                  <div className="grid gap-5 pb-16">
                    {(activeTab === 'intelligence' ? apiKeys : youtubeKeys).map((key, idx) => (
                      <div key={idx} className="flex items-center justify-between p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] group transition-all hover:bg-zinc-800/80 shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center gap-6">
                          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                          <span className="text-sm font-mono text-zinc-600 tracking-tight group-hover:text-zinc-200">{key.slice(0, 16)}••••••••{key.slice(-16)}</span>
                        </div>
                        <button 
                          onClick={() => {
                            if (activeTab === 'intelligence') onSaveKeys(apiKeys.filter((_, i) => i !== idx));
                            else onSaveYoutubeKeys(youtubeKeys.filter((_, i) => i !== idx));
                          }}
                          className="p-4 text-zinc-800 hover:text-red-500 transition-all active:scale-90 hover:bg-red-500/5 rounded-2xl"
                        >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    ))}
                    {(activeTab === 'intelligence' ? apiKeys : youtubeKeys).length === 0 && (
                      <div className="py-24 text-center space-y-5 bg-zinc-900/10 rounded-[4rem] border border-dashed border-white/5">
                        <p className="text-[12px] font-black text-zinc-800 uppercase tracking-[0.6em]">Neural cluster awaiting nodes</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-10 pt-10 border-t border-white/5 flex justify-end">
            <button onClick={onClose} className="w-full sm:w-auto px-20 py-7 bg-white text-black font-black uppercase text-[12px] tracking-widest rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-[0_40px_80px_rgba(0,0,0,0.6)] active:scale-95">Synchronize Hub</button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsModal;