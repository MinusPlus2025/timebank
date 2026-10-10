import { useCallback, useEffect, useMemo, useState } from "react";
import { hexToString, toHex, type Hex } from "viem";
import { CATEGORIES, detectLang, formatMinutes, strings, type Lang, type Strings } from "./i18n";
import { idOf, loadMe, saveMe, shortId, encodeSealPayload, decodeSealPayload, type Me, type SealPayload } from "./identity";
import { createPasskey, passkeysSupported, signWithPasskey } from "./passkey";
import * as chain from "./chain";
import { SealArt } from "./SealArt";
import { stampFeedback } from "./feedback";
import { CopyLink, ErrorNote, QR, Screen, errorMessage } from "./ui";

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

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
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

type Ctx = { s: Strings; lang: Lang; me: Me | null; setMe: (m: Me) => void };

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
  return { busy, error, run, setError };
}

// ---------- screens ----------

function Welcome({ s, lang, setMe }: Ctx) {
  const [name, setName] = useState("");
  const { busy, error, run } = useAsync();
  const supported = passkeysSupported();

  const create = () =>
    run(async () => {
      const { x, y } = await createPasskey(name.trim() || "TimeBank");
      await chain.relay("register", [x, y]);
      setMe({ id: idOf(x, y), x, y, name: name.trim() });
    });

  const signIn = () =>
    run(async () => {
      const r = await signAs(toHex(crypto.getRandomValues(new Uint8Array(32))));
      setMe({ id: r.id, x: r.x, y: r.y, name: "" });
    });

  return (
    <Screen s={s}>
      <div className="hero">
        <SealArt seed={"0x7f3a9c21d04e5b88a1c3e6f2d9b4a7c05e8f1d2a3b4c5d6e7f8091a2b3c4d5e6"} category={1} lang={lang} size={150} />
        <h1 className="brand">{s.appName}</h1>
        <p className="tagline">{s.tagline}</p>
        <p className="lede">{s.subTagline}</p>
      </div>
      {!supported ? (
        <p className="note error">{s.noPasskey}</p>
      ) : (
        <div className="card">
          <label className="field">
            <span>{s.namePrompt}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={s.namePlaceholder} maxLength={20} />
            <small>{s.nameHint}</small>
          </label>
          <button className="primary" disabled={busy} onClick={create}>
            {busy ? s.creating : `🙂 ${s.createPasskey}`}
          </button>
          <button className="link" disabled={busy} onClick={signIn}>
            {lang === "zh" ? "已经有印？刷脸找回" : "Already have a seal? Sign in"}
          </button>
          {error && <ErrorNote error={error} s={s} />}
        </div>
      )}
      <p className="ethics">{s.ethics}</p>
    </Screen>
  );
}

function Home({ s, lang, me }: Ctx & { me: Me }) {
  const [member, setMember] = useState<chain.Member | null>(null);
  const [seals, setSeals] = useState<chain.SealRecord[]>([]);
  useEffect(() => {
    chain.getMember(me.id).then(setMember).catch(() => undefined);
    chain.getSealsOf(me.id).then((list) => setSeals(list.reverse())).catch(() => undefined);
  }, [me.id]);

  return (
    <Screen s={s}>
      <section className="balance card">
        <p className="muted">{me.name ? `${me.name} · ` : ""}{s.myTime}</p>
        <p className="big-number">{member ? formatMinutes(member.balance, s) : "…"}</p>
      </section>
      <nav className="actions">
        <button className="primary" onClick={() => go("/code")}>▦ {s.myCode}</button>
        <button className="secondary" onClick={() => go("/door")}>🚪 {s.door}</button>
        <button className="secondary" onClick={() => go("/donate")} disabled={!member?.balance}>🕊 {s.donate}</button>
      </nav>
      <section>
        <h2>{s.myAlbum}</h2>
        {seals.length === 0 ? (
          <p className="muted">{s.albumEmpty}</p>
        ) : (
          <ul className="album">
            {seals.map((seal) => {
              const cat = CATEGORIES.find((c) => c.id === seal.category);
              const helped = seal.helper === me.id;
              return (
                <li key={seal.id}>
                  <SealArt seed={seal.seed} category={seal.category} lang={lang} size={96} />
                  <span className="album-label">
                    {cat?.icon} {cat?.[lang]} · {formatMinutes(seal.minutes, s)}
                  </span>
                  <span className="muted small">
                    {helped ? s.iHelped : s.helpedMe} · {new Date(seal.timestamp * 1000).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <a className="link small footer-link" href={`${chain.EXPLORER}/address/${chain.TIMEBANK}`} target="_blank" rel="noreferrer">
        {s.onChain} ↗
      </a>
    </Screen>
  );
}

function MyCode({ s, me }: Ctx & { me: Me }) {
  const url = appUrl(`/u/${me.id}`);
  return (
    <Screen s={s} title={s.myCode} onBack={() => go("/")}>
      <div className="card center">
        <QR value={url} label={s.myCode} />
        <p className="muted">{s.myCodeHint}</p>
        <CopyLink url={url} s={s} />
      </div>
    </Screen>
  );
}

function Person({ s, id }: Ctx & { id: Hex }) {
  return (
    <Screen s={s} title={`${s.someone} ${shortId(id)}`} onBack={() => go("/")}>
      <nav className="actions">
        <button className="primary" onClick={() => go(`/thank/${id}`)}>🙏 {s.thank}</button>
        <button className="secondary" onClick={() => go(`/gift/${id}`)}>🎁 {s.giftTo}</button>
      </nav>
    </Screen>
  );
}

function Choice<T extends number>({ options, value, onChange, render }: { options: readonly T[]; value: T; onChange: (v: T) => void; render: (v: T) => string }) {
  return (
    <div className="choices" role="radiogroup">
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={o === value} className={o === value ? "choice on" : "choice"} onClick={() => onChange(o)}>
          {render(o)}
        </button>
      ))}
    </div>
  );
}

function Thank({ s, lang, me, helper }: Ctx & { me: Me; helper: Hex }) {
  const [category, setCategory] = useState<number>(1);
  const [minutes, setMinutes] = useState<number>(60);
  const [redeem, setRedeem] = useState(false);
  const [balance, setBalance] = useState(0);
  const [payload, setPayload] = useState("");
  const { busy, error, run } = useAsync();

  useEffect(() => {
    chain.getMember(me.id).then((m) => setBalance(m.balance)).catch(() => undefined);
  }, [me.id]);

  const sign = () =>
    run(async () => {
      if (helper === me.id) throw new Error(lang === "zh" ? "不能感谢自己" : "You can't thank yourself");
      const digest = await chain.sealDigest(helper, me.id, minutes, category, redeem);
      const { assertion } = await signAs(digest, me.id);
      const p: SealPayload = { h: helper, r: me.id, m: minutes, c: category, d: redeem, a: assertion };
      setPayload(encodeSealPayload(p));
    });

  if (payload) {
    const url = appUrl(`/confirm/${payload}`);
    return (
      <Screen s={s} title={s.thankTitle} onBack={() => setPayload("")}>
        <div className="card center">
          <QR value={url} label={s.showToHelper} />
          <p className="instruction">{s.showToHelper}</p>
          <CopyLink url={url} s={s} />
        </div>
      </Screen>
    );
  }

  return (
    <Screen s={s} title={s.thankTitle} onBack={() => go("/")}>
      <h2>{s.whatHelp}</h2>
      <div className="categories">
        {CATEGORIES.map((c) => (
          <button key={c.id} className={c.id === category ? "category on" : "category"} aria-pressed={c.id === category} onClick={() => setCategory(c.id)}>
            <span className="icon" aria-hidden>{c.icon}</span>
            {c[lang]}
          </button>
        ))}
      </div>
      <h2>{s.howLong}</h2>
      <Choice options={[30, 60, 90, 120] as const} value={minutes as 30} onChange={setMinutes} render={(m) => formatMinutes(m, s)} />
      <label className="toggle">
        <input type="checkbox" checked={redeem} disabled={balance < minutes} onChange={(e) => setRedeem(e.target.checked)} />
        <span>
          {s.payWithMine} {balance < minutes && <em>({s.notEnough})</em>}
          <small>{s.payWithMineHint}</small>
        </span>
      </label>
      <button className="primary" disabled={busy} onClick={sign}>🙂 {s.signThanks}</button>
      {error && <ErrorNote error={error === "wrong-person" ? s.wrongPerson : error} s={s} />}
    </Screen>
  );
}

function Confirm({ s, lang, me, setMe, raw }: Ctx & { raw: string }) {
  const p = useMemo(() => {
    try {
      return decodeSealPayload(raw);
    } catch {
      return null;
    }
  }, [raw]);
  const [done, setDone] = useState<{ seal: chain.SealRecord; hash: Hex } | null>(null);
  const { busy, error, run } = useAsync();
  if (!p) return <Screen s={s}><ErrorNote error="bad link" s={s} /></Screen>;
  const cat = CATEGORIES.find((c) => c.id === p.c) ?? CATEGORIES[0];

  const seal = () =>
    run(async () => {
      const digest = await chain.sealDigest(p.h, p.r, p.m, p.c, p.d);
      const helper = await signAs(digest, p.h);
      if (!me) setMe({ id: helper.id, x: helper.x, y: helper.y, name: "" });
      const { hash } = await chain.relay("seal", [p.h, p.r, p.m, p.c, p.d, chain.toArgs(helper.assertion), chain.toArgs(p.a)]);
      const ids = await chain.getSealsOf(p.h);
      setDone({ seal: ids[ids.length - 1], hash });
      stampFeedback();
    });

  if (done) {
    return (
      <Screen s={s}>
        <div className="center sealed">
          <SealArt seed={done.seal.seed} category={done.seal.category} lang={lang} size={220} animate />
          <h1>{s.sealed}</h1>
          <p>{s.sealedBody}</p>
          <a className="link" href={`${chain.EXPLORER}/tx/${done.hash}`} target="_blank" rel="noreferrer">{s.onChain} ↗</a>
          <button className="secondary" onClick={() => go("/")}>{s.home}</button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen s={s} title={s.confirmTitle}>
      <div className="card center">
        <span className="icon-xl" aria-hidden>{cat.icon}</span>
        <p className="instruction">{s.confirmBody(formatMinutes(p.m, s), cat[lang])}</p>
        <p className="muted small">{s.someone} {shortId(p.r)}</p>
        <button className="primary" disabled={busy} onClick={seal}>{busy ? s.sealing : `🙂 ${s.signSeal}`}</button>
        {error && <ErrorNote error={error === "wrong-person" ? s.wrongPerson : error} s={s} />}
      </div>
    </Screen>
  );
}

function Gift({ s, me, to }: Ctx & { me: Me; to: Hex }) {
  const [balance, setBalance] = useState(0);
  const [minutes, setMinutes] = useState<number>(60);
  const [done, setDone] = useState("");
  const { busy, error, run } = useAsync();
  useEffect(() => {
    chain.getMember(me.id).then((m) => setBalance(m.balance)).catch(() => undefined);
  }, [me.id]);

  const send = () =>
    run(async () => {
      const digest = await chain.giftDigest(me.id, to, minutes);
      const { assertion } = await signAs(digest, me.id);
      const { hash } = await chain.relay("gift", [me.id, to, minutes, chain.toArgs(assertion)]);
      setDone(hash);
      stampFeedback();
    });

  if (done) {
    return (
      <Screen s={s}>
        <div className="center sealed">
          <span className="icon-xl" aria-hidden>🎁</span>
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
      <p className="muted">{s.giftHint}</p>
      <p>{s.myTime}: <strong>{formatMinutes(balance, s)}</strong></p>
      <h2>{s.giftAmount}</h2>
      <Choice options={[30, 60, 120, 300] as const} value={minutes as 30} onChange={setMinutes} render={(m) => formatMinutes(m, s)} />
      <button className="primary" disabled={busy || balance < minutes} onClick={send}>🎁 {balance < minutes ? s.notEnough : s.signGift}</button>
      {error && <ErrorNote error={error} s={s} />}
    </Screen>
  );
}

function Donate({ s, me }: Ctx & { me: Me }) {
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);
  const [minutes, setMinutes] = useState<number>(30);
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
        <p className="note ok">🕊 {s.donated}</p>
      ) : (
        <>
          <Choice options={[30, 60, 120] as const} value={minutes as 30} onChange={setMinutes} render={(m) => formatMinutes(m, s)} />
          <button className="primary" disabled={busy || balance < minutes} onClick={give}>🕊 {balance < minutes ? s.notEnough : s.donate}</button>
        </>
      )}
      {error && <ErrorNote error={error} s={s} />}
    </Screen>
  );
}

function Door({ s }: Ctx) {
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
  return (
    <Screen s={s} title={s.doorTitle} onBack={() => go("/")}>
      {result ? (
        <div className={community ? "card center verified" : "card center warn"} role="status">
          <span className="icon-xl" aria-hidden>{community ? "✅" : "⚠️"}</span>
          <h2>{s.verified} · {s.someone} {shortId(result.id)}</h2>
          <p>{community ? s.verifiedCommunity(community) : s.notCertified}</p>
        </div>
      ) : (
        <div className="card center">
          <QR value={appUrl(`/checkin/${challenge}`)} label={s.doorTitle} />
          <p className="instruction">{s.doorHint}</p>
          <p className="muted pulse">{s.waiting}</p>
        </div>
      )}
    </Screen>
  );
}

function CheckIn({ s, me, setMe, challenge }: Ctx & { challenge: Hex }) {
  const [done, setDone] = useState(false);
  const { busy, error, run } = useAsync();
  const prove = () =>
    run(async () => {
      const r = await signAs(challenge, me?.id);
      if (!me) setMe({ id: r.id, x: r.x, y: r.y, name: "" });
      await chain.relay("checkIn", [r.id, challenge, chain.toArgs(r.assertion)]);
      setDone(true);
    });
  return (
    <Screen s={s} title={s.checkInTitle}>
      <div className="card center">
        <p>{s.checkInBody}</p>
        {done ? <p className="note ok">✅ {s.checkedIn}</p> : <button className="primary" disabled={busy} onClick={prove}>🙂 {s.signCheckIn}</button>}
        {error && <ErrorNote error={error === "wrong-person" ? s.needRegister : error} s={s} />}
      </div>
    </Screen>
  );
}

// ---------- shell ----------

export default function App() {
  const route = useHashRoute();
  const [lang, setLang] = useState<Lang>(() => readPref<Lang>("timebank.lang", detectLang()));
  const [big, setBig] = useState(() => readPref<string>("timebank.big", "0") === "1");
  const [me, setMeState] = useState<Me | null>(loadMe);
  const s = strings[lang];

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = `${s.appName} · ${s.tagline}`;
  }, [lang, s]);
  useEffect(() => {
    document.documentElement.dataset.big = big ? "1" : "0";
  }, [big]);

  const setMe = (m: Me) => {
    saveMe(m);
    setMeState(m);
  };
  const ctx: Ctx = { s, lang, me, setMe };

  const [page, arg] = route;
  let body;
  // Links that work without a local identity: the helper may be on a new phone.
  if (page === "confirm" && arg) body = <Confirm {...ctx} raw={arg} />;
  else if (page === "checkin" && arg) body = <CheckIn {...ctx} challenge={arg as Hex} />;
  else if (page === "door") body = <Door {...ctx} />;
  else if (!me) body = <Welcome {...ctx} />;
  else if (page === "code") body = <MyCode {...ctx} me={me} />;
  else if (page === "u" && arg) body = <Person {...ctx} id={arg as Hex} />;
  else if (page === "thank" && arg) body = <Thank {...ctx} me={me} helper={arg as Hex} />;
  else if (page === "gift" && arg) body = <Gift {...ctx} me={me} to={arg as Hex} />;
  else if (page === "donate") body = <Donate {...ctx} me={me} />;
  else body = <Home {...ctx} me={me} />;

  return (
    <>
      <header className="topbar">
        <button className="brand-mini" onClick={() => go("/")} aria-label={s.home}>
          <span className="seal-dot" aria-hidden>印</span> {s.appName}
        </button>
        <div className="prefs">
          <button className="chip" aria-pressed={big} onClick={() => { setBig(!big); writePref("timebank.big", big ? "0" : "1"); }}>
            A+ {s.bigText}
          </button>
          <button className="chip" onClick={() => { const next = lang === "zh" ? "en" : "zh"; setLang(next); writePref("timebank.lang", next); }}>
            {s.language}
          </button>
        </div>
      </header>
      {body}
    </>
  );
}
