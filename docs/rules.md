# 比赛规则（只记录已核实或标明来源的信息）

> 更新：2026-10-10
> 来源等级：
> - **[官方]**：Monad 官方渠道（官方中文公众号文章、hackathon.monad.xyz 公开页、Monad Devs 公开帖）
> - **[参赛者]**：其他参赛项目在 GitHub 上引用的规则或提交清单（有交叉印证，但不是原文）
> - **[二手]**：活动聚合页等单一来源
>
> 官方 Portal（https://hackathon.monad.xyz ，用 GitHub 登录）里的 Rules、Submission、Bounties 原文**还没拿到**。拿到后用原文替换下面所有非 [官方] 条目。

## 基础信息
| 项目 | 内容 | 来源 |
|---|---|---|
| 名称 | Monad Metropolis Hackathon 2026 | 官方 |
| 形式 | 全球线上；可以单人参赛或组队；不要求有 Monad / Web3 经验 | 官方 / Rise In |
| 开发期 | 2026-09-01 – 2026-10-13 | 官方 |
| **提交截止** | **2026-10-13 11:59 PM ET**（= 北京时间 **10-14 11:59**） | 官方（Monad Devs 公开帖） |
| 评审期 | 2026-10-14 – 10-27 | 官方 |
| 获奖公布 | 2026-11-03 | 官方 |
| 总奖池 | $250,000+，包含主赛道奖金、Bounties 和 Credits | 官方 |
| 主赛道 | 每个赛道 $30,000（3 × $10,000） | 官方 |
| 总冠军 | **有冲突**：官方中文文章写 $30,000，多数公开来源写 $25,000 | 待 Portal 确认 |
| Portal | https://hackathon.monad.xyz （用 GitHub 登录） | 官方 |

## 四个主赛道
1. **Onchain Finance & Trading**：预测市场、Exotic Options、RWA、参数化保险、交易基础设施。
2. **Consumer Products & Payments**：社交支付、工资流、可编程礼物、微型保险。口号是“crypto that doesn't feel like crypto”。
3. **Social, Attention & Culture**：开放社交图谱、注意力市场、生成艺术、竞争型 Feed、TCG。
4. **Trust, Identity & AI Infrastructure**：Proof of Personhood、Content Passports、Data Lockers、Cross-app AI Memory。官方点名的能力：P256 / WebAuthn、ERC-8004、Encrypted Mempools。

## 提交要求（[参赛者]，多个项目交叉印证）
- 在 Portal 里先创建 Team 和 Project，选**一个**主赛道，再勾选 Bounties
- **Technical Demo 视频 ≤ 3 分钟**
- **Pitch 视频 ≤ 2 分钟**（视频要求可能有两段，需确认）
- 代码仓库要公开，**或者至少让 `metropolis@hackathon.monad.xyz` 能读取**（需确认是否允许保持私有、只邀请评审）
- **原创性披露**（Rules §4.1 Clause 4，“Originality & Hackathon Build Window Disclosure”）：比赛前已有的 UI、代码、模块、产品、工具要逐项说明，标清楚哪些是比赛期间新做的
- [二手] AI 工具使用需要在 README 披露；testnet / mainnet 都可以；团队 1–5 人
- [二手] 评分标准：5 项各 20%（产品质量与完成度、技术水平、Monad 集成、赛道契合、创新与影响）。**最需要原文确认**

## Sponsor Bounties（[官方] Monad Devs 公开帖，细则以 Portal 为准）
| Sponsor | 奖励 | 要求 |
|---|---|---|
| Privy | $5,000 | 集成 Privy，而且**不能只用来登录**，要深入产品核心功能 |
| Dynamic | $5,000 | 在已部署、可以演示的应用里集成 Dynamic SDK（登录 / 嵌入式钱包 / Agent 钱包 / 签名） |
| Mera | $5,000（拆分未知） | 使用 Mera 的 passkey-only onboarding 库；有参赛者描述为“Best Mera-Powered UX on Monad” |
| Kuru | $5,000 | 做一个聚焦的现货交易产品，交易走 Kuru 在 Monad 上的链上订单簿 |
| Perpl | $5,000 + $3,000 | Best Use of Perpl's API；Best Analytics / Risk Tool |
| MetaMask | $2,500 | 给 MetaMask Agent Wallet 写插件，提供新的交易能力 |
| Kimi / Moonshot | $3,000 **credits** | 用 Kimi 驱动项目 |
| Envio | $1,000 | 用 HyperIndex / HyperSync / HyperRPC 驱动 App 核心的链上数据功能 |
| Alchemy | $1,000 credits | 能运行、部署在 Monad、有意义地使用至少一项 Alchemy 服务 |
| Crouton Digital | $5,000 RPC credits | 不限赛道 |
| Agora、Nansen、Chainlink、Alibaba Cloud / Qwen、Tencent Cloud、Cleanverse、Aurora、BlockVision 等 | 未知 | 未知，**不要猜** |

## 官方信号
- Monad Devs 提醒：先读 Resources、Bounties、Tracks；**不要重造已经存在的 Indexer、API、Intent、Identity、Payments 基础设施**，要在现有工具上做出独特的产品机制。
