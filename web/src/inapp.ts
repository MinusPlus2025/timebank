// Chat and social apps open links in their own built-in browser. Passkeys (Face ID) don't work
// there, so we detect the common ones and ask the person to reopen the page in their phone's browser.

export type InApp = { zh: string; en: string; ios: boolean };

const APPS: { test: RegExp; zh: string; en: string }[] = [
  { test: /MicroMessenger/i, zh: "微信", en: "WeChat" },
  { test: /AlipayClient/i, zh: "支付宝", en: "Alipay" },
  { test: /DingTalk/i, zh: "钉钉", en: "DingTalk" },
  { test: /Lark|Feishu/i, zh: "飞书", en: "Lark" },
  { test: /Weibo/i, zh: "微博", en: "Weibo" },
  { test: /aweme|BytedanceWebview|TikTok|musical_ly/i, zh: "抖音", en: "TikTok" },
  { test: /\bQQ\//, zh: "QQ", en: "QQ" },
  { test: /XiaoHongShu|discover\//i, zh: "小红书", en: "RedNote" },
  { test: /FBAN|FBAV|FB_IAB/, zh: "Facebook", en: "Facebook" },
  { test: /Instagram/, zh: "Instagram", en: "Instagram" },
  { test: /\bLine\//, zh: "LINE", en: "LINE" },
];

export function detectInApp(ua = navigator.userAgent): InApp | null {
  const app = APPS.find((a) => a.test.test(ua));
  return app ? { zh: app.zh, en: app.en, ios: /iPhone|iPad|iPod/.test(ua) } : null;
}

/** The app route inside a scanned QR, if it is one of ours, else null. Any host is accepted
 * (vercel.app, a custom domain, a mirror), since the route is all the page acts on. */
const ROUTES = /^\/(u|thank|confirm|checkin|witness|card|door|gift|helped)(\/|$)/;
export function ourRoute(text: string): string | null {
  try {
    const route = new URL(text).hash.slice(1);
    return ROUTES.test(route) ? route : null;
  } catch {
    return null;
  }
}
