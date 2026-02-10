
import React from 'react';
import { SearchFocus, FocusOption } from '../types';

const FOCUS_OPTIONS: FocusOption[] = [
  { id: SearchFocus.ALL, label: 'All', description: 'Across the entire internet', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  ) as any },
  { id: SearchFocus.ACADEMIC, label: 'Academic', description: 'Published journals & papers', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
  ) as any },
  { id: SearchFocus.WRITING, label: 'Writing', description: 'Generate without search', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1l1-4 9.5-9.5z"/></svg>
  ) as any },
  { id: SearchFocus.CANVAS, label: 'Canvas', description: 'Generate visuals directly', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
  ) as any },
  { id: SearchFocus.YOUTUBE, label: 'YouTube', description: 'Video transcripts', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="15" x="2" y="4.5" rx="2.18"/><polygon points="10 9 15 12 10 15 10 9"/></svg>
  ) as any },
  { id: SearchFocus.REDDIT, label: 'Reddit', description: 'Discussions & forums', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  ) as any },
];

interface Props {
  selected: SearchFocus;
  onSelect: (focus: SearchFocus) => void;
  onClose: () => void;
}

const FocusMenu: React.FC<Props> = ({ selected, onSelect, onClose }) => {
  return (
    <div className="absolute bottom-full left-0 mb-3 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 backdrop-blur-xl bg-opacity-95">
      <div className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em] border-b border-zinc-800/50 mb-1.5 flex items-center justify-between">
        Search Focus
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      {FOCUS_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            onSelect(opt.id);
            onClose();
          }}
          className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all text-left group ${
            selected === opt.id ? 'bg-zinc-800 text-white shadow-lg' : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-white'
          }`}
        >
          <div className={`p-2 rounded-lg transition-colors ${selected === opt.id ? 'bg-zinc-700' : 'bg-zinc-900 group-hover:bg-zinc-800'}`}>
            {opt.icon}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold leading-none mb-1">{opt.label}</span>
            <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate leading-none">{opt.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FocusMenu;
