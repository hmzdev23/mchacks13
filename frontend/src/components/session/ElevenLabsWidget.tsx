
"use client";

import { useEffect } from "react";

export function ElevenLabsWidget({ feedback, score }: { feedback?: string, score?: number }) {
    useEffect(() => {
        // Expose state to global window for potential AI Client Tools to read
        // If the Agent is configured with a client tool "get_user_status", it could read this.
        (window as any).secondHand = {
            currentFeedback: feedback,
            currentScore: score
        };
    }, [feedback, score]);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
        script.async = true;
        script.type = "text/javascript";
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
            {/* Debug/Live Feedback Display */}
            <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md rounded-lg p-3 text-center border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">AI Coach Context</p>
                    <p className="text-sm text-white font-light">{feedback || "Waiting for analysis..."}</p>
                </div>
            </div>

            <elevenlabs-convai
                agent-id="agent_9801kf6meda8e9hvphyyzhj71swv"
                className="w-full h-full"
            ></elevenlabs-convai>
        </div>
    );
}
