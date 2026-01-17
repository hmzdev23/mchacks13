import { useEffect, useState } from "react";

export function useVideoMetrics(video: HTMLVideoElement | null) {
  const [metrics, setMetrics] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!video) return;

    const update = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      setMetrics({ width: video.videoWidth, height: video.videoHeight });
    };

    video.addEventListener("loadedmetadata", update);
    video.addEventListener("loadeddata", update);
    update();

    return () => {
      video.removeEventListener("loadedmetadata", update);
      video.removeEventListener("loadeddata", update);
    };
  }, [video]);

  return metrics;
}
