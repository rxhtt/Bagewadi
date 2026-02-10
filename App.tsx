import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import SettingsModal from './components/SettingsModal';
import ShortsCarousel from './components/ShortsCarousel';
import VideoModal from './components/VideoModal';
import { youtubeService } from './services/youtubeService';
import { perplexity } from './services/perplexityService';
import { ChatMessage, SearchFocus, Thread, AppView, YoutubeShort, DiscoveryMode } from './types';

const App: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [vpnEnabled, setVpnEnabled] = useState(() => localStorage.getItem('vpn_status') !== 'false');
  
  // Aether-Stream Multimedia States
  const [shorts, setShorts] = useState<YoutubeShort[]>([]);
  const [music, setMusic] = useState<YoutubeShort[]>([]);
  const [videos, setVideos] = useState<YoutubeShort[]>([]);
  const [discoverySearchQuery, setDiscoverySearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<YoutubeShort | null>(null);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);
  
  // Infinite Scroll Helpers
  const [discoveryPage, setDiscoveryPage] = useState(1);
  const discoverObserverTarget = useRef<HTMLDivElement>(null);

  const [apiKeys, setApiKeys] = useState<string[]>(() => JSON.parse(localStorage.getItem('pplx_keys') || '[]'));
  const [youtubeKeys, setYoutubeKeys] = useState<string[]>(() => JSON.parse(localStorage.getItem('yt_keys_pool') || '[]'));

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeThread = threads.find(t => t.id === activeThreadId);

  useEffect(() => { perplexity.setKeys(apiKeys); }, [apiKeys]);
  useEffect(() => { youtubeService.setKeys(youtubeKeys); }, [youtubeKeys]);

  // Load Initial Discovery or reset on category change
  useEffect(() => {
    if (currentView === 'discover') {
      setShorts([]);
      setMusic([]);
      setVideos([]);
      setDiscoveryPage(1);
      loadDiscovery(discoverySearchQuery || getDefaultQuery(discoveryMode));
    }
  }, [currentView, discoveryMode]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    if (currentView !== 'discover') return;
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isDiscoverLoading) {
          setDiscoveryPage(p => p + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (discoverObserverTarget.current) {
      observer.observe(discoverObserverTarget.current);
    }

    return () => observer.disconnect();
  }, [currentView, isDiscoverLoading]);

  // Fetch more results when discovery page increments
  useEffect(() => {
    if (discoveryPage > 1 && currentView === 'discover') {
      loadDiscovery(discoverySearchQuery || getDefaultQuery(discoveryMode), true);
    }
  }, [discoveryPage]);

  const getDefaultQuery = (mode: DiscoveryMode) => {
    switch(mode) {
      case 'music': return "top global music hits 2025";
      case 'shorts': return "most viral shorts global";
      case 'youtube': return "trending global news events";
      default: return "latest global technology and science news";
    }
  };

  const loadDiscovery = async (query: string, append: boolean = false) => {
    if (youtubeKeys.length === 0) {
      setIsSettingsOpen(true);
      return;
    }
    setIsDiscoverLoading(true);
    try {
      const results = await Promise.all([
        discoveryMode === 'all' || discoveryMode === 'shorts' ? youtubeService.getShorts(query) : Promise.resolve([]),
        discoveryMode === 'all' || discoveryMode === 'music' ? youtubeService.getMusic(query) : Promise.resolve([]),
        discoveryMode === 'all' || discoveryMode === 'youtube' ? youtubeService.getVideos(query) : Promise.resolve([])
      ]);
      
      setShorts(prev => append ? [...prev, ...results[0]] : results[0]);
      setMusic(prev => append ? [...prev, ...results[1]] : results[1]);
      setVideos(prev => append ? [...prev, ...results[2]] : results[2]);
    } catch (e) {
      console.error("Discovery Engine Error:", e);
    } finally {
      setIsDiscoverLoading(false);
    }
  };

  const handleDiscoverySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShorts([]);
    setMusic([]);
    setVideos([]);
    setDiscoveryPage(1);
    loadDiscovery(discoverySearchQuery || getDefaultQuery(discoveryMode));
  };

  const handleSearch = async (query: string, focus: SearchFocus) => {
    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      const newThread: Thread = { id: currentThreadId, title: query.substring(0, 50), messages: [], createdAt: Date.now() };
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(currentThreadId);
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: query, type: 'text' };
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = { id: assistantMsgId, role: 'assistant', content: '', type: 'text', isSearching: true, sources: [] };

    setThreads(prev => prev.map(t => t.id === currentThreadId ? { ...t, messages: [...t.messages, userMsg, assistantMsg] } : t));
    setIsLoading(true);

    try {
      const threadToQuery = threads.find(t => t.id === currentThreadId) || { messages: [] };
      const history = (threadToQuery.messages || []).map(m => ({ role: m.role, content: m.content }));
      
      const response = await perplexity.searchAndRespond(query, focus, 'sonar-pro', history);

      let suggestedShorts: YoutubeShort[] = [];
      if (youtubeKeys.length > 0) {
        suggestedShorts = await youtubeService.getVideos(query);
      }

      setThreads(prev => prev.map(t => t.id === currentThreadId ? {
        ...t,
        messages: t.messages.map(m => m.id === assistantMsgId ? { 
          ...m, 
          content: response.content, 
          sources: response.sources, 
          shorts: suggestedShorts,
          relatedQuestions: response.related, 
          isSearching: false 
        } : m)
      } : t));
    } catch (e: any) {
      setThreads(prev => prev.map(t => t.id === currentThreadId ? {
        ...t,
        messages: t.messages.map(m => m.id === assistantMsgId ? { ...m, content: `Neural Node Timeout. Check Keys in System Config.`, isSearching: false } : m)
      } : t));
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#f5f5f7] overflow-hidden selection:bg-blue-600/40">
      <Sidebar 
        threads={threads} activeThreadId={activeThreadId} onNewThread={() => { setActiveThreadId(null); setCurrentView('home'); }} 
        onSelectThread={setActiveThreadId} onOpenSettings={() => setIsSettingsOpen(true)}
        currentView={currentView} setView={setCurrentView} 
        discoveryMode={discoveryMode} setDiscoveryMode={setDiscoveryMode}
        vpnEnabled={vpnEnabled} isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-20 flex items-center justify-between px-8 z-30 border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl lg:hidden">
           <button onClick={() => setIsMobileSidebarOpen(true)} className="p-3 bg-zinc-900 rounded-2xl text-zinc-400 active-tap">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <span className="text-xl font-black tracking-tighter text-white uppercase">Bagewadi</span>
           <div className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden active-tap" onClick={() => setIsSettingsOpen(true)}>
              <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=100&auto=format&fit=crop" className="w-full h-full object-cover" />
           </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar custom-scrollbar relative scroll-smooth bg-[#050505]">
          {currentView === 'home' && (
            <div className="max-w-4xl mx-auto pt-24 md:pt-40 px-6 space-y-24 pb-48">
              {!activeThread || activeThread.messages.length === 0 ? (
                <div className="space-y-12 py-12 text-center md:text-left animate-in fade-in slide-in-from-bottom-12 duration-1000 cubic-bezier(0.2, 0.8, 0.2, 1)">
                  <h1 className="text-7xl md:text-[10rem] font-black text-white tracking-tighter leading-[0.75] uppercase">PURE <br/><span className="text-zinc-800">SYNC.</span></h1>
                  <p className="text-zinc-600 text-xl md:text-2xl font-black uppercase tracking-[0.5em] leading-none">BAGEWADI STREAM HUB</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-20">
                    {[
                      { icon: '🧬', text: 'Analyze mRNA innovations for cancer 2025' },
                      { icon: '🌌', text: 'Synthesize the state of nuclear fusion trajectory' }
                    ].map((s, i) => (
                      <button key={i} onClick={() => handleSearch(s.text, SearchFocus.ALL)} className="p-10 bg-zinc-900/40 hover:bg-zinc-800 border border-white/5 rounded-[3rem] text-left transition-all active-tap shadow-2xl">
                        <div className="text-4xl mb-6">{s.icon}</div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 leading-relaxed">{s.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-20 py-12 pb-96">
                  {activeThread.messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-6 sm:gap-8 animate-in fade-in slide-in-from-bottom-12 duration-[800ms] ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-14 h-14 rounded-[1.5rem] bg-zinc-900 border border-white/10 shrink-0 flex items-center justify-center shadow-xl">
                          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>
                        </div>
                      )}
                      <div className={`flex-1 max-w-[92%] sm:max-w-[85%] space-y-8 ${msg.role === 'user' ? 'chat-bubble-user p-8 text-white font-medium' : 'chat-bubble-ai'}`}>
                        <div className="text-[19px] sm:text-[21px] leading-relaxed whitespace-pre-wrap tracking-tight font-medium text-zinc-200">
                          {msg.content || (msg.isSearching && (
                            <div className="space-y-6">
                              <div className="flex items-center gap-4">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                                <span className="text-zinc-600 text-[11px] font-black uppercase tracking-[0.4em] animate-pulse">Syncing Matrix Hub...</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {msg.sources.map((s, i) => (
                              <a key={i} href={s.uri} target="_blank" className="px-5 py-2.5 bg-zinc-900/60 border border-white/5 rounded-full text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-tighter shadow-lg transition-all active-tap">{s.title}</a>
                            ))}
                          </div>
                        )}
                        {msg.shorts && msg.shorts.length > 0 && <ShortsCarousel shorts={msg.shorts} onSelect={setSelectedMedia} title="Multimedia Synthesis" layout="scroll" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'discover' && (
            <div className="max-w-7xl mx-auto px-6 py-20 md:py-32 space-y-24 pb-64">
              <header className="space-y-8 text-center md:text-left">
                <h1 className="text-8xl md:text-[11rem] font-black text-white tracking-tighter uppercase leading-[0.75]">BAGEWADI <br/><span className="text-zinc-900">FEEDS.</span></h1>
                <p className="text-zinc-700 font-black uppercase text-sm tracking-[0.8em] animate-pulse">
                  {discoveryMode === 'all' ? 'Infinity Global Sync' : `${discoveryMode.toUpperCase()} Protocol Matrix`}
                </p>
              </header>

              {/* Discovery Dedicated Native Search */}
              <div className="max-w-2xl mx-auto md:mx-0">
                <form onSubmit={handleDiscoverySearch} className="relative group">
                   <input 
                    type="text"
                    value={discoverySearchQuery}
                    onChange={(e) => setDiscoverySearchQuery(e.target.value)}
                    placeholder={`Search within ${discoveryMode === 'all' ? 'Universal Feed' : discoveryMode.toUpperCase()}...`}
                    className="w-full bg-zinc-900/40 border-2 border-white/5 rounded-3xl px-10 py-6 focus:outline-none focus:border-blue-500 transition-all font-bold text-white uppercase tracking-widest text-[13px] shadow-2xl backdrop-blur-3xl"
                   />
                   <button type="submit" className="absolute right-5 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-full active-tap shadow-lg hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                   </button>
                </form>
              </div>

              <div className="space-y-40">
                {(discoveryMode === 'all' || discoveryMode === 'music') && (
                  <ShortsCarousel shorts={music} onSelect={setSelectedMedia} title="Global Music Charts (Ad-Less)" layout="scroll" />
                )}
                {(discoveryMode === 'all' || discoveryMode === 'shorts') && (
                  <ShortsCarousel shorts={shorts} onSelect={setSelectedMedia} title="Neural Shorts Flow" layout="scroll" />
                )}
                {(discoveryMode === 'all' || discoveryMode === 'youtube') && (
                  <ShortsCarousel shorts={videos} onSelect={setSelectedMedia} title="Universal Multimedia Hub" layout="scroll" />
                )}
                
                {isDiscoverLoading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-6">
                    <div className="w-14 h-14 border-4 border-zinc-900 border-t-blue-500 rounded-full animate-spin shadow-2xl"></div>
                    <p className="text-zinc-700 font-black uppercase text-[10px] tracking-[1em] animate-pulse">Syncing Matrix nodes...</p>
                  </div>
                )}
                
                {/* Scroll Target for Countless Infinite Loading */}
                <div ref={discoverObserverTarget} className="h-40 w-full flex items-center justify-center">
                  {!isDiscoverLoading && (
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-900 to-transparent flex items-center justify-center">
                       <span className="bg-[#050505] px-10 text-[9px] font-black text-zinc-800 uppercase tracking-[2em] whitespace-nowrap">End of Current Matrix</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'library' && (
            <div className="max-w-5xl mx-auto px-6 py-24 space-y-24 pb-96">
               <h1 className="text-8xl font-black text-white tracking-tighter uppercase leading-none">THE VAULT.</h1>
               <div className="grid gap-6">
                 {threads.length === 0 ? (
                   <div className="py-40 text-center bg-zinc-900/20 rounded-[4rem] border border-dashed border-white/5 animate-in zoom-in-95 duration-700">
                      <p className="text-zinc-700 font-black uppercase tracking-[0.5em]">Vault Status: Empty</p>
                   </div>
                 ) : threads.map(t => (
                   <button key={t.id} onClick={() => { setActiveThreadId(t.id); setCurrentView('home'); }} className="p-10 bg-zinc-900/40 rounded-[3rem] border border-white/5 text-left hover:border-blue-500/30 transition-all flex justify-between items-center group active-tap shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                     <div className="min-w-0 pr-8">
                       <h3 className="text-4xl font-black text-zinc-200 group-hover:text-white truncate tracking-tighter uppercase">{t.title}</h3>
                       <p className="text-[11px] text-zinc-700 font-black uppercase tracking-widest mt-4">{new Date(t.createdAt).toLocaleDateString()} — Log record node</p>
                     </div>
                     <div className="p-6 bg-zinc-950 rounded-2xl text-zinc-800 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner group-hover:rotate-12 duration-500">
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={5}><path d="m9 18 6-6-6-6"/></svg>
                     </div>
                   </button>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Floating Android Search Hub */}
        {(currentView === 'home' || activeThreadId) && (
          <div className="shrink-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-40 pb-12 px-8 relative z-20">
             <div className="max-w-3xl mx-auto shadow-[0_60px_120px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-24 duration-[1200ms]">
                <SearchBar onSearch={handleSearch} isLoading={isLoading} />
             </div>
          </div>
        )}

        <SettingsModal 
          isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} 
          apiKeys={apiKeys} onSaveKeys={(keys) => { setApiKeys(keys); localStorage.setItem('pplx_keys', JSON.stringify(keys)); }}
          imageKeys={{openai: [], stability: [], replicate: []}} onSaveImageKeys={() => {}}
          youtubeKeys={youtubeKeys} onSaveYoutubeKeys={(keys) => { setYoutubeKeys(keys); localStorage.setItem('yt_keys_pool', JSON.stringify(keys)); }}
          activeImageProvider="openai" onSetActiveImageProvider={() => {}}
          vpnEnabled={vpnEnabled} onToggleVPN={(v) => {setVpnEnabled(v); localStorage.setItem('vpn_status', String(v));}} 
        />
        
        <VideoModal short={selectedMedia} onClose={() => setSelectedMedia(null)} />
      </main>
      <style>{`
        @keyframes loading { 0% { left: -100%; } 100% { left: 500%; } }
      `}</style>
    </div>
  );
};

export default App;