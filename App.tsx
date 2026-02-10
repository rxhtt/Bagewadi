
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import SettingsModal from './components/SettingsModal';
import ShortsCarousel from './components/ShortsCarousel';
import VideoModal from './components/VideoModal';
import { youtubeService } from './services/youtubeService';
import { gemini } from './services/geminiService';
import { ChatMessage, SearchFocus, Thread, AppView, AttachedFile, ModelID, ImageProvider, YoutubeShort } from './types';

const App: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [vpnEnabled, setVpnEnabled] = useState(() => localStorage.getItem('vpn_status') !== 'false');
  
  const [shorts, setShorts] = useState<YoutubeShort[]>([]);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [selectedShort, setSelectedShort] = useState<YoutubeShort | null>(null);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);

  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('pplx_keys');
    return saved ? JSON.parse(saved) : [];
  });

  const [imageKeys, setImageKeys] = useState<Record<ImageProvider, string[]>>(() => {
    const saved = localStorage.getItem('image_keys_pool');
    return saved ? JSON.parse(saved) : { openai: [], stability: [], replicate: [] };
  });

  const [youtubeKeys, setYoutubeKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('yt_keys_pool');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeImageProvider, setActiveImageProvider] = useState<ImageProvider>(() => {
    return (localStorage.getItem('active_img_provider') as ImageProvider) || 'openai';
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeThread = threads.find(t => t.id === activeThreadId);

  useEffect(() => {
    youtubeService.setKeys(youtubeKeys);
  }, [youtubeKeys]);

  const handleSaveYoutubeKeys = (keys: string[]) => {
    setYoutubeKeys(keys);
    localStorage.setItem('yt_keys_pool', JSON.stringify(keys));
    youtubeService.setKeys(keys);
  };

  useEffect(() => {
    const saved = localStorage.getItem('perplex-vault-threads');
    if (saved) {
      try { setThreads(JSON.parse(saved)); } catch (e) { console.error("Sync failed", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('perplex-vault-threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    if (currentView === 'discover' && shorts.length === 0) {
      loadDiscover();
    }
  }, [currentView, youtubeKeys]);

  const loadDiscover = async (query: string = "trending research") => {
    if (youtubeKeys.length === 0) {
      setIsSettingsOpen(true);
      return;
    }
    setIsDiscoverLoading(true);
    try {
      const data = await youtubeService.getShorts(query);
      setShorts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDiscoverLoading(false);
    }
  };

  const startNewThread = () => {
    setActiveThreadId(null);
    setCurrentView('home');
  };

  const handleSearch = async (query: string, focus: SearchFocus) => {
    const q = query.trim().toLowerCase();
    const isImageIntent = focus === SearchFocus.CANVAS || /draw|generate|paint|create an image|show me/i.test(q);

    if (isImageIntent) {
      await handleImageGeneration(query);
      return;
    }

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
      
      // Fix: Updated deprecated 'gemini-pro' to 'gemini-3-pro-preview' per guidelines.
      const response = await gemini.searchAndRespond(query, focus, 'gemini-3-pro-preview', history);

      // Contextual Video Discovery Logic
      let suggestedShorts: YoutubeShort[] = [];
      const videoKeywords = /video|short|watch|tutorial|youtube|how to|clips?|show me/i;
      if (videoKeywords.test(q) && youtubeKeys.length > 0) {
        // Clean the query for better search results
        const cleanQuery = q.replace(/video|short|watch|show me|youtube|how to|clips?/gi, '').trim();
        suggestedShorts = await youtubeService.getShorts(cleanQuery || "latest trends");
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
        messages: t.messages.map(m => m.id === assistantMsgId ? { ...m, content: `Neural link error: ${e.message}`, isSearching: false } : m)
      } : t));
    } finally {
      setIsLoading(false);
      // Ensure the latest message is in view
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  const handleImageGeneration = async (prompt: string) => {
    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      setThreads(prev => [{ id: currentThreadId!, title: prompt.substring(0, 30), messages: [], createdAt: Date.now() }, ...prev]);
      setActiveThreadId(currentThreadId);
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: prompt, type: 'text' };
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = { id: assistantMsgId, role: 'assistant', content: 'Synthesizing High-Fidelity Visual Nodes...', type: 'text', isSearching: true };

    setThreads(prev => prev.map(t => t.id === currentThreadId ? { ...t, messages: [...t.messages, userMsg, assistantMsg] } : t));
    setIsLoading(true);

    try {
      const imageUrl = await gemini.generateImage(prompt);
      setThreads(prev => prev.map(t => t.id === currentThreadId ? {
        ...t,
        messages: t.messages.map(m => m.id === assistantMsgId ? { 
          ...m, content: 'Neural synthesis complete.', type: 'image', imageUrl: imageUrl, isSearching: false
        } : m)
      } : t));
    } catch (e: any) {
      setThreads(prev => prev.map(t => t.id === currentThreadId ? {
        ...t,
        messages: t.messages.map(m => m.id === assistantMsgId ? { ...m, content: `Visual rendering failure: ${e.message}`, isSearching: false } : m)
      } : t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] overflow-hidden selection:bg-blue-600/30">
      <Sidebar 
        threads={threads} activeThreadId={activeThreadId} onNewThread={startNewThread} onSelectThread={setActiveThreadId} onOpenSettings={() => setIsSettingsOpen(true)}
        currentView={currentView} setView={setCurrentView} vpnEnabled={vpnEnabled} isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#131314]">
        {/* Futuristic Header */}
        <header className="h-16 flex items-center justify-between px-8 z-10 shrink-0 border-b border-white/5 bg-[#131314]/80 backdrop-blur-3xl sticky top-0">
           <div className="flex items-center gap-6">
             <button onClick={() => setIsMobileSidebarOpen(true)} className="p-3 hover:bg-zinc-800 rounded-full lg:hidden text-zinc-400 active:scale-90 transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>
             <div className="flex items-center gap-4">
                <span className="text-2xl font-black tracking-tighter text-white uppercase group cursor-default">
                  B<span className="text-blue-500 group-hover:text-red-500 transition-colors">AGE</span>WADI
                </span>
                <div className="hidden sm:flex items-center px-2 py-0.5 bg-zinc-800 rounded border border-white/10">
                   <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Quantum V2.1</span>
                </div>
             </div>
           </div>
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-500 transition-all hover:rotate-90 active:scale-90">
                 <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-[11px] font-black text-white shadow-2xl border border-white/10">BG</div>
           </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar custom-scrollbar relative scroll-smooth bg-[#131314]">
          {currentView === 'home' && (
            <div className="max-w-4xl mx-auto pt-24 px-6 space-y-24">
              {!activeThread || activeThread.messages.length === 0 ? (
                <>
                  <div className="space-y-6 text-center sm:text-left animate-in fade-in slide-in-from-left-10 duration-1000">
                    <h1 className="text-6xl sm:text-8xl font-black text-white w-fit pb-3 tracking-tighter leading-[0.85] uppercase">Master <br/><span className="gemini-gradient">Information.</span></h1>
                    <p className="text-zinc-500 text-xl font-medium max-w-2xl leading-relaxed tracking-tight">Your neural-linked gateway to global search, high-fidelity synthesis, and discovery.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-64">
                    {[
                      { icon: '🎨', text: 'Generate a realistic landscape of Mars colonisation' },
                      { icon: '🎬', text: 'Show me clips explaining string theory' },
                      { icon: '🧬', text: 'Analyze the latest breakthroughs in mRNA research' },
                      { icon: '💾', text: 'Architect a scalable distributed SQL database' }
                    ].map((suggestion, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSearch(suggestion.text, SearchFocus.ALL)}
                        className="p-10 bg-zinc-900/50 hover:bg-zinc-800 rounded-[3rem] text-left transition-all group relative h-64 border border-white/5 hover:border-white/20 hover:-translate-y-4 active:scale-95 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
                      >
                        <div className="text-4xl mb-8 transition-all duration-700 group-hover:scale-125 group-hover:rotate-12">{suggestion.icon}</div>
                        <span className="text-sm font-black text-zinc-400 group-hover:text-white line-clamp-3 leading-tight tracking-tight uppercase transition-colors">{suggestion.text}</span>
                        <div className="absolute bottom-8 right-8 p-4 bg-zinc-900 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-2xl border border-white/10 group-hover:translate-x-0 translate-x-10">
                          <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="max-w-4xl mx-auto px-6 py-16 space-y-24 pb-80">
                  {activeThread.messages.map((msg) => (
                    <div key={msg.id} className="flex gap-8 group animate-in fade-in slide-in-from-bottom-10 duration-700">
                      <div className="w-14 h-14 rounded-[1.75rem] shrink-0 flex items-center justify-center mt-2 shadow-2xl border border-white/10 overflow-hidden">
                        {msg.role === 'user' ? (
                          <div className="w-full h-full bg-gradient-to-tr from-blue-700 to-indigo-900 flex items-center justify-center font-black text-[10px] text-white tracking-widest">USER</div>
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                            <svg className="w-8 h-8 gemini-gradient" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-10">
                        {msg.type === 'image' && msg.imageUrl ? (
                          <div className="rounded-[3.5rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-[0_50px_100px_-25px_rgba(0,0,0,1)] group/img relative aspect-[16/10]">
                            <img src={msg.imageUrl} alt="AI Visual Node" className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover/img:scale-110" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all duration-700 flex items-center justify-center gap-10">
                               <a href={msg.imageUrl} download target="_blank" className="p-7 bg-white/10 backdrop-blur-3xl rounded-[2rem] text-white hover:bg-white/25 transition-all active:scale-90 border border-white/20 shadow-2xl">
                                 <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                               </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[19px] text-zinc-200 leading-[1.85] whitespace-pre-wrap font-medium tracking-tight">
                            {msg.content || (msg.isSearching && (
                              <div className="flex flex-col gap-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                                  <span className="text-zinc-600 text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">Syncing Quantum Nodes...</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden shadow-inner">
                                  <div className="h-full bg-blue-600 w-1/4 animate-[loading_1.8s_infinite_ease-in-out] shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {msg.shorts && msg.shorts.length > 0 && (
                          <div className="pt-12 border-t border-white/5">
                             {/* Fix: Replaced invalid horizontalOnly prop with layout="scroll" */}
                             <ShortsCarousel shorts={msg.shorts} onSelect={setSelectedShort} title="Foundational Video Clusters" layout="scroll" />
                          </div>
                        )}

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-3.5 pt-8">
                            {msg.sources.map((s, i) => (
                              <a key={i} href={s.uri} target="_blank" className="px-6 py-3 bg-zinc-900/40 hover:bg-zinc-800 border border-white/5 rounded-full text-[11px] font-black text-zinc-500 hover:text-white transition-all shadow-xl flex items-center gap-3 group/src">
                                 <span className="w-2 h-2 rounded-full bg-blue-600/30 group-hover/src:bg-blue-500 shadow-lg"></span>
                                 <span className="tracking-tighter">{s.title}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {msg.role === 'assistant' && !msg.isSearching && (
                          <div className="flex items-center gap-5 pt-12 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className="p-4 hover:bg-zinc-800 rounded-3xl text-zinc-600 hover:text-white transition-all border border-transparent hover:border-white/5 shadow-2xl active:scale-90" title="Relevant Response"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></button>
                             <button className="p-4 hover:bg-zinc-800 rounded-3xl text-zinc-600 hover:text-white transition-all border border-transparent hover:border-white/5 shadow-2xl active:scale-90" title="Copy Session Log"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                             <button className="p-4 hover:bg-zinc-800 rounded-3xl text-zinc-600 hover:text-white transition-all border border-transparent hover:border-white/5 shadow-2xl active:scale-90" title="Export Thread"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'discover' && (
            <div className="max-w-6xl mx-auto px-8 py-24 space-y-24 pb-96">
              <div className="space-y-6 text-center animate-in fade-in slide-in-from-top-12 duration-1000">
                <h1 className="text-8xl font-black text-white tracking-tighter uppercase leading-[0.75]">Global <br/><span className="text-red-600">Discover.</span></h1>
                <p className="text-zinc-600 text-xl font-black tracking-[0.5em] uppercase">High-Fidelity Stream Matrix</p>
              </div>

              {/* Discovery Search Node */}
              <div className="relative group max-w-4xl mx-auto filter drop-shadow-[0_40px_100px_rgba(220,38,38,0.15)]">
                <input 
                  type="text" 
                  value={discoverQuery}
                  onChange={(e) => setDiscoverQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadDiscover(discoverQuery)}
                  placeholder="Query global streams network..."
                  className="w-full bg-zinc-900/80 border-2 border-white/5 rounded-[4rem] px-24 py-8 focus:outline-none focus:border-red-600/60 transition-all shadow-[0_0_120px_rgba(0,0,0,0.6)] font-black text-2xl text-white placeholder-zinc-700 uppercase tracking-tight backdrop-blur-3xl"
                />
                <div className="absolute left-10 top-1/2 -translate-y-1/2 text-zinc-700 group-hover:text-red-600 transition-colors duration-700">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                {discoverQuery && (
                  <button onClick={() => loadDiscover(discoverQuery)} className="absolute right-10 top-1/2 -translate-y-1/2 px-12 py-4 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-[2rem] transition-all active:scale-95 shadow-2xl border border-white/10">
                    Sync Feed
                  </button>
                )}
              </div>

              {youtubeKeys.length === 0 ? (
                <div className="p-28 text-center bg-zinc-900/10 border-2 border-dashed border-white/5 rounded-[5rem] space-y-12 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.4)]">
                  <div className="w-28 h-28 bg-red-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-red-600 shadow-inner border border-red-600/20">
                     <svg className="w-14 h-14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                  </div>
                  <div className="space-y-4">
                    <p className="text-zinc-100 font-black text-4xl tracking-tighter uppercase leading-none">Cluster Node Offline</p>
                    <p className="text-zinc-500 text-lg font-bold max-w-md mx-auto leading-relaxed tracking-tight">Authorization mismatch. Inject a valid YouTube API Access Node in System Configuration to bootstrap the high-fidelity video matrix.</p>
                  </div>
                  <button onClick={() => setIsSettingsOpen(true)} className="px-16 py-6 bg-zinc-800 hover:bg-white hover:text-black text-white font-black uppercase tracking-widest text-xs rounded-full transition-all shadow-2xl active:scale-95 border border-white/5">Access Config</button>
                </div>
              ) : isDiscoverLoading ? (
                <div className="flex flex-col items-center justify-center p-48 space-y-12">
                  <div className="w-28 h-28 border-8 border-red-600/10 border-t-red-600 rounded-full animate-spin shadow-[0_0_80px_rgba(220,38,38,0.5)]"></div>
                  <div className="text-center space-y-4">
                    <p className="text-white font-black text-3xl tracking-tighter uppercase">Initializing Streams</p>
                    <p className="text-zinc-700 text-xs uppercase tracking-[0.6em] font-black animate-pulse">Establishing Peer-to-Peer Global Hook</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-32">
                   <ShortsCarousel shorts={shorts} onSelect={setSelectedShort} title="Primary Discovery Clusters" />
                </div>
              )}
            </div>
          )}

          {currentView === 'library' && (
             <div className="max-w-6xl mx-auto py-32 px-10 space-y-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
               <div className="space-y-8">
                  <h1 className="text-9xl font-black text-white tracking-tighter uppercase leading-[0.75]">Log Vault.</h1>
                  <p className="text-zinc-700 text-2xl font-black tracking-[0.5em] uppercase">High-Fidelity History Logs</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-96">
                 {threads.length === 0 ? (
                    <div className="col-span-2 p-48 text-center text-zinc-900 font-black tracking-[1em] bg-zinc-900/10 rounded-[6rem] border-2 border-dashed border-white/5 uppercase text-xs">Void Status: 0 Active Node Records</div>
                 ) : threads.map(t => (
                   <div key={t.id} onClick={() => { setActiveThreadId(t.id); setCurrentView('home'); }} className="bg-zinc-900/40 border border-white/5 rounded-[4rem] p-16 hover:bg-zinc-800/80 hover:border-blue-600/30 transition-all cursor-pointer flex justify-between items-center group shadow-[0_40px_80px_rgba(0,0,0,0.6)] hover:-translate-y-4">
                     <div className="flex flex-col gap-6 min-w-0">
                       <h3 className="text-4xl font-black text-zinc-200 group-hover:text-blue-500 truncate pr-12 tracking-tighter uppercase transition-colors duration-500">{t.title}</h3>
                       <div className="flex items-center gap-6">
                         <span className="text-[12px] font-black uppercase text-zinc-700 tracking-[0.3em]">{new Date(t.createdAt).toLocaleDateString()}</span>
                         <div className="w-2.5 h-2.5 bg-zinc-800 rounded-full"></div>
                         <span className="text-[12px] font-black uppercase text-zinc-700 tracking-[0.3em]">{t.messages.length} NODES SYNCED</span>
                       </div>
                     </div>
                     <div className="p-7 bg-zinc-900 rounded-[2.5rem] text-zinc-800 group-hover:text-white group-hover:bg-blue-600 shadow-2xl transition-all duration-700 active:scale-90 border border-white/5">
                       <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={5}><path d="m9 18 6-6-6-6"/></svg>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        {/* Floating Input Dock Node */}
        {(currentView === 'home' || (activeThread && activeThread.messages.length > 0)) && (
          <div className="shrink-0 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent pt-32 pb-14 px-10">
             <div className="max-w-4xl mx-auto filter drop-shadow-[0_50px_120px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-24 duration-[1400ms]">
                <SearchBar onSearch={handleSearch} isLoading={isLoading} />
             </div>
          </div>
        )}

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          apiKeys={apiKeys}
          onSaveKeys={(keys) => { setApiKeys(keys); localStorage.setItem('pplx_keys', JSON.stringify(keys)); }}
          imageKeys={imageKeys}
          onSaveImageKeys={(provider, keys) => {
             const updated = { ...imageKeys, [provider]: keys };
             setImageKeys(updated);
             localStorage.setItem('image_keys_pool', JSON.stringify(updated));
          }}
          youtubeKeys={youtubeKeys}
          onSaveYoutubeKeys={handleSaveYoutubeKeys}
          activeImageProvider={activeImageProvider}
          onSetActiveImageProvider={setActiveImageProvider}
          vpnEnabled={vpnEnabled} 
          onToggleVPN={(v) => {setVpnEnabled(v); localStorage.setItem('vpn_status', String(v));}} 
        />

        <VideoModal short={selectedShort} onClose={() => setSelectedShort(null)} />
      </main>
      
      {/* Neural Core Styles */}
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2a2c2e;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3a3c3e;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;
