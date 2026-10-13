import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/** The in-app camera: reads QR codes frame by frame and hands each decoded text to onCode
 * until it returns true. Used to catch a fresh heartbeat from the screen right in front of you. */
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

    const tick = () => {
      if (stopped) return;
      const v = video.current;
      if (v && ctx && v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth) {
        // Downscale: QR codes decode fine at ~640px and phones keep up at full frame rate.
        const scale = Math.min(1, 640 / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code?.data && accept.current(code.data)) return;
      }
      frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
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
