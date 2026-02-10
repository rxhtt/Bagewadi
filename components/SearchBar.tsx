
import React, { useState, useRef, useEffect } from 'react';
import { SearchFocus, AttachedFile, ModelID } from '../types';
import FocusMenu from './FocusMenu';

interface Props {
  onSearch: (query: string, focus: SearchFocus, pro: boolean, model: ModelID, file?: AttachedFile) => void;
  isLoading: boolean;
  initialFocus?: SearchFocus;
}

const SearchBar: React.FC<Props> = ({ onSearch, isLoading, initialFocus = SearchFocus.ALL }) => {
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<SearchFocus>(initialFocus);
  const [model, setModel] = useState<ModelID>('sonar-pro');
  const [isFocusMenuOpen, setIsFocusMenuOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [query]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((query.trim() || attachedFile) && !isLoading) {
      onSearch(query.trim(), focus, true, model, attachedFile || undefined);
      setQuery('');
      setAttachedFile(null);
    }
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(prev => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachedFile({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          content: "[Context Attached]"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="bg-[#1e1f20] rounded-[32px] p-1.5 focus-within:bg-[#282a2d] transition-colors border border-transparent focus-within:border-zinc-700">
        {attachedFile && (
          <div className="px-4 py-3 flex items-center gap-3 animate-in fade-in">
            <div className="p-2 bg-zinc-800 rounded-lg text-blue-400">
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            </div>
            <span className="text-sm text-zinc-300 font-medium truncate flex-1">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-white">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-end px-3">
             <div className="flex-1 pb-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSearch())}
                  placeholder="Enter a prompt here"
                  className="w-full bg-transparent border-none focus:ring-0 text-[#e3e3e3] placeholder-zinc-500 resize-none py-3 text-base leading-relaxed overflow-hidden"
                />
             </div>
          </div>
          <div className="flex items-center justify-between px-3 py-1">
            <div className="flex items-center gap-1">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2.5 hover:bg-[#333537] text-[#c4c7c5] rounded-full transition-all"
                title="Upload image"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </button>
              <div className="relative">
                 <button 
                  type="button" 
                  onClick={() => setIsFocusMenuOpen(!isFocusMenuOpen)} 
                  className="p-2.5 hover:bg-[#333537] text-[#c4c7c5] rounded-full transition-all"
                  title="Search mode"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </button>
                {isFocusMenuOpen && <FocusMenu selected={focus} onSelect={setFocus} onClose={() => setIsFocusMenuOpen(false)} />}
              </div>
              <button 
                type="button" 
                onClick={startDictation} 
                className={`p-2.5 rounded-full transition-all ${isDictating ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-[#333537] text-[#c4c7c5]'}`}
                title="Voice to text"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
               {(query.trim() || attachedFile) && !isLoading && (
                 <button 
                  type="submit" 
                  onClick={() => handleSearch()}
                  className="p-2.5 text-blue-400 hover:bg-blue-400/10 rounded-full transition-all"
                >
                  <svg className="w-6 h-6 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                </button>
               )}
               {isLoading && (
                 <div className="w-8 h-8 flex items-center justify-center">
                   <div className="w-5 h-5 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin"/>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
