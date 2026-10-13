import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { hexToString, toHex, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { CATEGORIES, detectLang, formatHours, formatMinutes, strings, type Lang, type Strings } from "./i18n";
import { idOf, loadMe, saveMe, shortId, encodeSealPayload, decodeSealPayload, encodeBeat, decodeBeat, type Beat, loadFamily, addFamily, arrivalTag, visitIdOf, locationCommitment, rememberVisit, recalledVisit, type Me, type SealPayload } from "./identity";
import { createPasskey, passkeysSupported, signWithPasskey, type Assertion } from "./passkey";
import * as chain from "./chain";
import { stampFeedback } from "./feedback";
import { CopyLink, ErrorNote, QR, Screen, errorMessage } from "./ui";
import { usePhase, THEME_PREFS, type Phase, type ThemePref } from "./theme";
import { Wordmark } from "./Brand";
import { CountUp, Door, Facade, Garland, PaperPlane, TILE, WindowTile, spring } from "./Windows";
import { Onboarding, Street } from "./Onboarding";
import { LiveScan } from "./LiveScan";
import { detectInApp, ourRoute, type InApp } from "./inapp";
import { configureVoice, speak, speakFromTap, useSpeakOnShow, voiceSupported } from "./voice";

// ---------- routing & app state ----------

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || "/");
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash.split("/").filter(Boolean);
}

const go = (path: string) => (window.location.hash = path);
const appUrl = (path: string) => `${window.location.origin}${window.location.pathname}#${path}`;

function readPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* preferences are optional */
  }
}

type Ctx = { s: Strings; lang: Lang; phase: Phase; me: Me | null; setMe: (m: Me) => void; elder: boolean; toggleElder: () => void };

const tileFor = (category: number) => CATEGORIES.find((c) => c.id === category)?.tile ?? 4;

/** Sign with a passkey and work out which member signed. */
async function signAs(challenge: Hex, expected?: Hex) {
  const { assertion, publicKeys } = await signWithPasskey(challenge);
  for (const pk of publicKeys) {
    const id = idOf(pk.x, pk.y);
    if (expected ? id === expected : (await chain.getMember(id)).exists) return { assertion, id, ...pk };
  }
  throw new Error("wrong-person");
}

function useAsync() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run };
}

// ---------- screens ----------

function Welcome({ s, phase, setMe, elder, toggleElder }: Ctx) {
  const [seen, setSeen] = useState(() => readPref("timebank.onboarded", "0") === "1");
  const [splash, setSplash] = useState(true);
  const [name, setName] = useState("");
  const { busy, error, run } = useAsync();
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 3200);
    return () => clearTimeout(t);
  }, []);

  if (splash)
    return (
      <main className="splash" onClick={() => setSplash(false)}>
        <Wordmark size={64} animated />
        <p>{s.tagline}</p>
      </main>
    );

  if (!seen)
    return (
      <Onboarding
        s={s}
        phase={phase}
        onDone={() => {
          writePref("timebank.onboarded", "1");
          setSeen(true);
        }}
      />
    );

  const create = () =>
    run(async () => {
      const { x, y } = await createPasskey(name.trim() || "timebank");
      await chain.relay("register", [x, y]);
      setMe({ id: idOf(x, y), x, y, name: name.trim() });
    });
  const signIn = () =>
    run(async () => {
      const r = await signAs(toHex(crypto.getRandomValues(new Uint8Array(32))));
      setMe({ id: r.id, x: r.x, y: r.y, name: "" });
    });

  return (
    <main className="welcome">
      <div className="welcome-art" aria-hidden>
        <Street phase={phase} />
      </div>
      <div className="welcome-copy">
        <Wordmark size={48} animated />
        <p className="tagline">{s.tagline}</p>
        {!passkeysSupported() ? (
          <p className="note error">{s.noPasskey}</p>
        ) : (
          <div className="welcome-form">
            <label className="field">
              <span>{s.namePrompt}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={s.namePlaceholder} maxLength={20} />
              <small>{s.nameHint}</small>
            </label>
            <button className="primary" disabled={busy} onClick={create}>
              {busy ? s.creating : s.createPasskey}
            </button>
            <button className="link" disabled={busy} onClick={signIn}>
              {s.signInExisting}
            </button>
            {error && <ErrorNote error={error} s={s} />}
          </div>
        )}
        {!elder && (
          <button className="link elder-link" onClick={toggleElder}>
            {s.textTooSmall}
          </button>
        )}
        <p className="ethics">{s.ethics}</p>
      </div>
    </main>
  );
}

const familyName = (id: Hex, s: Strings) => loadFamily().find((f) => f.id === id)?.name || `${s.someone} ${shortId(id)}`;
const clock = (seconds: number, lang: Lang) =>
  new Date(seconds * 1000).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-GB", { hour: "2-digit", minute: "2-digit" });
const randomHex = () => toHex(crypto.getRandomValues(new Uint8Array(32)));
// Submit only codes at most this many blocks old, leaving the rest of LIVE_WINDOW for the relay to land.
const LIVE_MARGIN = chain.LIVE_WINDOW / 2;
const requestOf = (p: SealPayload): chain.SealRequest => ({ helper: p.h, receiver: p.r, minutes_: p.m, category: p.c, redeem: p.d, visitId: p.v, deadline: p.t });
const friendlyError = (error: string, s: Strings) => (/CodeExpired/.test(error) ? s.codeStale : /Expired/.test(error) ? s.expired : error);

/** The helper's arrival behind a seal, if any: when it started and how long they have been there. */
type Arrival = { start: number; minutes: number; atHome: boolean | null };

/** The helper's arrival behind a seal, if any: when it started, how long they have been there,
 * and, when the household secret is known, whether it really was at this household's door. */
function useArrival(visitId: Hex | null | undefined, helper: Hex, secret?: Hex) {
  const [arrival, setArrival] = useState<Arrival | null>(null);
  useEffect(() => {
    if (!visitId || visitId === chain.NO_VISIT) return setArrival(null);
    chain
      .getVisit(visitId)
      .then((v) =>
        setArrival(
          v.visitor === helper && !v.closed && v.start
            ? { start: v.start, minutes: Math.max(0, Math.floor((chain.nowSeconds() - v.start) / 60)), atHome: secret ? arrivalTag(secret, v.nonce) === v.tag : null }
            : null
        )
      )
      .catch(() => setArrival(null));
  }, [visitId, helper, secret]);
  return arrival;
}

function ArrivalLine({ s, lang, arrival, claimed }: { s: Strings; lang: Lang; arrival: Arrival | null; claimed: number }) {
  if (!arrival) return null;
  if (arrival.atHome === false) return <p className="note warn small">{s.notThisDoor}</p>;
  return (
    <>
      <p className="arrival">{s.arrivedAt(clock(arrival.start, lang), arrival.minutes)}</p>
      {claimed > arrival.minutes && <p className="note warn small">{s.overClaim}</p>}
    </>
  );
}

const communityName = (c: Hex) => (BigInt(c) !== 0n ? hexToString(c, { size: 32 }).replace(/\0/g, "") : "");

/** Watches for verified visitors at the doors of the family this device looks after. */
function useFamilyVisits(s: Strings) {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const family = loadFamily().filter((f) => f.secret);
    if (!family.length) return;
    let stop = false;
    let from: bigint | null = null;
    const tick = async () => {
      try {
        from ??= (await chain.client.getBlockNumber()) - 5n;
        const arrivals = await chain.findArrivals(from);
        if (arrivals.length) from = arrivals[arrivals.length - 1].block + 1n;
        const mine = arrivals
          .map((a) => ({ a, home: family.find((f) => arrivalTag(f.secret, a.nonce) === a.tag) }))
          .filter((x) => x.home);
        const last = mine[mine.length - 1];
        if (last && !stop) {
          const text = s.familyVisit(shortId(last.a.visitor), last.home!.name, communityName(last.a.community));
          setNotice(text);
          speak(text);
          stampFeedback();
        }
      } catch {
        /* keep polling */
      }
      if (!stop) setTimeout(tick, 2000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [s]);
  return notice;
}

function VisitNotice({ s, text }: { s: Strings; text: string }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div className="note ok visit-notice" role="status" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
          <strong>{s.familyVisitTitle}</strong>
          <p>{text}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Simple mode: one number and three large buttons, read aloud. */
function ElderHome({ s, phase, me }: Ctx & { me: Me }) {
  const [member, setMember] = useState<chain.Member | null>(null);
  const visit = useFamilyVisits(s);
  useEffect(() => {
    chain.getMember(me.id).then(setMember).catch(() => undefined);
  }, [me.id]);
  useSpeakOnShow(member && s.elderSpoken(formatMinutes(member.balance, s)));
  const buttons = [
    { label: s.elderHelped, path: "/scan", tile: 4 },
    { label: s.elderDoor, path: "/door", tile: 0 },
    { label: s.elderCode, path: "/code", tile: TILE.you },
  ];
  return (
    <main className="elder-home">
      <h1>{s.elderGreeting(me.name)}</h1>
      <p className="elder-balance">
        <span>{s.elderBalance}</span>
        <strong>{member ? formatMinutes(member.balance, s) : "…"}</strong>
      </p>
      <VisitNotice s={s} text={visit} />
      <nav className="elder-buttons">
        {buttons.map((b) => (
          <motion.button key={b.path} whileTap={{ scale: 0.97 }} className="elder-btn" onClick={() => { speak(b.label); go(b.path); }}>
            <span className="elder-btn-art"><WindowTile phase={phase} tile={b.tile} /></span>
            {b.label}
          </motion.button>
        ))}
      </nav>
    </main>
  );
}

function Home({ s, lang, phase, me }: Ctx & { me: Me }) {
  const visit = useFamilyVisits(s);
  const [member, setMember] = useState<chain.Member | null>(null);
  const [seals, setSeals] = useState<chain.SealRecord[]>([]);
  const [open, setOpen] = useState<chain.SealRecord | null>(null);
  useEffect(() => {
    chain.getMember(me.id).then(setMember).catch(() => undefined);
    chain.getSealsOf(me.id).then((list) => setSeals(list.reverse())).catch(() => undefined);
  }, [me.id]);

  const given = seals.filter((x) => x.helper === me.id).reduce((sum, x) => sum + x.minutes, 0);
  useSpeakOnShow(member && s.homeSpoken(formatHours(given), formatMinutes(member.balance, s)));
  // A multiple of 4 fills both the 2-column phone layout and the 4-column desktop layout.
  const total = Math.max(8, Math.ceil((seals.length + 1) / 4) * 4);
  const unlit = total - seals.length - 1;

  return (
    <main className="home">
      <header className="sky">
        <p className="greeting">
          {phase === "day" ? s.greetingDay : s.greetingNight}
          {me.name ? `${lang === "zh" ? "，" : ", "}${me.name}` : ""}
        </p>
        <div className="headline">
          <CountUp value={given} format={(v) => formatHours(Math.round(v))} />
          <span>
            {s.litHeadline}
            <small>{s.litSub}</small>
          </span>
        </div>
        <div className="sky-meta">
          <span>
            {s.available} <strong>{member ? formatMinutes(member.balance, s) : "…"}</strong>
          </span>
          <span className="sky-links">
            <button className="link" onClick={() => go("/door")}>{s.door}</button>
            <button className="link" onClick={() => go("/family")}>{s.familyShort}</button>
            {!!member?.balance && <button className="link" onClick={() => go("/donate")}>{s.donateShort}</button>}
          </span>
        </div>
        <VisitNotice s={s} text={visit} />
        <nav className="dock">
          <motion.button whileTap={{ scale: 0.96 }} className="dock-btn main" onClick={() => go("/code")}>
            {s.helpedOthers}
            <small>{s.helpedOthersSub}</small>
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} className="dock-btn" onClick={() => go("/scan")}>
            {s.othersHelped}
            <small>{s.othersHelpedSub}</small>
          </motion.button>
        </nav>
      </header>
      {seals.length === 0 && (
        <motion.section className="how" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.3 }}>
          <h2>{s.howTitle}</h2>
          <ol>
            {s.howSteps.map((step, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.45 + i * 0.12 }}>
                <span className="step-num">{i + 1}</span>
                {step}
              </motion.li>
            ))}
          </ol>
        </motion.section>
      )}
      <Facade>
        <WindowTile phase={phase} tile={TILE.you} label={s.yourWindow} onClick={() => go("/code")} />
        {seals.map((seal, i) => (
          <WindowTile
            key={seal.id}
            phase={phase}
            tile={tileFor(seal.category)}
            label={CATEGORIES.find((c) => c.id === seal.category)?.[lang]}
            onClick={() => setOpen(seal)}
            layoutId={`seal-${seal.id}`}
            lightAt={0.7 + i * 0.18}
          />
        ))}
        {Array.from({ length: unlit }, (_, i) => (
          <WindowTile key={`u${i}`} phase={phase} tile={TILE.unlit[i % 2]} lit={false} />
        ))}
      </Facade>
      <AnimatePresence>
      {open && (
        <motion.div className="overlay" onClick={() => setOpen(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="sheet window-detail"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={spring}
          >
            <WindowTile phase={phase} tile={tileFor(open.category)} layoutId={`seal-${open.id}`} />
            <h2>
              {CATEGORIES.find((c) => c.id === open.category)?.[lang]} · {formatMinutes(open.minutes, s)}
            </h2>
            <p className="muted">
              {open.helper === me.id ? s.iHelped : s.helpedMe} {shortId(open.helper === me.id ? open.receiver : open.helper)} ·{" "}
              {new Date(open.timestamp * 1000).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB")}
            </p>
            <a className="link" href={`${chain.EXPLORER}/address/${chain.TIMEBANK}`} target="_blank" rel="noreferrer">
              {s.onChain} ↗
            </a>
            <button className="secondary" onClick={() => setOpen(null)}>{s.close}</button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </main>
  );
}

function MyCode({ s, phase, me }: Ctx & { me: Me }) {
  const url = appUrl(`/u/${me.id}`);
  useSpeakOnShow(`${s.myCode}。${s.myCodeHint}`);
  return (
    <Screen s={s} title={s.myCode} onBack={() => go("/")}>
      <div className="sheet center">
        <div className="qr-frame">
          <QR value={url} label={s.myCode} />
          <span className="qr-badge"><WindowTile phase={phase} tile={TILE.you} /></span>
        </div>
        <p className="muted">{s.myCodeHint}</p>
        <button className="primary" onClick={() => go("/scan")}>{s.scanTheirCode}</button>
        <CopyLink url={url} s={s} />
      </div>
    </Screen>
  );
}

/** Standalone scenes for recording the demo video: #/demo/street | garland | plane | door */
function DemoScene({ phase, which }: Ctx & { which: string }) {
  const tiles = [6, 0, 7, 2, 4, 8, 3, 7];
  return (
    <main className="demo-scene">
      {which === "street" && (
        <Facade>
          {tiles.map((t, i) => (
            <WindowTile key={i} phase={phase} tile={t} lit={t < 7} lightAt={t < 7 && t !== 6 ? 0.8 + i * 0.25 : undefined} />
          ))}
        </Facade>
      )}
      {which === "garland" && <Garland phase={phase} left={TILE.you} right={3} />}
      {which === "plane" && <PaperPlane phase={phase} />}
      {which === "door" && (
        <Door open>
          <WindowTile phase={phase} tile={0} lightAt={0.4} />
        </Door>
      )}
    </main>
  );
}

/** Scans any timebank code in the page itself, so nobody needs WeChat, Alipay or the system camera. */
function ScanHelp({ s, phase }: Ctx) {
  const [scanning, setScanning] = useState(false);
  const [notOurs, setNotOurs] = useState(false);
  useSpeakOnShow(`${s.scanTitle}${s.scanBody}`);
  return (
    <Screen s={s} title={s.scanTitle} onBack={() => go("/")}>
      {scanning ? (
        <>
          <p className="instruction">{s.scanPoint}</p>
          <LiveScan
            label={s.scanPoint}
            onCode={(text) => {
              const route = ourRoute(text);
              if (!route) {
                setNotOurs(true);
                return false;
              }
              go(route);
              return true;
            }}
          />
          {notOurs && <p className="note warn small">{s.scanNotOurs}</p>}
        </>
      ) : (
        <>
          <div className="person-window"><WindowTile phase={phase} tile={4} lightAt={0.3} /></div>
          <p className="instruction">{s.scanBody}</p>
          <button className="primary" onClick={() => setScanning(true)}>{s.scanNow}</button>
        </>
      )}
      <p className="muted">{s.scanCopy}</p>
    </Screen>
  );
}

/** Shown inside chat apps' built-in browsers, where passkeys don't work. */
function OpenInBrowser({ s, lang, app, onClose }: { s: Strings; lang: Lang; app: InApp; onClose: () => void }) {
  return (
    <div className="overlay inapp" role="dialog" aria-label={s.inAppTitle}>
      <span className="inapp-arrow" aria-hidden>↗</span>
      <section className="settings-sheet">
        <h2>{s.inAppTitle}</h2>
        <p className="instruction">{s.inAppBody(app[lang], app.ios)}</p>
        <p className="muted small">{s.inAppCopy}</p>
        <CopyLink url={window.location.href} s={s} />
        <button className="link" onClick={onClose}>{s.inAppContinue}</button>
      </section>
    </div>
  );
}

function Person({ s, phase, me, id, secret }: Ctx & { id: Hex; secret?: Hex }) {
  if (me && me.id === id)
    return (
      <Screen s={s} title={s.scanTitle} onBack={() => go("/")}>
        <div className="person-window"><WindowTile phase={phase} tile={TILE.you} /></div>
        <p className="instruction">{s.ownCode}</p>
      </Screen>
    );
  return <PersonActions s={s} phase={phase} me={me} id={id} secret={secret} />;
}

function PersonActions({ s, phase, me, id, secret }: { s: Strings; phase: Phase; me: Me | null; id: Hex; secret?: Hex }) {
  const [guarded, setGuarded] = useState(false);
  const [atDoor, setAtDoor] = useState(false);
  const { busy, error, run } = useAsync();
  useEffect(() => {
    chain.getGuardian(id).then((g) => setGuarded(chain.hasGuardian(g))).catch(() => undefined);
  }, [id]);
  const arrive = () =>
    run(async () => {
      if (!me) throw new Error("wrong-person");
      if (!secret) throw new Error(s.cardNeeded);
      const nonce = randomHex();
      const challenge = randomHex();
      const tag = arrivalTag(secret, nonce);
      const location = await locationCommitment(secret, nonce);
      const { assertion } = await signAs(await chain.arriveDigest(tag, nonce, location, challenge), me.id);
      await chain.relay("arrive", [me.id, tag, nonce, location, challenge, chain.toArgs(assertion)]);
      rememberVisit(id, visitIdOf(me.id, challenge));
      setAtDoor(true);
    });
  if (guarded)
    return (
      <Screen s={s} title={familyName(id, s)} onBack={() => go("/")}>
        <div className="person-window"><WindowTile phase={phase} tile={TILE.family} /></div>
        <p className="muted center-text">{s.guardianNote}</p>
        <div className="stack">
          {atDoor ? (
            <p className="note ok">{s.atDoorDone}</p>
          ) : secret ? (
            <button className="primary" disabled={busy} onClick={arrive}>{s.atDoor}</button>
          ) : (
            <p className="muted center-text">{s.cardNeeded}</p>
          )}
          <button className="secondary" onClick={() => go(`/helped/${id}`)}>{s.helpedThem}</button>
          <button className="link" onClick={() => go(`/gift/${id}`)}>{s.giftTo}</button>
        </div>
        {error && <ErrorNote error={error === "wrong-person" ? s.needRegister : error} s={s} />}
      </Screen>
    );
  return (
    <Screen s={s} title={`${s.someone} ${shortId(id)}`} onBack={() => go("/")}>
      <div className="person-window"><WindowTile phase={phase} tile={TILE.unlit[0]} lit={false} /></div>
      <div className="stack">
        <button className="primary" onClick={() => go(`/thank/${id}`)}>{s.thank}</button>
        <button className="secondary" onClick={() => go(`/gift/${id}`)}>{s.giftTo}</button>
      </div>
    </Screen>
  );
}

let choiceGroup = 0;
function Choice({ options, value, onChange, render }: { options: readonly number[]; value: number; onChange: (v: number) => void; render: (v: number) => string }) {
  const [group] = useState(() => `choice-${choiceGroup++}`);
  return (
    <div className="choices" role="radiogroup">
      {options.map((o) => (
        <motion.button key={o} role="radio" aria-checked={o === value} className={o === value ? "choice on" : "choice"} onClick={() => onChange(o)} whileTap={{ scale: 0.95 }}>
          {o === value && <motion.span layoutId={group} className="choice-pill" transition={spring} />}
          <span className="choice-label">{render(o)}</span>
        </motion.button>
      ))}
    </div>
  );
}

const shortMinutes = (m: number, s: Strings) => (m % 60 === 0 || m < 60 ? formatMinutes(m, s) : `${(m / 60).toFixed(1)} ${s.hoursUnit}`);

function CategoryPicker({ phase, lang, value: category, onChange: setCategory }: { phase: Phase; lang: Lang; value: number; onChange: (c: number) => void }) {
  return (
    <div className="categories">
        {CATEGORIES.map((c) => (
          <motion.button
            key={c.id}
            className={c.id === category ? "category on" : "category"}
            aria-pressed={c.id === category}
            onClick={() => setCategory(c.id)}
            whileTap={{ scale: 0.95 }}
            transition={spring}
          >
            <motion.span
              className="category-art"
              animate={{ scale: c.id === category ? 1.06 : 0.94, opacity: c.id === category ? 1 : 0.55, filter: c.id === category ? "grayscale(0)" : "grayscale(0.7)" }}
              transition={spring}
            >
              {c.id === category && <motion.span layoutId="category-glow" className="category-glow" transition={spring} />}
              <WindowTile phase={phase} tile={c.tile} />
            </motion.span>
            <span>{c[lang]}</span>
            <span className="category-dot" aria-hidden>
              {c.id === category && <motion.span layoutId="category-dot" className="category-dot-on" transition={spring} />}
            </span>
          </motion.button>
        ))}
      </div>
  );
}

function Thank({ s, lang, phase, me, helper }: Ctx & { me: Me; helper: Hex }) {
  const [category, setCategory] = useState(1);
  const [minutes, setMinutes] = useState(60);
  const [redeem, setRedeem] = useState(false);
  const [balance, setBalance] = useState(0);
  const [payload, setPayload] = useState("");
  const [live, setLive] = useState<{ digest: Hex; key: PrivateKeyAccount; nonce: number } | null>(null);
  const [landed, setLanded] = useState(false);
  const { busy, error, run } = useAsync();
  useEffect(() => {
    chain.getMember(me.id).then((m) => setBalance(m.balance)).catch(() => undefined);
  }, [me.id]);

  const sign = () =>
    run(async () => {
      if (helper === me.id) throw new Error(lang === "zh" ? "不能感谢自己" : "You can't thank yourself");
      // Short-lived on purpose: the helper should scan it in person, not receive it hours later.
      const q: chain.SealRequest = { helper, receiver: me.id, minutes_: minutes, category, redeem, visitId: chain.NO_VISIT, deadline: chain.nowSeconds() + 300 };
      // A throwaway key, kept only in this page's memory, that this screen uses to draw a new
      // heartbeat code every second. Face ID approves exactly this key, so no other screen can.
      const key = privateKeyToAccount(generatePrivateKey());
      const { nonce } = await chain.getMember(me.id);
      const digest = await chain.inPersonDigest(q, key.address);
      const { assertion } = await signAs(digest, me.id);
      const p: SealPayload = { h: helper, r: me.id, m: minutes, c: category, d: redeem, v: q.visitId, t: q.deadline, a: assertion, k: key.address };
      setLive({ digest, key, nonce });
      setPayload(encodeSealPayload(p));
    });

  // The receiver's own screen learns the seal landed when their nonce moves on.
  useEffect(() => {
    if (!live || landed) return;
    const t = window.setInterval(() => {
      chain
        .getMember(me.id)
        .then((m) => {
          if (m.nonce > live.nonce) {
            setLanded(true);
            setTimeout(stampFeedback, 300);
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => clearInterval(t);
  }, [live, landed, me.id]);

  useSpeakOnShow(landed ? `${s.sealed}。${s.thankLanded}` : payload ? s.showToHelper : `${s.thankTitle}。${s.whatHelp}`);
  if (landed) {
    return (
      <Screen s={s}>
        <div className="center celebrate">
          <Garland phase={phase} left={tileFor(category)} right={TILE.you} />
          <h1>{s.sealed}</h1>
          <p className="badge-live">{s.faceToFace}</p>
          <p className="quote">{s.thankLanded}</p>
          <button className="secondary" onClick={() => go("/")}>{s.home}</button>
        </div>
      </Screen>
    );
  }
  if (payload && live) {
    return (
      <Screen s={s} title={s.thankTitle} onBack={() => (setPayload(""), setLive(null))}>
        <div className="sheet center">
          <div className="hb-summary">
            <span>
              <strong>{(CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0])[lang]} · {formatMinutes(minutes, s)}</strong>
              <small>{s.someone} {shortId(helper)}</small>
            </span>
          </div>
          <HeartbeatCode s={s} payload={payload} digest={live.digest} liveKey={live.key} />
          <p className="instruction">{s.showToHelper}</p>
          <p className="hb-hint"><span aria-hidden>⏱</span> {s.heartbeatHint}</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen s={s} title={s.thankTitle} onBack={() => go("/")}>
      <h2>{s.whatHelp}</h2>
      <CategoryPicker phase={phase} lang={lang} value={category} onChange={setCategory} />
      <h2>{s.howLong}</h2>
      <Choice options={[30, 60, 90, 120]} value={minutes} onChange={setMinutes} render={(m) => shortMinutes(m, s)} />
      <label className="toggle">
        <input type="checkbox" checked={redeem} disabled={balance < minutes} onChange={(e) => setRedeem(e.target.checked)} />
        <span>
          {s.payWithMine} {balance < minutes && <em>({s.notEnough})</em>}
          <small>{s.payWithMineHint}</small>
        </span>
      </label>
      <button className="primary" disabled={busy} onClick={sign}>{s.signThanks}</button>
      {error && <ErrorNote error={error === "wrong-person" ? s.wrongPerson : error} s={s} />}
    </Screen>
  );
}

/** The receiver's live code: redrawn every second from the newest Monad block and signed by the
 * screen's throwaway key. A photo of it stops working within LIVE_WINDOW blocks (a few seconds). */
function HeartbeatCode({ s, payload, digest, liveKey }: { s: Strings; payload: string; digest: Hex; liveKey: PrivateKeyAccount }) {
  const [beat, setBeat] = useState<{ block: bigint; code: string } | null>(null);
  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const draw = async () => {
      try {
        const block = await chain.latestBlock();
        const sig = await liveKey.signMessage({ message: { raw: chain.liveCodeHash(digest, block) } });
        if (!stopped) setBeat({ block, code: encodeBeat({ block, sig }) });
      } catch {
        /* keep the last code; the next beat retries */
      }
      if (!stopped) timer = window.setTimeout(draw, 1000);
    };
    draw();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [digest, liveKey]);
  return (
    <div className="heartbeat">
      <div className="hb-frame">
        {/* The ring drains between beats: the code on screen is only ever a moment old. */}
        <svg className="hb-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <rect className="hb-ring-track" x="1.5" y="1.5" width="97" height="97" rx="9" pathLength={1} />
          {beat && (
            <motion.rect
              key={String(beat.block)}
              className="hb-ring-live"
              x="1.5"
              y="1.5"
              width="97"
              height="97"
              rx="9"
              pathLength={1}
              initial={{ pathLength: 1 }}
              animate={{ pathLength: 0 }}
              transition={{ duration: 1.1, ease: "linear" }}
            />
          )}
        </svg>
        {beat ? <QR value={appUrl(`/confirm/${payload}/${beat.code}`)} label={s.showToHelper} /> : <div className="qr hb-connecting">{s.connectingMonad}</div>}
      </div>
      <p className="heartbeat-line">
        <span className="hb-live">LIVE</span>
        <motion.span key={String(beat?.block)} className="heartbeat-dot" initial={{ scale: 2, opacity: 0.2 }} animate={{ scale: 1, opacity: 1 }} aria-hidden />
        {beat ? s.heartbeatBlock(String(beat.block)) : "…"}
      </p>
    </div>
  );
}

function Confirm({ s, lang, phase, me, setMe, raw, beatRaw }: Ctx & { raw: string; beatRaw?: string }) {
  const p = useMemo(() => {
    try {
      return decodeSealPayload(raw);
    } catch {
      return null;
    }
  }, [raw]);
  const [done, setDone] = useState<Hex | null>(null);
  const [seconds, setSeconds] = useState("");
  // Face-to-face seals: the helper's signature, kept while they point the camera at a fresh code.
  const [signed, setSigned] = useState<{ assertion: Assertion; q: chain.SealRequest } | null>(null);
  const [rescan, setRescan] = useState(false);
  const [scanRound, setScanRound] = useState(0);
  const [codeAge, setCodeAge] = useState<number | null>(null);
  const { busy, error, run } = useAsync();
  useSpeakOnShow(p && (done ? `${s.sealed}。${s.sealedBody}` : `${s.confirmTitle}。${s.confirmBody(formatMinutes(p.m, s), (CATEGORIES.find((c) => c.id === p.c) ?? CATEGORIES[0])[lang])}`));
  if (!p) return <Screen s={s}><ErrorNote error="bad link" s={s} /></Screen>;
  const cat = CATEGORIES.find((c) => c.id === p.c) ?? CATEGORIES[0];

  // Submit with a heartbeat if it is fresh enough to land inside LIVE_WINDOW; otherwise ask for one more scan.
  const submitLive = (h: { assertion: Assertion; q: chain.SealRequest }, beat: Beat | null) =>
    run(async () => {
      const now = await chain.latestBlock();
      if (!beat || beat.block > now || now - beat.block > BigInt(LIVE_MARGIN)) {
        setRescan(true);
        setScanRound((n) => n + 1); // restart the camera for a newer code
        return;
      }
      setRescan(false);
      const t0 = performance.now();
      try {
        const { hash, blockNumber } = await chain.relay("sealInPerson", [h.q, p.k, beat.block, beat.sig, chain.toArgs(h.assertion), chain.toArgs(p.a)]);
        setSeconds(((performance.now() - t0) / 1000).toFixed(1));
        if (blockNumber) setCodeAge(Number(BigInt(blockNumber) - beat.block));
        setDone(hash);
        setTimeout(stampFeedback, 900);
      } catch (e) {
        if (/CodeExpired/.test(errorMessage(e))) {
          setRescan(true);
          setScanRound((n) => n + 1);
        }
        else setSigned(null); // anything else: let them read the error and start over
        throw e;
      }
    });

  const seal = () =>
    run(async () => {
      if (chain.nowSeconds() > p.t) throw new Error("Expired");
      const q = requestOf(p);
      if (p.k) {
        const helper = await signAs(await chain.inPersonDigest(q, p.k), p.h);
        if (!me) setMe({ id: helper.id, x: helper.x, y: helper.y, name: "" });
        const h = { assertion: helper.assertion, q };
        setSigned(h);
        // Face ID takes a few seconds, so the code from the link may already be too old.
        void submitLive(h, beatRaw ? decodeBeat(beatRaw) : null);
        return;
      }
      const helper = await signAs(await chain.sealDigest(q), p.h);
      if (!me) setMe({ id: helper.id, x: helper.x, y: helper.y, name: "" });
      const t0 = performance.now();
      const { hash } = await chain.relay("seal", [q, chain.toArgs(helper.assertion), chain.toArgs(p.a)]);
      setSeconds(((performance.now() - t0) / 1000).toFixed(1));
      setDone(hash);
      setTimeout(stampFeedback, 900);
    });

  if (done) {
    return (
      <Screen s={s}>
        <div className="center celebrate">
          <Garland phase={phase} left={TILE.you} right={cat.tile} />
          <h1>{s.sealed}</h1>
          <Receipt s={s} hash={done} seconds={seconds} codeAge={p.k ? codeAge : null} />
          <button className="secondary" onClick={() => go("/")}>{s.home}</button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen s={s} title={s.confirmTitle}>
      <div className="sheet center">
        <WindowTile phase={phase} tile={cat.tile} />
        <p className="instruction">{s.confirmBody(formatMinutes(p.m, s), cat[lang])}</p>
        <p className="muted small">{s.someone} {shortId(p.r)}</p>
        {p.k && <p className="badge-live">{s.faceToFace}</p>}
        {p.k && signed && !rescan && <Checks s={s} state={busy ? "checking" : "waiting"} />}
        {signed && rescan ? (
          <>
            <p className="instruction">{s.scanAgain}</p>
            <LiveScan
              key={scanRound}
              label={s.scanAgain}
              onCode={(text) => {
                const m = text.match(/#\/confirm\/([^/]+)\/([^/?#]+)/);
                const beat = m && m[1] === raw ? decodeBeat(m[2]) : null;
                if (!beat) return false;
                void submitLive(signed, beat);
                return true;
              }}
            />
          </>
        ) : (
          <button className="primary" disabled={busy || !!signed} onClick={seal}>{busy || signed ? s.sealing : s.signSeal}</button>
        )}
        {error && <ErrorNote error={error === "wrong-person" ? s.wrongPerson : friendlyError(error, s)} s={s} />}
      </div>
    </Screen>
  );
}

/** The three things a face-to-face seal proves, shown while Monad checks them and on the receipt. */
function Checks({ s, state, codeAge }: { s: Strings; state: "waiting" | "checking" | "done"; codeAge?: number | null }) {
  const items = [s.checkTheirFace, s.checkYourFace, codeAge != null ? s.checkHeartbeatAge(codeAge) : s.checkHeartbeat];
  return (
    <ul className={`checks ${state}`}>
      {items.map((label, i) => (
        <motion.li
          key={label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...spring, delay: state === "done" ? 1.6 + i * 0.15 : i * 0.12 }}
        >
          <span className={state === "checking" && i === 2 ? "check-dot spin" : "check-dot ok"} aria-hidden>
            {state === "checking" && i === 2 ? "" : "✓"}
          </span>
          {label}
        </motion.li>
      ))}
    </ul>
  );
}

function Receipt({ s, hash, seconds, codeAge }: { s: Strings; hash: Hex; seconds: string; codeAge?: number | null }) {
  return (
    <motion.div className="receipt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 1.4 }}>
      <div className="receipt-head">
        <span className="receipt-dot" aria-hidden />
        <strong>{s.receiptTitle}</strong>
        {seconds && <span className="receipt-time">{s.receiptTime(seconds)}</span>}
      </div>
      {codeAge != null ? (
        <>
          <p className="receipt-live">{s.faceToFace}</p>
          <Checks s={s} state="done" codeAge={codeAge} />
        </>
      ) : (
        <p>{s.receiptSigned}</p>
      )}
      <p className="muted small">{s.receiptWhy}</p>
      <a className="receipt-tx" href={`${chain.EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">
        {s.receiptTx} {hash.slice(0, 10)}…{hash.slice(-6)} ↗
      </a>
    </motion.div>
  );
}

function Gift({ s, phase, me, to }: Ctx & { me: Me; to: Hex }) {
  const [balance, setBalance] = useState(0);
  const [minutes, setMinutes] = useState(60);
  const [done, setDone] = useState("");
  const { busy, error, run } = useAsync();
  useEffect(() => {
    chain.getMember(me.id).then((m) => setBalance(m.balance)).catch(() => undefined);
  }, [me.id]);

  useSpeakOnShow(done ? `${s.gifted}。${s.giftedBody}` : `${s.giftTitle}。${s.giftHint}`);
  const send = () =>
    run(async () => {
      const digest = await chain.giftDigest(me.id, to, minutes);
      const { assertion } = await signAs(digest, me.id);
      const { hash } = await chain.relay("gift", [me.id, to, minutes, chain.toArgs(assertion)]);
      setDone(hash);
      setTimeout(stampFeedback, 1600);
    });

  if (done) {
    return (
      <Screen s={s}>
        <div className="center celebrate">
          <PaperPlane phase={phase} />
          <h1>{s.gifted} · {formatMinutes(minutes, s)}</h1>
          <p className="quote">{s.giftedBody}</p>
          <a className="link" href={`${chain.EXPLORER}/tx/${done}`} target="_blank" rel="noreferrer">{s.onChain} ↗</a>
          <button className="secondary" onClick={() => go("/")}>{s.home}</button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen s={s} title={s.giftTitle} onBack={() => go("/")}>
      <div className="gift-head"><WindowTile phase={phase} tile={TILE.family} /></div>
      <p className="muted">{s.giftHint}</p>
      <p>{s.available}: <strong>{formatMinutes(balance, s)}</strong></p>
      <h2>{s.giftAmount}</h2>
      <Choice options={[30, 60, 120, 300]} value={minutes} onChange={setMinutes} render={(m) => shortMinutes(m, s)} />
      <button className="primary" disabled={busy || balance < minutes} onClick={send}>{balance < minutes ? s.notEnough : s.signGift}</button>
      {error && <ErrorNote error={error} s={s} />}
    </Screen>
  );
}

function Donate({ s, me }: Ctx & { me: Me }) {
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [done, setDone] = useState(false);
  const { busy, error, run } = useAsync();
  useEffect(() => {
    chain.getMember(me.id).then((m) => setBalance(m.balance)).catch(() => undefined);
    chain.getPoolBalance().then(setPool).catch(() => undefined);
  }, [me.id, done]);

  const give = () =>
    run(async () => {
      const digest = await chain.donateDigest(me.id, minutes);
      const { assertion } = await signAs(digest, me.id);
      await chain.relay("donate", [me.id, minutes, chain.toArgs(assertion)]);
      setDone(true);
      stampFeedback();
    });

  return (
    <Screen s={s} title={s.donate} onBack={() => go("/")}>
      <p className="muted">{s.donateHint}</p>
      <p>{s.pool}: <strong>{formatMinutes(pool, s)}</strong></p>
      {done ? (
        <p className="note ok">{s.donated}</p>
      ) : (
        <>
          <Choice options={[30, 60, 120]} value={minutes} onChange={setMinutes} render={(m) => shortMinutes(m, s)} />
          <button className="primary" disabled={busy || balance < minutes} onClick={give}>{balance < minutes ? s.notEnough : s.donate}</button>
        </>
      )}
      {error && <ErrorNote error={error} s={s} />}
    </Screen>
  );
}

function DoorCheck({ s, phase }: Ctx) {
  const [challenge] = useState(() => toHex(crypto.getRandomValues(new Uint8Array(32))));
  const [result, setResult] = useState<{ id: Hex; community: Hex } | null>(null);
  useEffect(() => {
    let stop = false;
    let from: bigint | null = null;
    const tick = async () => {
      try {
        from ??= (await chain.client.getBlockNumber()) - 5n;
        const found = await chain.findCheckIn(challenge, from);
        if (found?.id && !stop) {
          setResult({ id: found.id, community: found.community! });
          stampFeedback();
          return;
        }
      } catch {
        /* keep polling */
      }
      if (!stop) setTimeout(tick, 1000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [challenge]);

  const community = result && BigInt(result.community) !== 0n ? hexToString(result.community, { size: 32 }).replace(/\0/g, "") : "";
  useSpeakOnShow(result ? `${s.verified}。${community ? s.verifiedCommunity(community) : s.notCertified}` : `${s.doorTitle}。${s.doorHint}`);
  return (
    <Screen s={s} title={s.doorTitle} onBack={() => go("/")}>
      {result ? (
        <Door open>
          <WindowTile phase={phase} tile={0} lightAt={0.4} />
        </Door>
      ) : (
        <div className="sheet center door-qr">
          <QR value={appUrl(`/checkin/${challenge}`)} label={s.doorTitle} />
        </div>
      )}
      {result ? (
        <div className={community ? "note ok verified" : "note warn"} role="status">
          <strong>{s.verified} · {s.someone} {shortId(result.id)}</strong>
          <p>{community ? s.verifiedCommunity(community) : s.notCertified}</p>
        </div>
      ) : (
        <>
          <p className="instruction center-text">{s.doorHint}</p>
          <p className="muted pulse center-text">{s.waiting}</p>
        </>
      )}
    </Screen>
  );
}

function CheckIn({ s, me, setMe, challenge }: Ctx & { challenge: Hex }) {
  const [done, setDone] = useState(false);
  const { busy, error, run } = useAsync();
  useSpeakOnShow(done ? s.checkedIn : `${s.checkInTitle}。${s.checkInBody}`);
  const prove = () =>
    run(async () => {
      const r = await signAs(challenge, me?.id);
      if (!me) setMe({ id: r.id, x: r.x, y: r.y, name: "" });
      await chain.relay("checkIn", [r.id, challenge, chain.toArgs(r.assertion)]);
      setDone(true);
    });
  return (
    <Screen s={s} title={s.checkInTitle}>
      <div className="sheet center">
        <p>{s.checkInBody}</p>
        {done ? <p className="note ok">{s.checkedIn}</p> : <button className="primary" disabled={busy} onClick={prove}>{s.signCheckIn}</button>}
        {error && <ErrorNote error={error === "wrong-person" ? s.needRegister : error} s={s} />}
      </div>
    </Screen>
  );
}

/** A helper at the home of someone looked after by family: they sign first, the guardian confirms. */
function HelpedFor({ s, lang, phase, me, receiver }: Ctx & { me: Me; receiver: Hex }) {
  const [category, setCategory] = useState(1);
  const [minutes, setMinutes] = useState(60);
  const [balance, setBalance] = useState(0);
  const [payload, setPayload] = useState("");
  const { busy, error, run } = useAsync();
  useEffect(() => {
    chain.getMember(receiver).then((m) => setBalance(m.balance)).catch(() => undefined);
  }, [receiver]);
  const redeem = balance >= minutes;
  const [visitId] = useState(() => recalledVisit(receiver));
  const arrival = useArrival(visitId, me.id);
  const sign = () =>
    run(async () => {
      // The guardian confirms remotely, so the window is a day rather than minutes.
      const q: chain.SealRequest = {
        helper: me.id,
        receiver,
        minutes_: minutes,
        category,
        redeem,
        visitId: arrival && visitId ? visitId : chain.NO_VISIT,
        deadline: chain.nowSeconds() + 24 * 3600,
      };
      const { assertion } = await signAs(await chain.sealDigest(q), me.id);
      setPayload(encodeSealPayload({ h: me.id, r: receiver, m: minutes, c: category, d: redeem, v: q.visitId, t: q.deadline, a: assertion }));
    });
  useSpeakOnShow(payload ? s.askGuardianHint : s.whatDidYouDo);
  if (payload) {
    const url = appUrl(`/witness/${payload}`);
    return (
      <Screen s={s} title={s.askGuardian} onBack={() => setPayload("")}>
        <div className="sheet center">
          <QR value={url} label={s.askGuardian} />
          <p className="instruction">{s.askGuardianHint}</p>
          <CopyLink url={url} s={s} />
        </div>
      </Screen>
    );
  }
  return (
    <Screen s={s} title={s.helpedThem} onBack={() => go(`/u/${receiver}`)}>
      <h2>{s.whatDidYouDo}</h2>
      <CategoryPicker phase={phase} lang={lang} value={category} onChange={setCategory} />
      <h2>{s.howLong}</h2>
      <Choice options={[30, 60, 90, 120]} value={minutes} onChange={setMinutes} render={(m) => shortMinutes(m, s)} />
      <ArrivalLine s={s} lang={lang} arrival={arrival} claimed={minutes} />
      {redeem && <p className="muted">{s.useFamilyHours(formatMinutes(balance, s))}</p>}
      <button className="primary" disabled={busy} onClick={sign}>{s.signAsHelper}</button>
      {error && <ErrorNote error={error} s={s} />}
    </Screen>
  );
}

/** The guardian confirms, from anywhere, the help their relative received. */
function Witness({ s, lang, phase, me, raw }: Ctx & { me: Me; raw: string }) {
  const p = useMemo(() => {
    try {
      return decodeSealPayload(raw);
    } catch {
      return null;
    }
  }, [raw]);
  const [done, setDone] = useState<Hex | null>(null);
  const [seconds, setSeconds] = useState("");
  const { busy, error, run } = useAsync();
  const cat = CATEGORIES.find((c) => c.id === p?.c) ?? CATEGORIES[0];
  const arrival = useArrival(p?.v, p?.h ?? chain.NO_VISIT, loadFamily().find((f) => f.id === p?.r)?.secret);
  useSpeakOnShow(p && (done ? s.sealed : s.witnessBody(shortId(p.h), familyName(p.r, s), cat[lang], formatMinutes(p.m, s))));
  if (!p) return <Screen s={s}><ErrorNote error="bad link" s={s} /></Screen>;

  const confirm = () =>
    run(async () => {
      if ((await chain.getGuardian(p.r)) !== me.id) throw new Error(s.notGuardian);
      if (chain.nowSeconds() > p.t) throw new Error("Expired");
      const q = requestOf(p);
      const guardian = await signAs(await chain.sealDigest(q), me.id);
      const t0 = performance.now();
      const { hash } = await chain.relay("sealByGuardian", [q, chain.toArgs(p.a), chain.toArgs(guardian.assertion)]);
      setSeconds(((performance.now() - t0) / 1000).toFixed(1));
      setDone(hash);
      setTimeout(stampFeedback, 900);
    });

  if (done)
    return (
      <Screen s={s}>
        <div className="center celebrate">
          <Garland phase={phase} left={TILE.family} right={cat.tile} />
          <h1>{s.sealed}</h1>
          <Receipt s={s} hash={done} seconds={seconds} />
          <button className="secondary" onClick={() => go("/")}>{s.home}</button>
        </div>
      </Screen>
    );
  return (
    <Screen s={s} title={s.witnessTitle}>
      <div className="sheet center">
        <WindowTile phase={phase} tile={cat.tile} />
        <p className="instruction">{s.witnessBody(shortId(p.h), familyName(p.r, s), cat[lang], formatMinutes(p.m, s))}</p>
        <ArrivalLine s={s} lang={lang} arrival={arrival} claimed={p.m} />
        {p.d && <p className="muted small">{s.witnessPays}</p>}
        <button className="primary" disabled={busy} onClick={confirm}>{busy ? s.sealing : s.signWitness}</button>
        {error && <ErrorNote error={error === "wrong-person" ? s.notGuardian : friendlyError(error, s)} s={s} />}
      </div>
    </Screen>
  );
}

function Family({ s, phase }: Ctx & { me: Me }) {
  const [family] = useState(loadFamily);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const visit = useFamilyVisits(s);
  useEffect(() => {
    family.forEach((f) => chain.getMember(f.id).then((m) => setBalances((b) => ({ ...b, [f.id]: m.balance }))).catch(() => undefined));
  }, [family]);
  useSpeakOnShow(`${s.family}。${s.familyHint}`);
  return (
    <Screen s={s} title={s.family} onBack={() => go("/")}>
      <p className="muted">{s.familyHint}</p>
      <VisitNotice s={s} text={visit} />
      <ul className="family-list">
        {family.map((f) => (
          <li key={f.id}>
            <span className="family-art"><WindowTile phase={phase} tile={TILE.family} /></span>
            <span className="family-name">
              <strong>{f.name}</strong>
              <small>{s.available} {formatMinutes(balances[f.id] ?? 0, s)}</small>
            </span>
            <span className="family-actions">
              <button className="link" onClick={() => go(`/gift/${f.id}`)}>{s.giftTo}</button>
              <button className="link" onClick={() => go(`/card/${f.id}`)}>{s.familyCard}</button>
            </span>
          </li>
        ))}
      </ul>
      <button className="primary" onClick={() => go("/family/new")}>{s.addFamily}</button>
    </Screen>
  );
}

function FamilyNew({ s, phase, me }: Ctx & { me: Me }) {
  const [name, setName] = useState("");
  const { busy, error, run } = useAsync();
  const create = () =>
    run(async () => {
      const id = await chain.dependentDigest(me.id);
      const { assertion } = await signAs(id, me.id);
      await chain.relay("registerDependent", [me.id, chain.toArgs(assertion)]);
      addFamily({ id, name: name.trim() || shortId(id), secret: randomHex() });
      stampFeedback();
      go(`/card/${id}`);
    });
  return (
    <Screen s={s} title={s.addFamily} onBack={() => go("/family")}>
      <div className="gift-head"><WindowTile phase={phase} tile={TILE.family} lit={false} /></div>
      <label className="field">
        <span>{s.familyName}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={s.familyNamePlaceholder} maxLength={20} />
        <small>{s.nameHint}</small>
      </label>
      <button className="primary" disabled={busy} onClick={create}>{busy ? s.creating : s.familyCreate}</button>
      {error && <ErrorNote error={error} s={s} />}
    </Screen>
  );
}

function FamilyCard({ s, phase, id }: Ctx & { id: Hex }) {
  const name = familyName(id, s);
  const secret = loadFamily().find((f) => f.id === id)?.secret;
  useSpeakOnShow(`${s.familyCard}。${s.familyCardHint}`);
  return (
    <Screen s={s} title={s.familyCard} onBack={() => go("/family")}>
      <div className="sheet center family-card">
        <h2>{name}</h2>
        <div className="qr-frame">
          <QR value={appUrl(secret ? `/u/${id}/${secret}` : `/u/${id}`)} label={name} />
          <span className="qr-badge"><WindowTile phase={phase} tile={TILE.family} /></span>
        </div>
        <p className="muted">{s.familyCardHint}</p>
        <button className="secondary no-print" onClick={() => window.print()}>{s.print}</button>
      </div>
    </Screen>
  );
}

// ---------- shell ----------

export default function App() {
  const route = useHashRoute();
  const [lang, setLang] = useState<Lang>(() => (readPref("timebank.lang", detectLang()) as Lang));
  const [big, setBig] = useState(() => readPref("timebank.big", "0") === "1");
  const [voice, setVoice] = useState(() => readPref("timebank.voice", "0") === "1");
  const params = new URLSearchParams(window.location.search);
  const [themePref, setThemePref] = useState<ThemePref>(() => readPref("timebank.theme", "time") as ThemePref);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Asked again on every visit: dismissing it doesn't make Face ID work in there.
  const [inApp, setInApp] = useState(detectInApp);
  const phase = usePhase(themePref, (params.get("phase") as Phase | null) ?? null);
  const [me, setMeState] = useState<Me | null>(loadMe);
  const s = strings[lang];

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = lang === "zh" ? "时间银行 · timebank" : "timebank";
  }, [lang]);
  useEffect(() => configureVoice(voice, lang), [voice, lang]);
  useEffect(() => {
    document.documentElement.dataset.big = big ? "1" : "0";
    document.documentElement.dataset.phase = phase;
  }, [big, phase]);

  const setMe = (m: Me) => {
    saveMe(m);
    setMeState(m);
  };
  const [voiceHint, setVoiceHint] = useState(false);
  const showVoiceHint = () => {
    setVoiceHint(true);
    setTimeout(() => setVoiceHint(false), 7000);
  };
  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    writePref("timebank.voice", next ? "1" : "0");
    configureVoice(next, lang);
    if (next) {
      speakFromTap(s.voiceOn);
      showVoiceHint();
    }
  };
  const toggleElder = () => {
    const next = !big;
    setBig(next);
    writePref("timebank.big", next ? "1" : "0");
    // Simple mode reads every screen aloud; the tap itself unlocks speech on iOS.
    if (next && voiceSupported()) {
      setVoice(true);
      writePref("timebank.voice", "1");
      configureVoice(true, lang);
      // Short, because the simple home screen reads its own guidance right after.
      speakFromTap(s.elderMode);
      showVoiceHint();
    }
  };
  const ctx: Ctx = { s, lang, phase, me, setMe, elder: big, toggleElder };

  const [page, arg, arg2] = route;
  let body;
  // Links that work without a local identity: the helper may be on a new phone.
  if (page === "confirm" && arg) body = <Confirm {...ctx} raw={arg} beatRaw={arg2} />;
  else if (page === "checkin" && arg) body = <CheckIn {...ctx} challenge={arg as Hex} />;
  else if (page === "door") body = <DoorCheck {...ctx} />;
  else if (page === "demo" && arg) body = <DemoScene {...ctx} which={arg} />;
  else if (!me) body = <Welcome {...ctx} />;
  else if (page === "code") body = <MyCode {...ctx} me={me} />;
  else if (page === "scan") body = <ScanHelp {...ctx} />;
  else if (page === "u" && arg) body = <Person {...ctx} id={arg as Hex} secret={arg2 as Hex | undefined} />;
  else if (page === "thank" && arg) body = <Thank {...ctx} me={me} helper={arg as Hex} />;
  else if (page === "gift" && arg) body = <Gift {...ctx} me={me} to={arg as Hex} />;
  else if (page === "donate") body = <Donate {...ctx} me={me} />;
  else if (page === "helped" && arg) body = <HelpedFor {...ctx} me={me} receiver={arg as Hex} />;
  else if (page === "witness" && arg) body = <Witness {...ctx} me={me} raw={arg} />;
  else if (page === "family" && arg === "new") body = <FamilyNew {...ctx} me={me} />;
  else if (page === "family") body = <Family {...ctx} me={me} />;
  else if (page === "card" && arg) body = <FamilyCard {...ctx} id={arg as Hex} />;
  else if (big) body = <ElderHome {...ctx} me={me} />;
  else body = <Home {...ctx} me={me} />;

  return (
    <>
      <header className={page || me ? "topbar" : "topbar bare"}>
        <button className="brand-mini" onClick={() => go("/")} aria-label={s.home}>
          <Wordmark size={22} />
        </button>
        <div className="prefs">
          <button className="chip" onClick={() => { const next = lang === "zh" ? "en" : "zh"; setLang(next); writePref("timebank.lang", next); }}>
            {s.language}
          </button>
          <button className="chip settings-btn" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(true)}>
            <span aria-hidden>{voice ? "🔊" : "Aa"}</span> {s.settings}
          </button>
        </div>
      </header>
      {inApp && (
        <OpenInBrowser
          s={s}
          lang={lang}
          app={inApp}
          onClose={() => setInApp(null)}
        />
      )}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div className="overlay" onClick={() => setSettingsOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section
              className="settings-sheet"
              role="dialog"
              aria-label={s.settings}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={spring}
            >
              <h2>{s.settings}</h2>
              {voiceSupported() && (
                <button className="setting-row" role="switch" aria-checked={voice} onClick={toggleVoice}>
                  <span>
                    {s.voice}
                    <small>{s.voiceDesc}</small>
                  </span>
                  <span className="switch" aria-hidden />
                </button>
              )}
              <button className="setting-row" role="switch" aria-checked={big} onClick={toggleElder}>
                <span>
                  {s.elderMode}
                  <small>{s.elderDesc}</small>
                </span>
                <span className="switch" aria-hidden />
              </button>
              <p className="setting-label">{s.theme}</p>
              <div className="theme-options" role="radiogroup" aria-label={s.theme}>
                {THEME_PREFS.map((t) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={t === themePref}
                    className={t === themePref ? "theme-option on" : "theme-option"}
                    onClick={() => {
                      setThemePref(t);
                      writePref("timebank.theme", t);
                      speak(s.themeOptions[t]);
                    }}
                  >
                    {s.themeOptions[t]}
                  </button>
                ))}
              </div>
              <button className="secondary" onClick={() => setSettingsOpen(false)}>{s.done}</button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait">
          <motion.div
            key={route.join("/") || "home"}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </MotionConfig>
      <AnimatePresence>
        {voiceHint && (
          <motion.p className="voice-hint" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => setVoiceHint(false)}>
            {s.voiceHint}
          </motion.p>
        )}
      </AnimatePresence>
      <div id="live-region" className="sr-only" aria-live="polite" />
    </>
  );
}
