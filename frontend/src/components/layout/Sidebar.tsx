"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionStore, SessionMode } from "@/store/sessionStore";

// Sidebar icons component
const SidebarIcon = ({ type }: { type: string }) => {
    switch (type) {
        case "home":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M10 4v4M2 8h20M6 4v4" />
                </svg>
            );
        case "asl":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
            );
        case "dance":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
            );
        case "normal":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case "cpu":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M12 20v2M12 2v2M17 20v2M17 2v2M2 12h2M2 17h2M2 7h2M20 12h2M20 17h2M20 7h2M7 20v2M7 2v2" />
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="8" y="8" width="8" height="8" rx="1" />
                </svg>
            );
        case "rocket":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
                    <path d="m12 15-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
            );
        case "book":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H19a1 1 0 011 1v18a1 1 0 01-1 1H6.5a1 1 0 010-5H20" />
                </svg>
            );
        case "users":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                    <path d="M16 3.128a4 4 0 010 7.744M22 21v-2a4 4 0 00-3-3.87" />
                    <circle cx="9" cy="7" r="4" />
                </svg>
            );
        default:
            return null;
    }
};

// Mode items for session page
const modeItems: { icon: string; label: string; mode: SessionMode }[] = [
    { icon: "asl", label: "ASL Practice", mode: "asl" },
    { icon: "dance", label: "Dance Mode", mode: "dance" },
    { icon: "normal", label: "Testing Mode", mode: "normal" },
];

const sidebarItems = [
    { icon: "home", label: "Home", href: "/" },
    { icon: "cpu", label: "How it Works", href: "/#how-it-works" },
    { icon: "rocket", label: "Get Started", href: "/#packs" },
    { icon: "book", label: "Documentation", href: "/#faq" },
    { icon: "users", label: "About", href: "/#about" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { mode, setMode } = useSessionStore();
    const isSessionPage = pathname === '/session';

    return (
        <aside className="fixed z-50 flex flex-col bg-[var(--stone-100)]/80 w-[70px] h-screen border-r border-[var(--stone-200)] pt-8 pb-8 top-0 left-0 backdrop-blur-md items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="w-8 h-8 bg-[var(--stone-900)] rounded-full flex items-center justify-center text-white font-bold text-xs tracking-tighter" style={{ fontFamily: 'var(--font-heading)' }}>
                    SH
                </div>
                <span className="text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity absolute top-16" style={{ fontFamily: 'var(--font-heading)' }}>
                    SECOND
                </span>
            </Link>

            {/* Mode Switcher (only on session page) */}
            {isSessionPage ? (
                <nav className="flex flex-col gap-4 w-full items-center">
                    <div className="w-8 h-px bg-[var(--stone-300)] mb-2" />
                    <span className="text-[8px] uppercase tracking-widest text-[var(--stone-400)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                        Mode
                    </span>
                    {modeItems.map((item) => (
                        <button
                            key={item.mode}
                            onClick={() => setMode(item.mode)}
                            className={`group relative p-3 rounded-xl transition-all ${mode === item.mode
                                    ? "bg-[var(--stone-900)] text-white shadow-lg"
                                    : "text-[var(--stone-600)] hover:bg-[var(--stone-200)] hover:text-black"
                                }`}
                        >
                            <SidebarIcon type={item.icon} />
                            <span className="absolute left-14 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none">
                                {item.label}
                            </span>
                        </button>
                    ))}
                    <div className="w-8 h-px bg-[var(--stone-300)] mt-2" />
                </nav>
            ) : (
                /* Nav Items (on other pages) */
                <nav className="flex flex-col gap-8 w-full items-center">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.icon}
                            href={item.href}
                            className={`group relative p-3 rounded-xl transition-colors ${pathname === item.href
                                    ? "bg-[var(--stone-200)] text-black"
                                    : "text-[var(--stone-600)] hover:bg-[var(--stone-200)] hover:text-black"
                                }`}
                        >
                            <SidebarIcon type={item.icon} />
                            <span className="absolute left-14 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none">
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </nav>
            )}

            {/* Status */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="vertical-text text-[10px] text-[var(--stone-400)] uppercase tracking-widest rotate-180" style={{ fontFamily: 'var(--font-mono)' }}>
                    {isSessionPage ? mode.toUpperCase() : 'System Online'}
                </span>
            </div>
        </aside>
    );
}
