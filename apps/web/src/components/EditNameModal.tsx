'use client';

import React, { useState, useEffect } from 'react';
import { User, Edit3, Check, X, Sparkles } from 'lucide-react';

interface EditNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onSave: (newName: string) => void;
}

export const EditNameModal: React.FC<EditNameModalProps> = ({
  isOpen,
  onClose,
  currentName,
  onSave,
}) => {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(currentName);
    setError('');
  }, [currentName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }
    if (trimmed.length > 24) {
      setError('Name must be 24 characters or less');
      return;
    }
    onSave(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#121620] border border-orange-500/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden glow-orange">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-orange-950/40 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Edit Your Name</h3>
              <p className="text-xs text-slate-400">Update how other players see you in this room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-orange-400" />
              <span>Display Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter display name..."
              maxLength={24}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:border-orange-500 transition-all"
            />
            {error ? (
              <p className="text-xs text-red-400 font-medium">{error}</p>
            ) : (
              <p className="text-[11px] text-slate-500">Max 24 characters</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Name</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
