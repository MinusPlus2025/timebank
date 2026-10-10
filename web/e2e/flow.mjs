// End-to-end walkthrough with virtual passkeys (Chrome's WebAuthn emulator), one browser
// context per person. Requires a local chain + dev server; see README "Local end-to-end test".
// Usage: node e2e/flow.mjs [baseUrl] [screenshotDir]
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.argv[2] || "http://localhost:5173/";
const SHOTS = process.argv[3] || "";
const VIEWPORT = { width: 390, height: 844 };

const browser = await chromium.launch();

async function person(name) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "zh-CN", deviceScaleFactor: 2 });
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
  await p.page.waitForSelector(".headline");
  const me = JSON.parse(await p.page.evaluate(() => localStorage.getItem("timebank.me")));
  console.log(`registered ${p.name} ${me.id}`);
  return me.id;
}

const balance = async (p) => {
  await p.page.goto(BASE + "#/");
  await p.page.reload();
  await p.page.waitForFunction(() => !document.querySelector(".dock-balance b")?.textContent?.includes("…"));
  return p.page.textContent(".dock-balance b");
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
  await helper.page.click("button.primary");
  await helper.page.waitForSelector(".celebrate", { timeout: 30000 });
  await helper.page.waitForTimeout(2200);
  await shot(helper, "05-sealed");
}

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
await wang.page.click(".facade-grid .tile-button:nth-child(2)");
await wang.page.waitForSelector(".window-detail");
await wang.page.waitForTimeout(700);
await shot(wang, "02b-window-open");
await wang.page.click(".window-detail .secondary");

// 4. Door check: the steward certifies 小赵, then 妈妈 checks him at the door.
execSync(`npx hardhat run scripts/certify.js --network localhost`, {
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

// 5. English locale renders the wax-seal style.
await wang.page.getByRole("button", { name: "EN" }).click();
await wang.page.waitForSelector(".facade-grid .tile-button");
await wang.page.waitForTimeout(800);
await shot(wang, "10-home-en");

await browser.close();
console.log("E2E OK");
