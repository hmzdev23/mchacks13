/**
 * useVoiceCommands Hook
 * 
 * Voice recognition for hands-free control.
 * Commands: "start", "stop", "loop", "explain", "slow", etc.
 */

import { useState, useEffect, useCallback, useRef } from "react";

type VoiceCommand =
    | "start"
    | "stop"
    | "loop"
    | "next"
    | "previous"
    | "slow"
    | "normal"
    | "explain"
    | "what"
    | "help"
    | "restart";

interface UseVoiceCommandsOptions {
    onCommand?: (command: VoiceCommand) => void;
    enabled?: boolean;
}

// Extend Window interface for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Command patterns to match (defined outside component to avoid recreation)
const commandPatterns: Record<VoiceCommand, RegExp> = {
    start: /\b(start|begin|go|play)\b/i,
    stop: /\b(stop|pause|wait|hold)\b/i,
    loop: /\b(loop|repeat|again)\b/i,
    next: /\b(next|skip|forward)\b/i,
    previous: /\b(previous|back|before)\b/i,
    slow: /\b(slow|slower)\b/i,
    normal: /\b(normal|regular|speed)\b/i,
    explain: /\b(explain|what.+wrong|help.+me)\b/i,
    what: /\b(what|show.+mistake)\b/i,
    help: /\b(help)\b/i,
    restart: /\b(restart|reset|over)\b/i,
};

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}) {
    const { onCommand, enabled = true } = options;

    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const isInitializedRef = useRef(false);
    const enabledRef = useRef(enabled);
    const onCommandRef = useRef(onCommand);

    // Keep refs in sync with props
    enabledRef.current = enabled;
    onCommandRef.current = onCommand;

    // Parse spoken text for commands
    const parseCommand = useCallback((text: string): VoiceCommand | null => {
        for (const [command, pattern] of Object.entries(commandPatterns)) {
            if (pattern.test(text)) {
                return command as VoiceCommand;
            }
        }
        return null;
    }, []);

    // Effect to manage lifecycle - only depends on enabled
    useEffect(() => {
        // Check support
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            setIsSupported(false);
            setError("Speech recognition not supported in this browser");
            return;
        }

        // Don't reinitialize if already running
        if (!enabled) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore errors
                }
                recognitionRef.current = null;
            }
            setIsListening(false);
            isInitializedRef.current = false;
            return;
        }

        if (isInitializedRef.current) {
            return;
        }

        isInitializedRef.current = true;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();

        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            const command = parseCommand(transcript);

            if (command) {
                setLastCommand(command);
                onCommandRef.current?.(command);

                // Clear command after 2 seconds
                setTimeout(() => setLastCommand(null), 2000);
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            if (event.error !== "no-speech" && event.error !== "aborted") {
                setError(event.error);
                console.error("Speech recognition error:", event.error);
            }
        };

        recognitionRef.current.onend = () => {
            // Only restart if still enabled and we have a recognition instance
            if (enabledRef.current && recognitionRef.current) {
                // Use a small delay to prevent rapid restart loops
                setTimeout(() => {
                    if (enabledRef.current && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            // Already started or other issue, ignore
                        }
                    } else {
                        setIsListening(false);
                    }
                }, 100);
            } else {
                setIsListening(false);
            }
        };

        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error("Failed to start speech recognition:", e);
        }

        return () => {
            isInitializedRef.current = false;
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore cleanup errors
                }
                recognitionRef.current = null;
            }
        };
    }, [enabled, parseCommand]);

    // Manual start/stop functions
    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                // Already started
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Already stopped
            }
        }
        setIsListening(false);
    }, []);

    return {
        isListening,
        isSupported,
        lastCommand,
        error,
        startListening,
        stopListening,
    };
}
