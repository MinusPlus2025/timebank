# 决策记录

> 只有用户明确确认的事项才写进“已确认决策”。

## DECISION｜已确认决策
| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-10-10 | 在仓库中维护 `docs/` 项目记忆（rules / strategy / decisions / open-questions / submission） | 用户要求 |
| 2026-10-10 | 选定方向之前不开始正式实现 | 用户要求 |
| 2026-10-10 | 开发期间 GitHub 仓库保持私有，提交前按官方规则决定公开还是只给评审账号读权限 | 用户要求 |
| 2026-10-10 | 复用旧项目（如 EchoPass）的任何代码或素材，都要按 Rules §4.1 Clause 4 如实披露 | 用户要求 |

## 待确认的提议（PROPOSED，尚未生效）
| 提议 | 理由 |
|---|---|
| 默认部署到 Monad **testnet** | [二手] 规则允许 testnet；风险最低、免费 |
| 采用 MIT 开源协议（提交时再加） | [二手] 规则可能要求 OSI 开源协议 |
| 钱包 Bounty 只选 Privy / Dynamic / Mera 中的一家，另加 Envio + Crouton/Alchemy | 三家是竞品；Envio 和 RPC credits 几乎零成本 |
| 技术栈：Foundry（合约）+ Next.js/Vite + viem（前端），部署到 Vercel | EVM 兼容，工具成熟，一个人 4 天内做得完 |
| 先用半天做“逐秒链上微支付”的技术验证，再决定包装成 E1 还是 E4 | 两个方向共享同一个底层，可以降低选错的代价 |

## 已否决方向
| 方向 | 原因 |
|---|---|
| （暂无。strategy.md D 节列出的弱项目类型默认不考虑） | |
