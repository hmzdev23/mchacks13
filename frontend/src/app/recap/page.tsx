/**
 * Recap Page
 * 
 * Session summary with stats and achievements.
 * Clean, modern light mode design.
 */

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSessionStore } from "@/store/sessionStore";
import { StatefulButton } from "@/components/ui/stateful-button";
import { CometCard } from "@/components/ui/comet-card";
import { Spinner } from "@/components/ui/loaders";

function RecapContent() {
    const searchParams = useSearchParams();
    const packId = searchParams.get("pack") || "sign-language";
    const lessonId = searchParams.get("lesson") || "hello";

    const {
        sessionBestScore,
        scoreHistory,
        loopAttempts,
        loopBestScore,
        sessionStartTime,
    } = useSessionStore();

    // Calculate stats
    const avgScore = scoreHistory.length > 0
        ? scoreHistory.reduce((a, b) => a + b, 0) / scoreHistory.length
        : 0;

    const sessionDuration = sessionStartTime
        ? Math.floor((Date.now() - sessionStartTime) / 1000)
        : 0;

    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;

    const stats = [
        { label: "Best Score", value: Math.round(sessionBestScore), icon: "trophy", color: "text-[var(--color-accent-primary)]", bgColor: "bg-blue-50" },
        { label: "Average Score", value: Math.round(avgScore), icon: "chart", color: "text-[var(--color-accent-secondary)]", bgColor: "bg-indigo-50" },
        { label: "Session Time", value: `${minutes}:${seconds.toString().padStart(2, "0")}`, icon: "clock", color: "text-[var(--color-text-primary)]", bgColor: "bg-gray-50" },
        { label: "Loop Attempts", value: loopAttempts, icon: "refresh", color: "text-[var(--color-success)]", bgColor: "bg-emerald-50" },
    ];

    // Determine achievement
    const getAchievement = () => {
        if (sessionBestScore >= 95) return { emoji: "🌟", text: "Perfect!", desc: "You've mastered this move!", color: "from-amber-400 to-orange-500" };
        if (sessionBestScore >= 80) return { emoji: "🎯", text: "Great Job!", desc: "You're getting really good!", color: "from-blue-400 to-indigo-500" };
        if (sessionBestScore >= 60) return { emoji: "💪", text: "Nice Work!", desc: "Keep practicing!", color: "from-emerald-400 to-teal-500" };
        return { emoji: "🚀", text: "Good Start!", desc: "Practice makes perfect!", color: "from-violet-400 to-purple-500" };
    };

    const achievement = getAchievement();

    const renderIcon = (icon: string) => {
        switch (icon) {
            case "trophy":
                return (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                    </svg>
                );
            case "chart":
                return (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                );
            case "clock":
                return (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case "refresh":
                return (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <main className="min-h-screen bg-[var(--color-bg-primary)] relative overflow-hidden">
            {/* Gradient Blur Orbs */}
            <div className="gradient-blur-container">
                <div className="gradient-orb gradient-orb-1" />
                <div className="gradient-orb gradient-orb-2" />
                <div className="gradient-orb gradient-orb-3" />
            </div>

            <div className="container mx-auto px-6 py-12 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br ${achievement.color} shadow-lg mb-6`}
                    >
                        <span className="text-5xl">{achievement.emoji}</span>
                    </motion.div>
                    <h1 className="font-display text-4xl md:text-5xl font-bold mb-3 text-[var(--color-text-primary)]">
                        {achievement.text}
                    </h1>
                    <p className="text-[var(--color-text-secondary)] text-lg">
                        {achievement.desc}
                    </p>
                </motion.div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="glass-card rounded-2xl p-6"
                        >
                            <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mb-4 ${stat.color}`}>
                                {renderIcon(stat.icon)}
                            </div>
                            <p className={`text-3xl font-bold ${stat.color}`}>
                                {stat.value}
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-medium">
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Score history chart */}
                {scoreHistory.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="max-w-2xl mx-auto mb-12"
                    >
                        <div className="glass-heavy rounded-2xl p-6">
                            <h3 className="font-display text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Score Progress</h3>
                            <div className="h-32 flex items-end gap-1">
                                {scoreHistory.slice(-30).map((score, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${score}%` }}
                                        transition={{ delay: 0.6 + i * 0.02 }}
                                        className="flex-1 rounded-t-sm"
                                        style={{
                                            background: score >= 80
                                                ? "var(--color-success)"
                                                : score >= 50
                                                    ? "var(--color-warning)"
                                                    : "var(--color-error)",
                                            opacity: 0.4 + (i / 30) * 0.6,
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between mt-3 text-xs text-[var(--color-text-tertiary)] font-medium">
                                <span>Start</span>
                                <span>End</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Action buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link href={`/session?pack=${packId}&lesson=${lessonId}`}>
                        <StatefulButton variant="primary" size="lg">
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Practice Again
                            </span>
                        </StatefulButton>
                    </Link>

                    <Link href="/">
                        <StatefulButton variant="secondary" size="lg">
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Back to Home
                            </span>
                        </StatefulButton>
                    </Link>
                </motion.div>
            </div>
        </main>
    );
}

export default function RecapPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        }>
            <RecapContent />
        </Suspense>
    );
}
