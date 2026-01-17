/**
 * Encrypted Text
 * 
 * Text that appears to decrypt character by character.
 * Creates a cyberpunk, hacker-style effect.
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface EncryptedTextProps {
    text: string;
    className?: string;
    speed?: number;
    characterSet?: string;
}

export function EncryptedText({
    text,
    className,
    speed = 50,
    characterSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*",
}: EncryptedTextProps) {
    const [displayText, setDisplayText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let iteration = 0;
        const iterations = 3; // How many random iterations before revealing each char
        let charIndex = 0;

        const interval = setInterval(() => {
            setDisplayText(
                text
                    .split("")
                    .map((char, index) => {
                        if (char === " ") return " ";
                        if (index < charIndex) {
                            return text[index];
                        }
                        return characterSet[Math.floor(Math.random() * characterSet.length)];
                    })
                    .join("")
            );

            iteration++;
            if (iteration >= iterations) {
                charIndex++;
                iteration = 0;
            }

            if (charIndex > text.length) {
                clearInterval(interval);
                setDisplayText(text);
                setIsComplete(true);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, characterSet]);

    return (
        <span
            className={cn(
                "font-mono",
                isComplete ? "" : "text-glow",
                className
            )}
        >
            {displayText}
        </span>
    );
}
