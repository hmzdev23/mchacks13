
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

const sidebarItems = [
    { icon: "home", label: "Home", href: "/" },
    { icon: "cpu", label: "How it Works", href: "/#how-it-works" },
    { icon: "rocket", label: "Get Started", href: "/#packs" },
    { icon: "book", label: "Documentation", href: "/#faq" },
    { icon: "users", label: "About", href: "/#about" },
];

export function Sidebar() {
    const pathname = usePathname();

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

            {/* Nav Items */}
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

            {/* Status */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="vertical-text text-[10px] text-[var(--stone-400)] uppercase tracking-widest rotate-180" style={{ fontFamily: 'var(--font-mono)' }}>
                    System Online
                </span>
            </div>
        </aside>
    );
}
