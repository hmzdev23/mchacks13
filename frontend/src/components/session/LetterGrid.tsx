
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getLetterData } from "@/lib/aslLessons";

interface LetterGridProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (letter: string) => void;
    currentLetter: string;
}

const LETTERS = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

export function LetterGrid({ isOpen, onClose, onSelect, currentLetter }: LetterGridProps) {
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
                                        Select a Lesson
                                    </h2>
                                    <p className="text-sm text-[var(--stone-500)] mt-1">Choose a letter to practice</p>
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
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                    {LETTERS.map((letter) => {
                                        const isSelected = currentLetter === letter;
                                        const data = getLetterData(letter);
                                        // Use placeholder if image fails (in real app, use next/image with fallback)
                                        const imgSrc = data?.image || `/asl_images/${letter.toLowerCase()}.png`;

                                        return (
                                            <button
                                                key={letter}
                                                onClick={() => {
                                                    onSelect(letter);
                                                    onClose();
                                                }}
                                                className={`
                                                    group relative aspect-[4/5] rounded-2xl overflow-hidden border transition-all duration-300
                                                    flex flex-col items-center justify-end p-4 text-left
                                                    ${isSelected
                                                        ? 'border-[var(--stone-900)] bg-white shadow-lg ring-2 ring-[var(--stone-900)] ring-offset-2 scale-[1.02]'
                                                        : 'border-white/60 bg-white/40 hover:bg-white hover:border-[var(--stone-300)] hover:shadow-md'
                                                    }
                                                `}
                                            >
                                                {/* Large Letter Background */}
                                                <span className={`
                                                    absolute top-2 right-4 text-8xl font-black opacity-5 pointer-events-none select-none
                                                    ${isSelected ? 'text-[var(--stone-900)]' : 'text-[var(--stone-400)] group-hover:text-[var(--stone-600)]'}
                                                `}>
                                                    {letter}
                                                </span>

                                                {/* Content */}
                                                <div className="relative z-10 w-full">
                                                    <span className={`
                                                        text-2xl font-bold block mb-1
                                                        ${isSelected ? 'text-[var(--stone-900)]' : 'text-[var(--stone-600)]'}
                                                    `}>
                                                        {letter}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--stone-400)] uppercase tracking-wider line-clamp-1">
                                                        {data?.desc || "Practice This Letter"}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
