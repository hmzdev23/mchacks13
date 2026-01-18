"use client";

import { useEffect, useState } from "react";
import { Point2D } from "@/lib/cv/alignment";
import { ASL_LANDMARKS } from "@/constants/asl-landmarks";

export function useReferenceLandmarks(letter: string) {
    const [landmarks, setLandmarks] = useState<Point2D[]>(ASL_LANDMARKS["A"] || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!letter || letter.length !== 1) return;

        const upperLetter = letter.toUpperCase();
        if (ASL_LANDMARKS[upperLetter]) {
            setLandmarks(ASL_LANDMARKS[upperLetter]);
            setError(null);
        } else {
            console.warn(`No hardcoded landmarks found for letter: ${upperLetter}`);
            // Fallback to A if not found, or keep current
            setError(`No reference data for ${upperLetter}`);
        }
    }, [letter]);

    return { landmarks, isLoading, error };
}
