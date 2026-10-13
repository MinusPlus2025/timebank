// End-to-end walkthrough with virtual passkeys (Chrome's WebAuthn emulator), one browser
// context per person. Requires a local chain + dev server; see README "Local end-to-end test".
// Usage: node e2e/flow.mjs [baseUrl] [screenshotDir]
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.argv[2] || "http://localhost:5173/";
const SHOTS = process.argv[3] || "";
const VIEWPORT = { width: 390, height: 844 };

// E2E_PROXY: route the browser through an outbound proxy (e.g. to reach a public testnet RPC from CI).
const PROXY = process.env.E2E_PROXY;
// The helper's in-app camera reads this file: we paint the receiver's live heartbeat code into it.
const FAKE_CAM = join(tmpdir(), "timebank-heartbeat.y4m");
const CAMERA_ARGS = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${FAKE_CAM}`];
// Only https goes through it, so the local dev server stays direct.
const browser = await chromium.launch({ args: [...CAMERA_ARGS, ...(PROXY ? [`--proxy-server=https=${new URL(PROXY).host}`] : [])] });

async function person(name) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "zh-CN", deviceScaleFactor: 2, ignoreHTTPSErrors: !!PROXY });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error(`[${name}] page error:`, e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { name, page };
}

async function shot(p, file) {
  if (SHOTS) await p.page.screenshot({ path: `${SHOTS}/${file}.png`, fullPage: true });
}

async function register(p) {
  await p.page.goto(BASE);
  await p.page.waitForSelector(".splash");
  if (p.name === "小王") {
    await p.page.waitForTimeout(2600);
    await shot(p, "00-splash");
  }
  await p.page.click(".splash");
  await p.page.waitForSelector(".onboarding");
  if (p.name === "小王") {
    await p.page.waitForTimeout(900);
    await shot(p, "00-onboarding-1");
    await p.page.click(".onb-actions .primary");
    await p.page.waitForTimeout(900);
    await shot(p, "00-onboarding-2");
    await p.page.click(".onb-actions .primary");
    await p.page.waitForTimeout(900);
    await shot(p, "00-onboarding-3");
    await p.page.click(".onb-actions .primary");
  } else {
    await p.page.click(".onb-actions .link");
  }
  await p.page.waitForSelector("input");
  await p.page.fill("input", p.name);
  if (p.name === "小王") {
    await p.page.waitForTimeout(1800);
    await shot(p, "01-welcome");
  }
  await p.page.click("button.primary");
  await p.page.waitForSelector(".headline", { timeout: 45000 }).catch(async (e) => {
    console.error(`[${p.name}] register failed:`, await p.page.textContent("main"));
    throw e;
  });
  const me = JSON.parse(await p.page.evaluate(() => localStorage.getItem("timebank.me")));
  console.log(`registered ${p.name} ${me.id}`);
  return me.id;
}

const balance = async (p) => {
  await p.page.goto(BASE + "#/");
  await p.page.reload();
  await p.page.waitForFunction(() => !document.querySelector(".sky-meta strong")?.textContent?.includes("…"));
  return p.page.textContent(".sky-meta strong");
};

async function thankAndSeal(receiver, helper, helperId, { category, minutesLabel, pay }) {
  await receiver.page.goto(`${BASE}#/thank/${helperId}`);
  await receiver.page.getByRole("button", { name: category }).click();
  await receiver.page.getByRole("radio", { name: minutesLabel, exact: true }).click();
  if (pay) await receiver.page.check("input[type=checkbox]");
  await receiver.page.click("button.primary");
  const url = await receiver.page.getAttribute("img.qr", "data-url", { timeout: 30000 });
  await shot(receiver, "03-thank-qr");
  await helper.page.goto(url);
  await shot(helper, "04-confirm");
  // If Face ID takes long enough for the code in the link to age out, the app asks for one live scan.
  await pointCameraAt(receiver);
  await helper.page.click("button.primary");
  await helper.page.waitForSelector(".celebrate", { timeout: 30000 });
  await helper.page.waitForTimeout(2200);
  await shot(helper, "05-sealed");
  console.log("receipt:", await helper.page.textContent(".receipt-live"));
}

// Writes the receiver's current heartbeat QR into the fake camera as a one-frame Y4M video.
async function pointCameraAt(receiver) {
  const SIZE = 640;
  const gray = await receiver.page.evaluate((size) => {
    const img = document.querySelector("img.qr");
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 60, 60, size - 120, size - 120);
    const d = ctx.getImageData(0, 0, size, size).data;
    const y = new Array(size * size);
    for (let i = 0; i < size * size; i++) y[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
    return y;
  }, SIZE);
  const header = Buffer.from(`YUV4MPEG2 W${SIZE} H${SIZE} F10:1 Ip A1:1 C420jpeg\nFRAME\n`);
  const chroma = Buffer.alloc((SIZE / 2) * (SIZE / 2) * 2, 128);
  writeFileSync(FAKE_CAM, Buffer.concat([header, Buffer.from(gray), chroma]));
}

const rpc = (method, params = []) =>
  fetch(process.env.E2E_RPC || "http://127.0.0.1:8545", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }).then((r) => r.json());

const wang = await person("小王"); // helper in Shanghai
const li = await person("李阿姨"); // neighbour who was helped
const mom = await person("妈妈"); // daughter's mother in another city
const zhao = await person("小赵"); // volunteer near mom

const wangId = await register(wang);
const liId = await register(li);
const momId = await register(mom);
const zhaoId = await register(zhao);

// 1. 李阿姨 thanks 小王 for fixing a pipe; both seal with their passkeys.
await thankAndSeal(li, wang, wangId, { category: "修理", minutesLabel: "2 小时", pay: false });
console.log("小王 balance after seal:", await balance(wang));

// 1b. A forwarded photo of the heartbeat code is too old to seal; scanning the live screen works.
await li.page.goto(`${BASE}#/thank/${wangId}`);
await li.page.reload(); // same route as before: start a fresh thank-you screen
await li.page.getByRole("button", { name: "陪伴" }).click();
await li.page.getByRole("radio", { name: "30 分钟", exact: true }).click();
await li.page.click("button.primary");
const photo = await li.page.getAttribute("img.qr", "data-url", { timeout: 30000 });
await rpc("hardhat_mine", ["0x28"]); // 40 blocks later, as if the photo went through a chat app
const before = await balance(wang);
await wang.page.goto(photo);
await li.page.waitForTimeout(2500); // let the receiver's screen redraw after the 40 mined blocks
await pointCameraAt(li);
await wang.page.click("button.primary");
await wang.page.waitForSelector(".live-scan", { timeout: 30000 });
console.log("stale photo → asked to scan the live screen");
await shot(wang, "05b-scan-again");
await wang.page.waitForSelector(".celebrate", { timeout: 30000 });
console.log("live rescan sealed:", await wang.page.textContent(".receipt-live"));
console.log("小王 balance:", before, "→", await balance(wang));

// 2. 小王 gives 1 hour to 妈妈 far away.
await wang.page.goto(`${BASE}#/gift/${momId}`);
await wang.page.getByRole("radio", { name: "1 小时", exact: true }).click();
await shot(wang, "06-gift");
await wang.page.click("button.primary");
await wang.page.waitForSelector(".quote", { timeout: 30000 });
await wang.page.waitForTimeout(2200);
await shot(wang, "07-gifted");
console.log("妈妈 balance after gift:", await balance(mom));

// 3. Local volunteer 小赵 takes 妈妈 to the clinic; 妈妈 pays with the gifted hour.
await thankAndSeal(mom, zhao, zhaoId, { category: "陪诊", minutesLabel: "1 小时", pay: true });
await wang.page.goto(BASE + "#/");
console.log("妈妈 balance after redeem:", await balance(mom));
console.log("小赵 balance:", await balance(zhao));
await wang.page.goto(BASE + "#/");
await wang.page.reload();
await wang.page.waitForSelector(".facade-grid .tile-button");
await wang.page.waitForTimeout(1500);
await shot(wang, "02-home");
await wang.page.click(".facade-grid > div:nth-child(2) .tile-button");
await wang.page.waitForSelector(".window-detail");
await wang.page.waitForTimeout(700);
await shot(wang, "02b-window-open");
await wang.page.click(".window-detail .secondary");

// 4. Door check: the steward certifies 小赵, then 妈妈 checks him at the door.
execSync(`npx hardhat run scripts/certify.js --network ${process.env.CERTIFY_NETWORK || "localhost"}`, {
  cwd: new URL("../../contracts", import.meta.url).pathname,
  env: { ...process.env, MEMBER_ID: zhaoId, COMMUNITY: "阳光社区" },
  stdio: "inherit",
});
await mom.page.goto(`${BASE}#/door`);
const checkinUrl = await mom.page.getAttribute("img.qr", "data-url", { timeout: 30000 });
await shot(mom, "08-door");
await zhao.page.goto(checkinUrl);
await zhao.page.click("button.primary");
await zhao.page.waitForSelector(".note.ok", { timeout: 30000 });
await mom.page.waitForSelector(".verified", { timeout: 30000 });
await mom.page.waitForTimeout(1500);
await shot(mom, "09-door-verified");
console.log("door:", (await mom.page.textContent(".verified")).trim());

// 5. Guardian: 小王 opens an account for 爸爸, who has no phone. 小赵 visits and helps;
//    小王 is told who is at the door and confirms the help from another city.
await wang.page.goto(`${BASE}#/family/new`);
await wang.page.fill("input", "爸爸");
await wang.page.click("button.primary");
await wang.page.waitForSelector(".family-card img.qr", { timeout: 30000 });
await shot(wang, "12-family-card");
const dadUrl = await wang.page.getAttribute(".family-card img.qr", "data-url");
await wang.page.goto(`${BASE}#/family`);
await wang.page.waitForSelector(".family-list li");
await zhao.page.goto(dadUrl);
await zhao.page.getByRole("button", { name: "我到门口了" }).click();
await zhao.page.waitForSelector(".note.ok", { timeout: 30000 });
await wang.page.waitForSelector(".visit-notice", { timeout: 30000 });
await wang.page.waitForTimeout(600);
await shot(wang, "13-family-visit");
console.log("visit:", (await wang.page.textContent(".visit-notice p")).trim());
await zhao.page.getByRole("button", { name: "我帮了 TA" }).click();
await zhao.page.getByRole("button", { name: "陪伴" }).click();
await zhao.page.getByRole("radio", { name: "1 小时", exact: true }).click();
await zhao.page.waitForSelector(".arrival", { timeout: 15000 });
await shot(zhao, "13b-helped-arrival");
console.log("arrival:", (await zhao.page.textContent(".arrival")).trim());
await zhao.page.click("button.primary");
const witnessUrl = await zhao.page.getAttribute("img.qr", "data-url", { timeout: 30000 });
await wang.page.goto(witnessUrl);
const confirmBtn = wang.page.getByRole("button", { name: "属实，刷脸确认" });
await confirmBtn.waitFor();
await wang.page.waitForSelector(".arrival", { timeout: 15000 });
await wang.page.waitForTimeout(500);
await shot(wang, "14-witness");
await confirmBtn.click();
await wang.page.waitForSelector(".celebrate", { timeout: 30000 }).catch(async (e) => {
  console.error("witness failed:", await wang.page.textContent("main"));
  throw e;
});
console.log("小赵 balance after guardian seal:", await balance(zhao));

// 6. Simple mode for 妈妈: one number, three large buttons.
await mom.page.goto(BASE + "#/");
async function toggleElder(p) {
  await p.page.getByRole("button", { name: /设置/ }).click();
  await p.page.getByRole("switch", { name: /长辈模式/ }).click();
  await p.page.getByRole("button", { name: "好了" }).click();
  await p.page.waitForSelector(".settings-sheet", { state: "detached" });
}
await toggleElder(mom);
await mom.page.waitForSelector(".elder-home");
await mom.page.waitForFunction(() => !document.querySelector(".elder-balance strong")?.textContent?.includes("…"));
await shot(mom, "15-elder-home");
await toggleElder(mom);

// 7. English locale renders the wax-seal style.
await wang.page.goto(BASE + "#/");
await wang.page.getByRole("button", { name: "EN" }).click();
await wang.page.waitForSelector(".facade-grid .tile-button");
await wang.page.waitForTimeout(800);
await shot(wang, "10-home-en");

// 8. Web layout on a laptop-sized screen.
await wang.page.getByRole("button", { name: "中文" }).click();
await wang.page.setViewportSize({ width: 1440, height: 900 });
await wang.page.waitForTimeout(900);
if (SHOTS) await wang.page.screenshot({ path: `${SHOTS}/11-desktop.png` });

await browser.close();
console.log("E2E OK");
