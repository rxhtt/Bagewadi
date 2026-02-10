import React, { useState } from 'react';
import { perplexity } from '../services/perplexityService';
import { imageService } from '../services/imageService';
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
  isOpen, onClose, apiKeys, onSaveKeys, imageKeys, onSaveImageKeys, 
  youtubeKeys, onSaveYoutubeKeys,
  activeImageProvider, onSetActiveImageProvider, vpnEnabled, onToggleVPN 
}) => {
  const [newKey, setNewKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'intelligence' | 'visuals' | 'youtube' | 'network'>('intelligence');
  const [activeVisualProvider, setActiveVisualProvider] = useState<ImageProvider>(activeImageProvider);

  if (!isOpen) return null;

  const handleAddKey = async () => {
    if (!newKey.trim()) return;
    setIsValidating(true);
    setValidationError(null);

    try {
      if (activeTab === 'intelligence') {
        const isValid = await perplexity.validateKey(newKey.trim());
        if (isValid) {
          onSaveKeys([...apiKeys, newKey.trim()]);
          setNewKey('');
        } else {
          setValidationError('Validation failed. Ensure the Perplexity key is correct and has active credits.');
        }
      } else if (activeTab === 'visuals') {
        const isValid = await imageService.validateKey(activeVisualProvider, newKey.trim());
        if (isValid) {
          onSaveImageKeys(activeVisualProvider, [...imageKeys[activeVisualProvider], newKey.trim()]);
          setNewKey('');
        } else {
          setValidationError(`Failed to authenticate ${activeVisualProvider.toUpperCase()} node.`);
        }
      } else if (activeTab === 'youtube') {
        // Simple length validation for YouTube keys as they don't have a standardized lightweight ping always
        if (newKey.length > 10) {
           onSaveYoutubeKeys([...youtubeKeys, newKey.trim()]);
           setNewKey('');
        } else {
          setValidationError('Invalid YouTube Data API key format.');
        }
      }
    } catch (e) {
      setValidationError('An error occurred during key injection.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveKey = (provider: 'intelligence' | ImageProvider | 'youtube', index: number) => {
    if (provider === 'intelligence') onSaveKeys(apiKeys.filter((_, i) => i !== index));
    else if (provider === 'youtube') onSaveYoutubeKeys(youtubeKeys.filter((_, i) => i !== index));
    else onSaveImageKeys(provider, imageKeys[provider].filter((_, i) => i !== index));
  };

  const tabs = [
    { id: 'intelligence', label: 'Intelligence', desc: 'Perplexity / Search', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg> },
    { id: 'visuals', label: 'Visuals', desc: 'DALL-E / Flux', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> },
    { id: 'youtube', label: 'YouTube API', desc: 'Video Discovery', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="15" x="2" y="4.5" rx="2.18"/><polygon points="10 9 15 12 10 15 10 9"/></svg> },
    { id: 'network', label: 'Network', desc: 'VPN / Secure Tunnel', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-[#1c1c1e] border border-white/10 rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,1)] overflow-hidden flex flex-col md:flex-row h-[700px]">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-72 bg-black/30 border-r border-white/5 p-8 flex flex-col gap-2 shrink-0">
          <div className="mb-10 px-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Vault</h2>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Infrastructure Config</p>
          </div>
          
          <div className="flex flex-col gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setValidationError(null); setNewKey(''); }}
                className={`flex items-center gap-4 px-6 py-5 rounded-[2rem] transition-all group ${
                  activeTab === tab.id ? 'bg-zinc-800 text-white shadow-2xl' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <div className={`${activeTab === tab.id ? 'text-blue-500' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                   {tab.icon}
                </div>
                <div className="flex flex-col items-start min-w-0">
                   <span className="text-xs font-black uppercase tracking-widest leading-none mb-1">{tab.label}</span>
                   <span className="text-[9px] font-bold text-zinc-600 group-hover:text-zinc-500 truncate">{tab.desc}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-auto p-6 bg-blue-600/5 rounded-[2.5rem] border border-blue-600/10">
            <p className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest leading-relaxed text-center">
              Gemini Pro Core Cluster is synced and active.
            </p>
          </div>
        </aside>

        {/* Dynamic Content Main View */}
        <main className="flex-1 flex flex-col p-12 overflow-hidden bg-gradient-to-br from-transparent to-zinc-900/20">
          <header className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-1">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <p className="text-sm font-medium text-zinc-500 tracking-tight">Syncing auxiliary nodes for the global intelligence grid.</p>
            </div>
            <button onClick={onClose} className="p-4 hover:bg-zinc-800 rounded-full text-zinc-500 transition-all active:scale-90 border border-white/5 shadow-xl">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-6">
            {activeTab === 'network' ? (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="p-10 bg-zinc-900/60 rounded-[3rem] border border-white/5 flex items-center justify-between shadow-2xl">
                  <div className="space-y-3">
                    <h4 className="text-lg font-black text-white uppercase tracking-widest">WireGuard Node Tunnel</h4>
                    <p className="text-sm text-zinc-500 font-medium max-w-sm leading-snug">Redirect all search traffic through a high-bandwidth peer-to-peer secure exit node.</p>
                  </div>
                  <button 
                    onClick={() => onToggleVPN(!vpnEnabled)}
                    className={`relative inline-flex h-10 w-18 items-center rounded-full transition-all duration-700 ${vpnEnabled ? 'bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.5)]' : 'bg-zinc-800'}`}
                  >
                    <div className={`h-18 w-18 flex items-center justify-center`}>
                       <span className={`inline-block h-7 w-7 transform rounded-full bg-white transition-all duration-500 ${vpnEnabled ? 'translate-x-9 shadow-2xl' : 'translate-x-1.5'}`} />
                    </div>
                  </button>
                </div>
                
                <div className={`p-12 rounded-[3rem] border transition-all duration-1000 ${vpnEnabled ? 'bg-blue-600/10 border-blue-600/20' : 'bg-zinc-900/20 border-white/5'}`}>
                  <h4 className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-6">Status Terminal</h4>
                  <div className="flex items-center gap-6">
                     <div className={`w-4 h-4 rounded-full ${vpnEnabled ? 'bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'bg-zinc-800'}`}></div>
                     <p className="text-3xl font-black text-zinc-100 uppercase tracking-tighter leading-none">
                        {vpnEnabled ? 'Link: ESTABLISHED' : 'Link: PUBLIC_STREAM'}
                     </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                
                {activeTab === 'visuals' && (
                  <div className="space-y-6">
                    <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em]">Visual Synthesis Provider</label>
                    <div className="flex gap-3 p-2 bg-black/40 rounded-[2rem] border border-white/5 shadow-inner">
                      {(['openai', 'stability', 'replicate'] as ImageProvider[]).map(p => (
                        <button 
                          key={p} 
                          onClick={() => { setActiveVisualProvider(p); onSetActiveImageProvider(p); setNewKey(''); setValidationError(null); }} 
                          className={`flex-1 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeVisualProvider === p ? 'bg-zinc-800 text-white shadow-2xl border border-white/5' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em]">
                    {activeTab === 'intelligence' ? 'Perplexity Discovery Node' : activeTab === 'youtube' ? 'YouTube Cloud Infra Key' : activeVisualProvider.toUpperCase() + ' Synthesis Node'}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder={`Inject ${activeTab === 'youtube' ? 'YouTube' : activeTab === 'intelligence' ? 'Perplexity' : activeVisualProvider} key...`}
                      className="flex-1 bg-zinc-900/80 border-2 border-white/5 rounded-[2rem] px-8 py-5 text-base text-white focus:outline-none focus:border-blue-600 transition-all font-bold placeholder-zinc-700 shadow-inner"
                    />
                    <button
                      onClick={handleAddKey}
                      disabled={isValidating || !newKey}
                      className={`px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-[2rem] transition-all shrink-0 ${isValidating ? 'opacity-50' : 'hover:bg-blue-600 hover:text-white active:scale-95 shadow-[0_15px_30px_rgba(0,0,0,0.5)]'}`}
                    >
                      {isValidating ? 'Validating...' : 'Inject Key'}
                    </button>
                  </div>
                  {validationError && (
                    <div className="p-5 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center gap-4 text-red-500">
                       <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                       <p className="text-xs font-black uppercase tracking-widest leading-tight">{validationError}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em]">Active Node Cluster</label>
                    <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                       {(activeTab === 'intelligence' ? apiKeys : activeTab === 'youtube' ? youtubeKeys : imageKeys[activeVisualProvider]).length} Nodes Active
                    </span>
                  </div>
                  <div className="space-y-4">
                    {(activeTab === 'intelligence' ? apiKeys : activeTab === 'youtube' ? youtubeKeys : imageKeys[activeVisualProvider]).length === 0 ? (
                      <div className="p-16 border-2 border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center justify-center text-center space-y-6 grayscale opacity-30">
                        <div className="w-20 h-20 rounded-[2rem] bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L22 22m-5-5l4-4"/></svg>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">Node Cluster: VOID</p>
                      </div>
                    ) : (activeTab === 'intelligence' ? apiKeys : activeTab === 'youtube' ? youtubeKeys : imageKeys[activeVisualProvider]).map((key, idx) => (
                      <div key={idx} className="flex items-center justify-between p-6 bg-zinc-900/60 border border-white/5 rounded-[2rem] group transition-all hover:bg-zinc-800 hover:border-blue-600/30 shadow-xl">
                        <div className="flex items-center gap-5">
                          <div className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.6)]"></div>
                          <span className="text-sm font-mono text-zinc-400 tracking-tight group-hover:text-zinc-200 transition-colors">
                            {key.slice(0, 16)}••••••••{key.slice(-8)}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRemoveKey(activeTab === 'intelligence' ? 'intelligence' : activeTab === 'youtube' ? 'youtube' : activeVisualProvider, idx)} 
                          className="p-3 text-zinc-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-xl"
                        >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <footer className="mt-12 pt-10 border-t border-white/5 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Enterprise V2 Secure Core</span>
             </div>
             <button onClick={onClose} className="px-14 py-5 bg-white text-black hover:bg-blue-600 hover:text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-full transition-all active:scale-95 shadow-2xl border border-white/10">Confirm Link</button>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default SettingsModal;