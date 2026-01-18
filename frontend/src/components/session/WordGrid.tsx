"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadPack } from "@/lib/packs/packLoader";
import { LessonMeta } from "@/lib/packs/types";

interface WordGridProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (wordId: string, wordName: string) => void;
  currentWord: string | null;
}

export function WordGrid({ isOpen, onClose, onSelect, currentWord }: WordGridProps) {
  const [words, setWords] = useState<LessonMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadWords = async () => {
      try {
        const pack = await loadPack("asl");
        const wordLessons = pack.lessons.filter(lesson => lesson.type === 'word');
        setWords(wordLessons);
      } catch (err) {
        console.error("Failed to load words:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadWords();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--stone-900)]/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[var(--stone-50)] w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-white/50">
              {/* Header */}
              <div className="p-6 border-b border-[var(--stone-200)] flex justify-between items-center bg-white/50 backdrop-blur-md">
                <div>
                  <h2 className="text-2xl font-light text-[var(--stone-900)]" style={{ fontFamily: 'var(--font-heading)' }}>
                    Select a Word
                  </h2>
                  <p className="text-sm text-[var(--stone-500)] mt-1">Choose a word to practice</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--stone-200)] rounded-full transition-colors"
                >
                  <svg className="w-6 h-6 text-[var(--stone-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Grid Scroll Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-[var(--stone-100)]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--stone-300)] border-t-[var(--stone-900)] animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {words.map((word) => {
                      const isSelected = currentWord === word.id;
                      const displayName = word.name.replace('Word ', '');

                      return (
                        <button
                          key={word.id}
                          onClick={() => {
                            onSelect(word.id, displayName);
                            onClose();
                          }}
                          className={`
                            group relative aspect-[4/3] rounded-2xl overflow-hidden border transition-all duration-300
                            flex flex-col items-center justify-center p-4 text-center
                            ${isSelected
                              ? 'border-[var(--stone-900)] bg-white shadow-lg ring-2 ring-[var(--stone-900)] ring-offset-2 scale-[1.02]'
                              : 'border-white/60 bg-white/40 hover:bg-white hover:border-[var(--stone-300)] hover:shadow-md'
                            }
                          `}
                        >
                          {/* Word Name */}
                          <span className={`
                            text-xl font-semibold block mb-1
                            ${isSelected ? 'text-[var(--stone-900)]' : 'text-[var(--stone-600)]'}
                          `}>
                            {displayName}
                          </span>
                          
                          {/* Difficulty Badge */}
                          <span className={`
                            text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full
                            ${word.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                              word.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'}
                          `}>
                            {word.difficulty}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
