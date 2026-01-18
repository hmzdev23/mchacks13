"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PhraseInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sequence: string[], gloss: string, hints: Record<string, string>) => void;
}

interface NLPResponse {
  normalized: string;
  words: string[];
  unknown_words: string[];
  sequence: string[];
  gloss: string;
  lesson_hints: Record<string, string>;
}

export function PhraseInput({ isOpen, onClose, onSubmit }: PhraseInputProps) {
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const handleSubmitWithNLP = useCallback(async () => {
    if (!phrase.trim()) {
      setError("Please enter a phrase.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("Parsing phrase with AI...");

    try {
      // First, try NLP parsing
      const response = await fetch(`${apiBase}/api/nlp/phrase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase: phrase.trim(),
          max_words: 20,
          vocabulary: [], // Will be populated by backend
          vocab_map: {},
          letters: "abcdefghijklmnopqrstuvwxyz".split(""),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "NLP parsing failed");
      }

      const data: NLPResponse = await response.json();
      
      if (data.sequence.length === 0) {
        throw new Error("Could not parse any words from the phrase.");
      }

      setStatus(null);
      onSubmit(data.sequence, data.gloss, data.lesson_hints);
      onClose();
      setPhrase("");
    } catch (err: any) {
      console.warn("NLP error, trying fallback:", err);
      setStatus("AI parsing failed, using fallback...");
      
      // Fallback: simple character-by-character parsing
      try {
        const normalized = phrase.toLowerCase().replace(/[^a-z\s]/g, "").trim();
        const words = normalized.split(/\s+/).filter(Boolean);
        
        if (words.length === 0) {
          throw new Error("No valid words found in phrase.");
        }
        
        if (words.length > 20) {
          throw new Error("Phrase too long. Maximum 20 words.");
        }
        
        // Convert to letter sequences as fallback
        const sequence: string[] = [];
        const hints: Record<string, string> = {};
        
        for (const word of words) {
          for (const char of word) {
            const lessonId = `letter-${char}`;
            sequence.push(lessonId);
            hints[lessonId] = `Form the letter ${char.toUpperCase()} hand shape.`;
          }
        }
        
        setStatus(null);
        onSubmit(sequence, words.join(" "), hints);
        onClose();
        setPhrase("");
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || "Failed to parse phrase.");
        setStatus(null);
      }
    } finally {
      setLoading(false);
    }
  }, [phrase, apiBase, onSubmit, onClose]);

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
            <div className="bg-[var(--stone-50)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border border-white/50">
              {/* Header */}
              <div className="p-6 border-b border-[var(--stone-200)] bg-white/50 backdrop-blur-md">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-light text-[var(--stone-900)]" style={{ fontFamily: 'var(--font-heading)' }}>
                      Custom Phrase
                    </h2>
                    <p className="text-sm text-[var(--stone-500)] mt-1">
                      Enter any phrase to practice signing
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-[var(--stone-200)] rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-[var(--stone-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--stone-500)] mb-2">
                    Your Phrase (max 20 words)
                  </label>
                  <textarea
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    placeholder="Enter a phrase like 'Hello my name is...'"
                    className="w-full h-24 px-4 py-3 rounded-xl border border-[var(--stone-300)] bg-white text-[var(--stone-900)] placeholder:text-[var(--stone-400)] focus:outline-none focus:ring-2 focus:ring-[var(--stone-400)] resize-none"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {status && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                    <p className="text-sm text-blue-600">{status}</p>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-[var(--stone-100)] border border-[var(--stone-200)]">
                  <p className="text-xs text-[var(--stone-500)]">
                    <strong>Tip:</strong> The AI will recognize common ASL vocabulary words. 
                    Unknown words will be spelled out letter by letter.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 rounded-xl border border-[var(--stone-300)] text-[var(--stone-600)] hover:bg-white transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitWithNLP}
                    disabled={loading || !phrase.trim()}
                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--stone-900)] text-white hover:bg-[var(--stone-800)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Start Practice"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
