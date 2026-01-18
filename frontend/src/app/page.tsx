/**
 * Landing Page
 * 
 * PBLK-Inspired Theme - Institutional, minimal design with stone palette.
 * Features left sidebar navigation, animated hero, and premium sections.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

// Skill packs data
const packs = [
  {
    id: "sign-language",
    name: "Sign Language",
    description: "Learn ASL basics with hand tracking",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
      </svg>
    ),
    available: true,
  },
  {
    id: "dance",
    name: "Dance Studio",
    description: "Learn viral choreography with full-body tracking",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l10-2v13" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="16" r="2" />
      </svg>
    ),
    available: true,
  },
  {
    id: "cpr",
    name: "CPR Form",
    description: "Master life-saving techniques",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    available: false,
  },
  {
    id: "piano",
    name: "Piano Technique",
    description: "Perfect your finger positioning",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
    ),
    available: false,
  },
];

// Features data
const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "MediaPipe Tracking",
    description: "Each gesture is analyzed with 21-point hand tracking. Real-time feedback ensures accurate motion capture.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
      </svg>
    ),
    title: "Loop Training Mode",
    description: "Not a one-off practice. A standardized loop for repeating motions with consistent feedback.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "AI Voice Coaching",
    description: "Real-time voice feedback powered by ElevenLabs. Get corrections and encouragement as you practice.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Precision Scoring",
    description: "Strict accuracy metrics. Gestures are scored against expert recordings for measurable progress.",
  },
];

// Steps data
const steps = [
  {
    num: "01",
    label: "Setup",
    title: "Camera Calibration",
    description: "Position yourself in frame and allow camera access. Our system automatically calibrates to your environment.",
  },
  {
    num: "02",
    label: "Selection",
    title: "Choose Your Skill",
    description: "Pick from our library of expert-recorded gestures. Start with basics or jump to advanced techniques.",
  },
  {
    num: "03",
    label: "Practice",
    title: "Ghost Overlay Training",
    description: "Follow the semi-transparent ghost teacher. Match your movements to the overlay in real-time.",
  },
  {
    num: "04",
    label: "Mastery",
    title: "Track Progress",
    description: "Review your session scores and accuracy metrics. AI coach provides personalized improvement tips.",
  },
];

// FAQ data
const faqs = [
  {
    question: "What devices are supported?",
    answer: "SecondHand works on any device with a camera and modern browser. Chrome, Safari, and Firefox are fully supported. For best results, use a laptop or desktop with a webcam.",
  },
  {
    question: "How accurate is the hand tracking?",
    answer: "We use Google's MediaPipe technology which tracks 21 points on each hand at 30+ FPS. Accuracy is typically 95%+ in good lighting conditions.",
  },
  {
    question: "Can I use this for professional training?",
    answer: "Yes! SecondHand is designed for both casual learners and professionals. Many ASL instructors use our platform to supplement their teaching.",
  },
  {
    question: "Is my video data stored?",
    answer: "No. All processing happens locally in your browser. We never store, upload, or analyze your camera feed on our servers. Your privacy is guaranteed.",
  },
];

// Sidebar items
const sidebarItems = [
  { icon: "home", label: "Home", href: "#" },
  { icon: "cpu", label: "How it Works", href: "#how-it-works" },
  { icon: "rocket", label: "Get Started", href: "#packs" },
  { icon: "book", label: "Documentation", href: "#faq" },
  { icon: "users", label: "About", href: "#about" },
];

export default function LandingPage() {
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [activeReveal, setActiveReveal] = useState<Set<number>>(new Set());
  const revealRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Intersection Observer for reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = revealRefs.current.indexOf(entry.target as HTMLDivElement);
          if (entry.isIntersecting && index !== -1) {
            setActiveReveal((prev) => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    revealRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const setRevealRef = (index: number) => (el: HTMLDivElement | null) => {
    revealRefs.current[index] = el;
  };

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

  return (
    <main className="flex min-h-screen selection:bg-[var(--stone-300)] selection:text-[var(--stone-900)]">
      {/* Left Sidebar */}
      <aside className="fixed z-50 flex flex-col bg-[var(--stone-100)]/80 w-[70px] h-screen border-r border-[var(--stone-200)] pt-8 pb-8 top-0 left-0 backdrop-blur-md items-center justify-between">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-8 h-8 bg-[var(--stone-900)] rounded-full flex items-center justify-center text-white font-bold text-xs tracking-tighter" style={{ fontFamily: 'var(--font-heading)' }}>
            SH
          </div>
          <span className="text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity absolute top-16" style={{ fontFamily: 'var(--font-heading)' }}>
            SECOND
          </span>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-8 w-full items-center">
          {sidebarItems.map((item) => (
            <a
              key={item.icon}
              href={item.href}
              className="group relative p-3 rounded-xl hover:bg-[var(--stone-200)] transition-colors text-[var(--stone-600)] hover:text-black"
            >
              <SidebarIcon type={item.icon} />
              <span className="absolute left-14 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none">
                {item.label}
              </span>
            </a>
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

      {/* Main Content Area */}
      <div className="ml-[70px] w-[calc(100%-70px)] relative">
        {/* Hero Section */}
        <section className="relative flex flex-col min-h-screen w-full border-b border-[var(--stone-200)] bg-[var(--stone-100)]/30 overflow-hidden">
          {/* Hero Image Background */}
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 pointer-events-none mix-blend-multiply">
            <div className="h-full w-full bg-gradient-to-l from-[var(--stone-400)] via-[var(--stone-300)] to-[var(--stone-100)] filter grayscale contrast-125" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[var(--stone-100)]/50 to-[var(--stone-100)]" />
          </div>

          {/* Main Hero Content */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-24 flex flex-col justify-center flex-grow">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-8 flex items-center gap-3"
            >
              <span className="text-[10px] uppercase text-[var(--stone-500)] tracking-widest border border-[var(--stone-300)] rounded px-2 py-1" style={{ fontFamily: 'var(--font-mono)' }}>
                SecondHand v2.0
              </span>
              <span className="h-[1px] w-12 bg-[var(--stone-300)]" />
              <span className="text-[10px] uppercase tracking-widest text-[var(--stone-500)]" style={{ fontFamily: 'var(--font-mono)' }}>
                MediaPipe Powered
              </span>
            </motion.div>

            <h1 className="text-[clamp(3rem,6vw,6.5rem)] leading-[0.9] text-[var(--stone-900)] tracking-tighter mb-8" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
              <motion.span
                className="block"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                MOTION.
              </motion.span>
              <motion.span
                className="block text-[var(--stone-400)]"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                TRACKED.
              </motion.span>
              <motion.span
                className="block"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                MASTERED.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-lg md:text-xl text-[var(--stone-600)] font-light max-w-xl mb-12 leading-relaxed tracking-tight"
            >
              Learn from invisible teachers. An AI-powered platform for mastering gestures, signs, and physical skills through real-time AR overlay.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap gap-6 items-center"
            >
              <Link href="/calibrate?pack=sign-language">
                <button className="btn-primary flex items-center gap-3 text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                  Launch App
                </button>
              </Link>

              <a href="#how-it-works" className="group flex items-center gap-2 hover:text-[var(--stone-900)] hover:border-[var(--stone-900)] transition-all text-sm text-[var(--stone-500)] border-b border-transparent pb-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                HOW IT WORKS
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
                </svg>
              </a>
            </motion.div>
          </div>

          {/* Bottom Section: Ticker + Dual Cards */}
          <div className="w-full flex flex-col">
            {/* Ticker */}
            <div className="ticker-bar">
              <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
                <div className="flex gap-4 md:gap-8 ticker-item overflow-x-auto">
                  <span className="whitespace-nowrap">Hand Tracking</span>
                  <span className="hidden md:inline">•</span>
                  <span className="whitespace-nowrap">AI Voice Coach</span>
                  <span className="hidden md:inline">•</span>
                  <span className="whitespace-nowrap">Ghost Overlay</span>
                  <span className="hidden md:inline">•</span>
                  <span className="whitespace-nowrap">Real-time Scoring</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="ticker-item whitespace-nowrap">
                    Live Updates
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Cards Section */}
            <div className="w-full bg-[var(--stone-950)] border-t border-[var(--stone-800)]">
              <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card 1: For Learners */}
                <div className="group card-feature-dark rounded-xl p-8 md:p-10">
                  <div className="relative z-10 flex flex-col h-full gap-6">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10 text-white icon-container-scale">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl text-white font-normal tracking-tight mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                        For Learners
                      </h3>
                      <p className="text-sm text-[var(--stone-300)] font-light leading-relaxed">
                        Master sign language, CPR, piano, and more with ghost overlay technology. Get real-time AI feedback and track your progress through every practice session.
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/10 w-full">
                      <Link href="/calibrate?pack=sign-language">
                        <button className="btn-beam w-full group">
                          <span className="btn-beam-static" />
                          <span className="btn-beam-inner">
                            Start Learning
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
                            </svg>
                          </span>
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Card 2: For Creators */}
                <div className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-8 md:p-10 backdrop-blur-md hover:bg-white/10 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10 flex flex-col h-full gap-6">
                    <div className="w-12 h-12 rounded-full bg-[var(--stone-100)] text-[var(--stone-900)] flex items-center justify-center border border-white/10 icon-container-scale">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl text-white font-normal tracking-tight mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                        For Creators
                      </h3>
                      <p className="text-sm text-[var(--stone-300)] font-light leading-relaxed">
                        Record your expertise and share it with the world. Create skill packs that teach through motion, complete with AI-generated feedback loops.
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] uppercase group-hover:text-white transition-colors text-[var(--stone-400)] tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
                        Coming Soon
                      </span>
                      <svg className="w-4 h-4 text-[var(--stone-400)] group-hover:text-white transition-colors group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What SecondHand Is (Manifesto) */}
        <section className="py-32 px-12 lg:px-24 border-b border-[var(--stone-200)]" id="manifesto">
          <div
            ref={setRevealRef(0)}
            className={`grid grid-cols-1 md:grid-cols-12 gap-16 transition-all duration-700 ${activeReveal.has(0) ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
          >
            <div className="md:col-span-4">
              <h2 className="text-[32px] tracking-tight leading-tight text-[var(--stone-900)] mb-6" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
                AI-Powered.
                <br />
                Human Perfected.
              </h2>
              <p className="text-sm text-[var(--stone-500)] leading-relaxed max-w-xs">
                SecondHand removes the friction of traditional learning while amplifying the feedback that drives mastery.
              </p>
            </div>

            <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`p-8 border border-[var(--stone-200)] ${index === 3 ? 'bg-[var(--stone-900)] text-white' : 'bg-white hover:shadow-lg'} transition-shadow duration-500 group`}
                >
                  <div className={`w-8 h-8 mb-6 transition-colors ${index === 3 ? 'text-[var(--stone-500)] group-hover:text-white' : 'text-[var(--stone-300)] group-hover:text-black'}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-normal mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{feature.title}</h3>
                  <p className={`text-xs leading-relaxed ${index === 3 ? 'text-[var(--stone-400)]' : 'text-[var(--stone-500)]'}`}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works (Timeline) */}
        <section id="how-it-works" className="py-32 px-12 lg:px-24 bg-white border-b border-[var(--stone-200)]">
          <div
            ref={setRevealRef(1)}
            className={`max-w-7xl mx-auto transition-all duration-700 ${activeReveal.has(1) ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
          >
            <div className="mb-20">
              <span className="text-xs uppercase tracking-widest text-[var(--stone-400)] block mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                The Process
              </span>
              <h2 className="text-[40px] tracking-tight text-[var(--stone-900)]" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
                From Setup to Mastery
              </h2>
            </div>

            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-[var(--stone-200)] hidden md:block" />

              {steps.map((step, index) => (
                <div key={index} className="relative pl-0 md:pl-16 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 group step-timeline-item">
                  <div className="step-timeline-dot hidden md:block" style={{ top: '3rem' }} />
                  <div className="col-span-1">
                    <span className="text-xs text-[var(--stone-400)] mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      {step.num} / {step.label}
                    </span>
                    <h3 className="text-xl font-normal" style={{ fontFamily: 'var(--font-heading)' }}>{step.title}</h3>
                  </div>
                  <div className="col-span-2 border-l border-[var(--stone-100)] pl-6 md:pl-0 md:border-none">
                    <p className="text-sm text-[var(--stone-500)] max-w-md">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Skill Packs Section */}
        <section id="packs" className="py-32 px-12 lg:px-24 bg-[var(--stone-50)] border-b border-[var(--stone-200)]">
          <div className="max-w-4xl mx-auto">
            <div
              ref={setRevealRef(2)}
              className={`text-center mb-16 transition-all duration-700 ${activeReveal.has(2) ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
            >
              <span className="section-label mb-4 block">Skill Packs</span>
              <h2 className="text-3xl md:text-5xl tracking-tight text-[var(--stone-900)] mb-4" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
                Choose Your Path
              </h2>
              <p className="text-[var(--stone-500)] max-w-2xl mx-auto font-light">
                Each pack contains expert-recorded movements with real-time coaching.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {packs.map((pack, index) => (
                <motion.div
                  key={pack.id}
                  ref={setRevealRef(3 + index)}
                  className={`transition-all duration-700 ${activeReveal.has(3 + index) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={{ transitionDelay: `${100 + index * 100}ms` }}
                >
                  <button
                    onClick={() => pack.available && setSelectedPack(pack.id)}
                    disabled={!pack.available}
                    className={`relative w-full p-8 rounded-xl text-left transition-all duration-300 ${!pack.available
                      ? "opacity-60 cursor-not-allowed card"
                      : selectedPack === pack.id
                        ? "card border-[var(--stone-900)] shadow-lg ring-1 ring-[var(--stone-900)]"
                        : "card hover:shadow-lg"
                      }`}
                  >
                    {!pack.available && (
                      <span className="absolute top-4 right-4 tag">
                        Coming Soon
                      </span>
                    )}

                    <div className="icon-container icon-container-light mb-6">
                      {pack.icon}
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-[var(--stone-900)]">{pack.name}</h3>
                    <p className="text-sm text-[var(--stone-500)] font-light">{pack.description}</p>

                    {pack.available && (
                      <div className="mt-6 flex items-center gap-2 text-[var(--stone-900)] text-sm font-medium">
                        <span>{selectedPack === pack.id ? "Selected" : "Select Pack"}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Continue button */}
            {selectedPack && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <Link href={`/calibrate?pack=${selectedPack}`}>
                  <button className="btn-primary flex items-center gap-3 mx-auto">
                    Continue with {packs.find((p) => p.id === selectedPack)?.name}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </Link>
              </motion.div>
            )}
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-32 px-12 lg:px-24 border-b border-[var(--stone-200)]">
          <div
            ref={setRevealRef(6)}
            className={`max-w-5xl mx-auto transition-all duration-700 ${activeReveal.has(6) ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
          >
            <div className="comparison-grid rounded-lg overflow-hidden">
              {/* Column 1: Traditional */}
              <div className="comparison-col comparison-col-left">
                <h3 className="text-2xl text-[var(--stone-400)] mb-8 font-light" style={{ fontFamily: 'var(--font-heading)' }}>
                  Traditional Learning
                </h3>
                <ul className="space-y-6">
                  {[
                    "No real-time feedback",
                    "Expensive in-person sessions",
                    "Limited practice materials",
                    "Progress hard to measure"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 opacity-60">
                      <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 2: SecondHand */}
              <div className="comparison-col comparison-col-right">
                <h3 className="text-2xl text-[var(--stone-900)] mb-8 font-normal" style={{ fontFamily: 'var(--font-heading)' }}>
                  SecondHand
                </h3>
                <ul className="space-y-6">
                  {[
                    "AI-Powered Feedback",
                    "Free, Unlimited Practice",
                    "Expert Ghost Overlays",
                    "Visual Progress Tracking"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-4 h-4 mt-0.5 text-[var(--stone-900)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32 px-12 lg:px-24 bg-[var(--stone-50)]">
          <div
            ref={setRevealRef(7)}
            className={`max-w-3xl mx-auto transition-all duration-700 ${activeReveal.has(7) ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
          >
            <h2 className="text-[32px] mb-12 text-center text-[var(--stone-900)]" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
              Common Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <details key={index} className="accordion-item-enhanced group">
                  <summary>
                    {faq.question}
                    <svg className="accordion-chevron w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="accordion-body">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="about" className="bg-[var(--stone-900)] text-[var(--stone-400)] py-24 px-12 lg:px-24">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1">
              <div className="w-8 h-8 bg-white text-[var(--stone-900)] rounded-full flex items-center justify-center font-bold text-xs mb-6">
                SH
              </div>
              <p className="text-xs text-[var(--stone-500)]">
                Building the future of
                <br />
                motion-based learning.
              </p>
            </div>
            <div>
              <h5 className="text-white text-xs uppercase tracking-widest mb-6">
                Platform
              </h5>
              <ul className="space-y-4 text-xs">
                <li><a href="#packs" className="hover:text-white transition-colors">Skill Packs</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white text-xs uppercase tracking-widest mb-6">
                Technology
              </h5>
              <ul className="space-y-4 text-xs">
                <li><span className="text-[var(--stone-500)]">MediaPipe</span></li>
                <li><span className="text-[var(--stone-500)]">ElevenLabs</span></li>
                <li><span className="text-[var(--stone-500)]">Next.js</span></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white text-xs uppercase tracking-widest mb-6">
                Status
              </h5>
              <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </div>
            </div>
          </div>

          <div className="divider-dark mb-8" style={{ height: '1px', background: 'var(--stone-800)' }} />

          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-[var(--stone-500)]">
            <p>© 2024 SecondHand. Built for McHacks 13</p>
            <p>Made with care in Montreal</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
