# Pitch 稿与 Demo 分镜（方向 A，2026-10-13）

> 英文是录音用的稿子，中文是对照，方便你理解和改。英文约 270 词，正常语速大约 1 分 50 秒。
> 数字都来自 README 和 smoke.js 的实测；市场规模没有可靠来源，所以稿子里不提。

## 一、Pitch 视频（≤ 2 分钟）

| 时间 | 画面 | 英文旁白 | 中文对照 |
|---|---|---|---|
| 0:00–0:15 | 夜晚的楼，一扇窗亮起 | AI can do things for you. It can't be there for you. Someone still has to knock on the door, sit with your mother, take her to the clinic. TimeBank proves that time was really given. | AI 能替你做事，但不能替你陪伴。总得有人去敲门、陪你妈妈、带她去看病。TimeBank 证明这段时间真的被付出了。 |
| 0:15–0:40 | 各国新闻截图（韩国标签、上海虚报） | Today, proof of a care visit is one-sided. In Korea, a carer unscrewed the cabinet door holding the visit tag and kept it in his car for two years. In Shanghai, 324 older people were billed as in care but never arrived. Time banks have the opposite problem: about 70% close within three years, and people's hours vanish with them. | 现在，上门护理的证明只有护工一方。韩国有护工把装着打卡标签的柜门拆下来放在车里，造假两年。上海有 324 位老人被登记入住，却从没去过。时间银行则是另一个问题：大约 70% 三年内关门，大家存的时间跟着没了。 |
| 0:40–1:10 | 两部手机当面刷脸，印章落下 | TimeBank needs two people. The person helped says thank you with Face ID. The helper confirms with Face ID. Monad verifies both passkey signatures on-chain with its P256 precompile, in under two seconds. No wallet, no seed phrase. Nobody, not even us, can change the record. | TimeBank 需要两个人。被帮的人用 Face ID 说谢谢，帮忙的人用 Face ID 确认。Monad 用 P256 预编译在链上验证两把 passkey 的签名，两秒内完成。不用钱包，不用助记词。谁都改不了这条记录，包括我们自己。 |
| 1:10–1:40 | 左右分屏：邻居送时间给父母 / 护理机构看到上门记录 | One seal, two uses. For neighbours it's free: bank an hour, give it to your parents in another city. For care agencies and insurers it's paid: arrival, departure and a two-person seal for every visit, priced per verified visit. Honest carers finally have proof too. | 一个印章，两种用法。对邻居免费：存下一小时，送给另一个城市的父母。对护理机构和保险方收费：每次上门都有到门、离开和双人盖印，按核验过的次数收费。诚实的护工也终于有了证据。 |
| 1:40–1:55 | 开门验真画面 | And before an older person opens the door, one scan shows whether the visitor is really from their community. | 老人开门之前扫一下，就知道来人是不是真的社区志愿者。 |
| 1:55–2:00 | Logo 和网址 | TimeBank. Every bit of care, seen. | 每一份付出，都有人看见。 |

## 二、Demo 视频（≤ 3 分钟）

要真实操作，不能只放截图。两部手机同框最好；只有一部手机时，用桌面浏览器当第二个人。

| 时间 | 画面 | 要点 |
|---|---|---|
| 0:00–0:15 | 直接盖印：两部手机刷脸，印章落下，旁边开着区块浏览器出现交易 | 开场就给结果 |
| 0:15–0:35 | 刷脸注册 | 没有钱包、没有密码 |
| 0:35–1:10 | 邻居场景：选帮助类型和时长，出示二维码，对方扫码刷脸，窗户亮起 | 受助者发起感谢，不是记账 |
| 1:10–1:30 | 把时间送给父母 | 跨城市 |
| 1:30–2:15 | **护理场景**：护工到门刷脸（到门记录），结束时双人盖印；守护人手机收到“有人到门”提醒；页面显示到门时间和实际在场分钟 | 新讲法的核心，对应合约 `arrive` 和 `VisitClosed` |
| 2:15–2:35 | 开门验真：真人通过，冒充者被拒 | 防诈骗 |
| 2:35–2:55 | 为什么是 Monad：307,241 gas 验两把 passkey，端到端 1.7 秒；架构图 | 数字来自 smoke.js |
| 2:55–3:00 | 仓库、合约地址、在线网址 | |

## 三、录之前要确认
- 用真 iPhone 在 Safari 走一遍注册和盖印（之前只在虚拟 passkey 上测过）。
- 护理场景的守护人提醒要两部设备，提前把家人卡加好。
- 区块浏览器打开合约地址 `0xA15f3aBeABE823726070dF8Cea0e4E52d8bd234d`。
