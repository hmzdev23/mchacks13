/**
 * Session Store (Zustand)
 * 
 * Global state for the practice session.
 * Keeps all real-time data in sync across components.
 */

import { create } from "zustand";

export interface Keypoints {
    leftHand: number[][] | null;
    rightHand: number[][] | null;
    pose: number[][] | null;
}

export interface AlignmentTransform {
    scale: number;
    translation: [number, number];
    rotation: number;
}

export interface Cue {
    primary: string | null;
    secondary: string | null;
    encouragement: string | null;
}

interface SessionState {
    // Session info
    packId: string | null;
    lessonId: string | null;
    lessonName: string | null;
    isActive: boolean;
    isPaused: boolean;

    // Keypoints
    userKeypoints: Keypoints;
    expertKeypoints: Keypoints;
    expertFrames: number[][][] | null; // All frames for the lesson
    currentFrame: number;

    // Alignment
    alignmentTransform: AlignmentTransform | null;

    // Scoring
    currentScore: number;
    scoreHistory: number[];
    topErrorJoints: number[];
    trend: number;
    sessionBestScore: number;

    // Coaching
    currentCue: Cue;
    lastSpokenCue: string | null;

    // Loop mode
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    loopAttempts: number;
    loopBestScore: number;

    // Session stats
    sessionStartTime: number | null;
    totalFrames: number;

    // Actions
    setPackAndLesson: (packId: string, lessonId: string, lessonName: string) => void;
    startSession: () => void;
    pauseSession: () => void;
    resumeSession: () => void;
    endSession: () => void;
    updateUserKeypoints: (keypoints: Keypoints) => void;
    setExpertKeypoints: (keypoints: Keypoints) => void;
    setExpertFrames: (frames: number[][][]) => void;
    setCurrentFrame: (frame: number) => void;
    updateAlignment: (transform: AlignmentTransform | null) => void;
    updateScore: (score: number, topErrors: number[]) => void;
    setCue: (cue: Cue) => void;
    setLastSpokenCue: (cue: string) => void;
    startLoop: (start: number, end: number) => void;
    stopLoop: () => void;
    recordLoopAttempt: (score: number) => void;
    reset: () => void;
}

const initialKeypoints: Keypoints = {
    leftHand: null,
    rightHand: null,
    pose: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
    // Initial state
    packId: null,
    lessonId: null,
    lessonName: null,
    isActive: false,
    isPaused: false,

    userKeypoints: { ...initialKeypoints },
    expertKeypoints: { ...initialKeypoints },
    expertFrames: null,
    currentFrame: 0,

    alignmentTransform: null,

    currentScore: 0,
    scoreHistory: [],
    topErrorJoints: [],
    trend: 0,
    sessionBestScore: 0,

    currentCue: {
        primary: null,
        secondary: null,
        encouragement: null,
    },
    lastSpokenCue: null,

    isLooping: false,
    loopStart: 0,
    loopEnd: 0,
    loopAttempts: 0,
    loopBestScore: 0,

    sessionStartTime: null,
    totalFrames: 0,

    // Actions
    setPackAndLesson: (packId, lessonId, lessonName) =>
        set({ packId, lessonId, lessonName }),

    startSession: () =>
        set({
            isActive: true,
            isPaused: false,
            scoreHistory: [],
            sessionStartTime: Date.now(),
            sessionBestScore: 0,
        }),

    pauseSession: () => set({ isPaused: true }),

    resumeSession: () => set({ isPaused: false }),

    endSession: () => set({ isActive: false, isPaused: false }),

    updateUserKeypoints: (keypoints) => set({ userKeypoints: keypoints }),

    setExpertKeypoints: (keypoints) => set({ expertKeypoints: keypoints }),

    setExpertFrames: (frames) => set({ expertFrames: frames, totalFrames: frames.length }),

    setCurrentFrame: (frame) => {
        const { expertFrames, isLooping, loopStart, loopEnd } = get();
        if (!expertFrames) return;

        let nextFrame = frame;

        // Handle loop boundaries
        if (isLooping) {
            if (nextFrame > loopEnd) {
                nextFrame = loopStart;
                // Record attempt when loop restarts
                const { currentScore } = get();
                get().recordLoopAttempt(currentScore);
            } else if (nextFrame < loopStart) {
                nextFrame = loopStart;
            }
        } else {
            // Clamp to valid range
            nextFrame = Math.max(0, Math.min(nextFrame, expertFrames.length - 1));
        }

        // Update expert keypoints for current frame
        const currentExpert = expertFrames[nextFrame];
        set({
            currentFrame: nextFrame,
            expertKeypoints: {
                leftHand: currentExpert || null,
                rightHand: null,
                pose: null,
            }
        });
    },

    updateAlignment: (transform) => set({ alignmentTransform: transform }),

    updateScore: (score, topErrors) => {
        const { scoreHistory, sessionBestScore } = get();
        const newHistory = [...scoreHistory.slice(-29), score];

        // Calculate trend (average of last 5 vs previous 5)
        let trend = 0;
        if (newHistory.length >= 10) {
            const recent = newHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
            const previous = newHistory.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
            trend = recent - previous;
        }

        set({
            currentScore: score,
            scoreHistory: newHistory,
            topErrorJoints: topErrors,
            trend,
            sessionBestScore: Math.max(sessionBestScore, score),
        });
    },

    setCue: (cue) => set({ currentCue: cue }),

    setLastSpokenCue: (cue) => set({ lastSpokenCue: cue }),

    startLoop: (start, end) => set({
        isLooping: true,
        loopStart: start,
        loopEnd: end,
        loopAttempts: 0,
        loopBestScore: 0,
        currentFrame: start,
    }),

    stopLoop: () => set({ isLooping: false }),

    recordLoopAttempt: (score) => {
        const { loopAttempts, loopBestScore } = get();
        set({
            loopAttempts: loopAttempts + 1,
            loopBestScore: Math.max(loopBestScore, score),
        });
    },

    reset: () => set({
        packId: null,
        lessonId: null,
        lessonName: null,
        isActive: false,
        isPaused: false,
        userKeypoints: { ...initialKeypoints },
        expertKeypoints: { ...initialKeypoints },
        expertFrames: null,
        currentFrame: 0,
        alignmentTransform: null,
        currentScore: 0,
        scoreHistory: [],
        topErrorJoints: [],
        trend: 0,
        sessionBestScore: 0,
        currentCue: { primary: null, secondary: null, encouragement: null },
        lastSpokenCue: null,
        isLooping: false,
        loopStart: 0,
        loopEnd: 0,
        loopAttempts: 0,
        loopBestScore: 0,
        sessionStartTime: null,
        totalFrames: 0,
    }),
}));
