# 比赛规则（只记录已核实或标明来源的信息）

> 更新：2026-10-10
> 来源等级：
> - **[官方-中文]**：Monad 中文公众号文章《Monad Metropolis 全球黑客松正式开启》（2026-09-02，用户上传的 PDF）
> - **[二手]**：第三方参赛仓库对官方 Rules 的转述，**官方 Rules 原文尚未看到**（monad.xyz 被当前云端环境的网络策略屏蔽）
>
> 任何标 [二手] 的条目，提交前必须在 https://www.monad.xyz/metropolis 的 Rules & Guidelines 里亲自确认。

## FACT｜已确认（官方-中文）

| 项目 | 内容 |
|---|---|
| 名称 | Monad Metropolis（Monad 年度旗舰黑客松） |
| 形式 | 线上优先，全球开放；线下活动独立并行 |
| 开发期 | 2026-09-01 – 2026-10-13 |
| 提交截止 | 2026-10-13 |
| 评审期 | 2026-10-14 – 2026-10-27 |
| 获奖公布 | 2026-11-03 |
| 总奖池 | 约 $250,000，包含主赛道奖金、Bounties 和 Credits |
| 主赛道奖金 | 4 个赛道 × 3 名 × $10,000 |
| 全场总冠军 | $30,000 |
| 报名/官网 | monad.xyz/metropolis |

### 四个赛道（官方描述原意）
1. **链上金融与交易**：高速结算环境下的新资产原语、市场和交易基础设施。示例：预测市场、Exotic Options、RWA、参数化保险。
2. **消费产品与支付**：让 Crypto 融入产品，而不是成为门槛。示例：社交支付、可编程礼物、工资流支付、微型保险。重点是“用户真正愿意用的体验”。
3. **社交、注意力与文化**：开放社交图谱、Feed 算法、注意力市场、TCG、生成艺术。
4. **信任、身份与 AI 基础设施**：Proof of Personhood、Content Passports、Data Lockers、Cross-app AI Memory。官方点名的 Monad 能力：**P256 / WebAuthn、ERC-8004、Encrypted Mempools**。目标是做能被其他应用复用的基础设施。

### 官方给出的核心命题
- “What becomes possible on Monad?”

## [二手] 待官方确认的规则
来源：github.com/precious-akpan/monad-metropolis-merchant-rails 的 README，转述官方 Rules 的章节号。

| 规则 | 转述内容 | 对我们的影响 |
|---|---|---|
| 截止时间 | 2026-10-13 **11:59 PM ET**（§4.2），不接受迟交 | 约等于北京时间 **10-14 11:59** |
| 编辑 | 截止前可以修改，截止时的版本参与评审 | 可以先提交占位版本，之后再更新 |
| 主赛道评分（§5.2） | 5 项，各占 20%：产品质量与完成度、技术水平、Monad 集成、赛道契合与问题相关性、创新与影响 | 见 strategy.md 的评审假设 |
| Bounty 评分 | 权重不同（40/30/20/10，具体维度未知） | |
| Demo 视频 | **最长 3 分钟**（§4.1、§9.4），必须展示真实运行的产品和 Monad 链上交互，不能只放 mockup 或幻灯片 | |
| 开源 | OSI 认可的开源协议，GitHub 公开（§7.2）。官网营销页写的是“鼓励但不强制”，两者有冲突 | 统一按开源处理 |
| 网络 | testnet 或 mainnet 都可以（§9.2） | 默认用 testnet |
| 团队 | 1–5 人（§2.4） | |
| 赛道 | 每个项目只能报一个主赛道，同一项目不能拿多个主赛道奖（§2.5、§3.3） | 选赛道是战略决策 |
| AI 工具 | 用了 AI 工具要在 README 里披露（§4.1.4） | README 要写披露 |
| 已有代码 | 只能作为基础，且要在 README 里标明；大部分工作必须在开发期内完成，commit 历史要覆盖开发期 | 本仓库 2026-10-10 才创建，全部是新代码，没有问题 |
| 奖池 | 有说法称基础奖池是 $145k，剩下的来自 Bounty | 官方中文文章说总冠军 $30k，另一处二手来源说 $25k，**有冲突** |

## [二手] Sponsor（Bounty 细则未找到）
Dynamic、Privy、Perpl、Nansen、Chainlink、Agora、Kuru、MetaMask、Alibaba Cloud、Kimi、Chainstack、Crouton Digital、Mercuryo 等。每个 Bounty 的具体要求**未知**。
