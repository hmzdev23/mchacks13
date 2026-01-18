"use client";

import { useEffect, useState } from "react";
import { Point2D } from "@/lib/cv/alignment";

// Fallback data if fetch fails (using 'A' from existing codebase)
const FALLBACK_A: Point2D[] = [
    [0.5, 0.8], [0.45, 0.7], [0.4, 0.6], [0.38, 0.5], [0.36, 0.42],
    [0.5, 0.55], [0.5, 0.48], [0.52, 0.52], [0.54, 0.58],
    [0.55, 0.55], [0.55, 0.47], [0.57, 0.52], [0.58, 0.58],
    [0.6, 0.56], [0.6, 0.49], [0.61, 0.54], [0.62, 0.59],
    [0.65, 0.58], [0.65, 0.52], [0.66, 0.56], [0.66, 0.6],
];

export function useReferenceLandmarks(letter: string) {
    const [landmarks, setLandmarks] = useState<Point2D[]>(FALLBACK_A);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchLandmarks = async () => {
            if (!letter || letter.length !== 1) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`http://localhost:8000/api/reference/asl/${letter}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch reference for ${letter}`);
                }

                const data = await response.json();
                if (data.landmarks && Array.isArray(data.landmarks)) {
                    // Convert {x, y, z} objects to [x, y] Point2D arrays
                    const points: Point2D[] = data.landmarks.map((lm: any) => [lm.x, lm.y]);

                    if (isMounted) {
                        setLandmarks(points);
                    }
                }
            } catch (err) {
                console.error("Error fetching reference landmarks:", err);
                // On error, keep using previous or fallback (could optimize this)
                if (isMounted) {
                    setError(String(err));
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchLandmarks();

        return () => {
            isMounted = false;
        };
    }, [letter]);

    return { landmarks, isLoading, error };
}
