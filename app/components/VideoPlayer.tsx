import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";

/** How often to persist a Resume Point while the Video is playing. */
const REPORT_INTERVAL_MS = 15_000;

/**
 * The Video element plus its Resume Point reporter. While playing it posts the
 * current position (throttled to ~15s), and on pause / end / page-hide, so a
 * Subscriber's place survives a closed tab. The `resume` submission is excluded
 * from revalidation on the route, so these pings don't re-run the loader or
 * re-sign the URL. Reporting is client-only (effect); the element itself is a
 * plain `<video>` fed the already-signed URL.
 */
export function VideoPlayer({
  videoId,
  src,
  unsupportedLabel,
}: {
  videoId: string;
  src: string;
  unsupportedLabel: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const fetcher = useFetcher();
  // Keep the latest submit without re-wiring the listeners every render.
  const submitRef = useRef(fetcher.submit);
  submitRef.current = fetcher.submit;
  const lastReportedAt = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const report = () => {
      const positionSeconds = Math.floor(el.currentTime);
      if (positionSeconds <= 0) return;
      const durationSeconds = Number.isFinite(el.duration)
        ? Math.floor(el.duration)
        : 0;
      lastReportedAt.current = Date.now();
      submitRef.current(
        {
          intent: "resume",
          videoId,
          positionSeconds: String(positionSeconds),
          durationSeconds: String(durationSeconds),
        },
        { method: "post" },
      );
    };

    const onTimeUpdate = () => {
      if (el.paused) return;
      if (Date.now() - lastReportedAt.current >= REPORT_INTERVAL_MS) report();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report();
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("pause", report);
    el.addEventListener("ended", report);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("pause", report);
      el.removeEventListener("ended", report);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [videoId]);

  return (
    <video ref={ref} controls src={src}>
      {unsupportedLabel}
    </video>
  );
}
