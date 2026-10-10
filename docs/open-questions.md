# 未解决问题与假设

> 更新：2026-10-10。按优先级排序。

## OPEN QUESTION｜需要你回答（阻塞选方向）
1. ~~团队~~ → 已回答：1 人，不写代码，没用过任何钱包 SDK。
2. **时间**：截止前每天能投入多少小时？
3. **偏好**：更想做哪个赛道？有没有现成的社群、直播间或用户，能在 Demo 里用真人参与？
4. **账户**：是否已经在 monad.xyz/metropolis 报名？提交平台是什么（Devpost / Rise In / 官方表单）？
5. **环境**：有没有 Monad testnet 测试币和钱包？有没有 RPC（官方公共 RPC / Alchemy / QuickNode / Chainstack）？


## OPEN QUESTION｜需要核实的规则
6. 官方 Rules 原文：评分标准是不是 5 × 20%？视频是不是最长 3 分钟？必须开源吗？截止时间是不是 11:59 PM ET？（官方后台 https://hackathon.monad.xyz/dashboard 需要登录，而且当前云端环境的网络策略屏蔽了 monad.xyz 的所有域名。需要你登录后把 Rules、提交表单字段和 Bounty 列表截图或复制给我）
7. 总冠军奖金是 $30k（官方中文文章）还是 $25k（多数来源）？
7a. 是要两段视频（Demo ≤3 分钟 + Pitch ≤2 分钟）吗？
7b. 仓库能不能保持私有、只给 metropolis@hackathon.monad.xyz 读权限？
8. Bounty 的完整评审条件，特别是 Privy / Dynamic / Mera（候选组合）；以及 Agora、Nansen、Chainlink、Alibaba Cloud 等未知 Bounty。
9. Bounty 能否和主赛道同时获奖？一个项目能报几个 Bounty？

## 阻塞项｜云端环境网络
- 当前云端环境的网络策略屏蔽了 **所有 Monad RPC**（testnet-rpc.monad.xyz、rpc.monad.xyz、drpc、ankr 都被拒）。不放开的话，Claude 没法在这里部署合约、跑链上测试。
- 需要用户在环境设置里放开网络（见 strategy.md「需要用户做的事」）。

## ASSUMPTION｜未验证的技术假设（实现前要对照 docs.monad.xyz）
10. Monad testnet 出块约 400ms、最终性约 800ms，可以稳定支持“每秒一笔”交易的 Demo。
11. Monad 支持 P256 预编译（RIP-7212），可以在合约里验证 WebAuthn/Passkey 签名。具体地址和 gas 待确认。
12. testnet 水龙头额度足够支撑 Demo 期间的高频交易。
13. 公共 RPC 的速率限制不会卡住每秒多笔交易（必要时用 Chainstack 等付费 RPC）。
14. Monad 的 nonce / 交易打包机制允许同一个账户连续快速发送交易（否则要用多个 session key 轮流发）。
