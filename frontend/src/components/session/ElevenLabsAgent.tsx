/**
 * ElevenLabs Conversational Agent Component
 * 
 * Uses the @elevenlabs/react SDK with useConversation hook for AI voice coaching.
 */

"use client";

import { useCallback, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import Script from "next/script";
import { cn } from "@/lib/utils";

// ElevenLabs agent ID
const AGENT_ID = "agent_9801kf6meda8e9hvphyyzhj71swv";

interface ElevenLabsAgentProps {
    className?: string;
    sessionContext?: {
        packId: string;
        lessonName: string;
        currentScore: number;
        topErrors: string[];
    };
}

export function ElevenLabsAgent({
    className,
    sessionContext,
}: ElevenLabsAgentProps) {
    // Determine the agent ID (could be dynamic based on pack/lesson if needed)
    const agentId = "agent_9801kf6meda8e9hvphyyzhj71swv";

    return (
        <div className={cn("elevenlabs-agent-wrapper w-full h-full min-h-[150px]", className)}>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    AI Coach
                </span>
            </div>

            {/* 
              ElevenLabs ConvAI Widget 
              We use the custom element and load the script via next/script
            */}
            <div className="w-full h-full flex justify-center items-center">
                <elevenlabs-convai agent-id={agentId}></elevenlabs-convai>
            </div>

            <Script
                src="https://unpkg.com/@elevenlabs/convai-widget-embed"
                strategy="afterInteractive"
            />
        </div>
    );
}
