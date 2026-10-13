import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// On a computer the "other phone" is another browser window, so the scanner can read the
// screen instead of the camera. One shared capture serves every scan until the person stops it,
// so a rescan of an aged-out heartbeat code doesn't ask for permission again.
let screen: MediaStream | null = null;
export const screenLive = () => !!screen && screen.getVideoTracks().some((t) => t.readyState === "live");

export const canScanScreen = () =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getDisplayMedia &&
  !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

/** Asks to share a screen or window; must run inside a click. */
export async function startScreenScan() {
  if (screenLive()) return;
  screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
}

/** The in-app scanner: reads QR codes frame by frame and hands each decoded text to onCode
 * until it returns true. Uses the shared screen capture when one is live, else the camera. */
export function LiveScan({ onCode, label }: { onCode: (text: string) => boolean; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState("");
  const accept = useRef(onCode);
  accept.current = onCode;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const fromScreen = screenLive();
    const tick = () => {
      if (stopped) return;
      const v = video.current;
      if (v && ctx && v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth) {
        // Downscale: QR codes decode fine at ~640px and phones keep up at full frame rate.
        // A shared screen holds the code in a corner of a large frame, so it keeps more pixels.
        const scale = Math.min(1, (fromScreen ? 1600 : 640) / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code?.data && accept.current(code.data)) return;
      }
      frame = requestAnimationFrame(tick);
    };

    const source = fromScreen
      ? Promise.resolve(screen as MediaStream)
      : navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    source
      ?.then((s) => {
        if (stopped) return fromScreen ? undefined : s.getTracks().forEach((t) => t.stop());
        if (!fromScreen) stream = s;
        if (video.current) {
          video.current.srcObject = s;
          if (fromScreen) video.current.dataset.source = "screen";
          video.current.play().catch(() => undefined);
        }
        frame = requestAnimationFrame(tick);
      })
      .catch((e: Error) => setFailed(e.message || "camera"));
    if (!navigator.mediaDevices) setFailed("camera");

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="live-scan">
      <video ref={video} playsInline muted aria-label={label} />
      <span className="live-scan-frame" aria-hidden />
      {failed && <p className="note warn small">{failed}</p>}
    </div>
  );
}
