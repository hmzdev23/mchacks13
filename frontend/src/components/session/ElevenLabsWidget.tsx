
"use client";

import { useEffect } from "react";

export function ElevenLabsWidget() {
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
            {/* 
                Native ElevenLabs Widget
                This will show the default "Blue Orb" and call controls immediately.
                The container in page.tsx provides the necessary dimensions (min-h-500px).
             */}
            <elevenlabs-convai
                agent-id="agent_9801kf6meda8e9hvphyyzhj71swv"
                className="w-full h-full"
            ></elevenlabs-convai>
        </div>
    );
}
