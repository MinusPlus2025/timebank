import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import type { Strings } from "./i18n";

export function Screen({ title, children, onBack, s }: { title?: string; children: ReactNode; onBack?: () => void; s: Strings }) {
  return (
    <main className="screen">
      {onBack && (
        <button className="link back" onClick={onBack}>
          ← {s.back}
        </button>
      )}
      {title && <h1>{title}</h1>}
      {children}
    </main>
  );
}

export function QR({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: 560, color: { dark: "#1f1a17", light: "#fbf7ef" } }).then(setSrc);
  }, [value]);
  return src ? <img className="qr" src={src} alt={label} data-url={value} /> : <div className="qr" />;
}

export function CopyLink({ url, s }: { url: string; s: Strings }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt(s.copyLink, url);
        }
      }}
    >
      {done ? `✓ ${s.copied}` : s.copyLink}
    </button>
  );
}

export function ErrorNote({ error, s }: { error: string; s: Strings }) {
  return (
    <p className="note error" role="alert">
      <span aria-hidden>⚠︎</span> {error === "cancelled" ? s.cancelled : `${s.errorGeneric}: ${error}`}
    </p>
  );
}

export function errorMessage(err: unknown) {
  const e = err as { name?: string; message?: string };
  if (e?.name === "NotAllowedError" || e?.message === "cancelled") return "cancelled";
  return e?.message || String(err);
}
