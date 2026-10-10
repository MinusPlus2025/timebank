# 未解决问题与假设

> 更新：2026-10-10。按优先级排序。

## OPEN QUESTION｜需要你回答（阻塞选方向）
1. **团队**：几个人？各自擅长什么（Solidity / 前端 / 设计 / 视频）？
2. **时间**：截止前每天能投入多少小时？
3. **偏好**：更想做哪个赛道？有没有现成的社群、直播间或用户，能在 Demo 里用真人参与？
4. **账户**：是否已经在 monad.xyz/metropolis 报名？提交平台是什么（Devpost / Rise In / 官方表单）？
5. **环境**：有没有 Monad testnet 测试币和钱包？有没有 RPC（官方公共 RPC / Alchemy / QuickNode / Chainstack）？

## OPEN QUESTION｜需要核实的规则
6. 官方 Rules 原文：评分标准是不是 5 × 20%？视频是不是最长 3 分钟？必须开源吗？截止时间是不是 11:59 PM ET？（当前环境访问不了 monad.xyz，需要你在浏览器里打开确认，或者把 Rules 截图 / 复制给我）
7. 总冠军奖金是 $30k（官方中文文章）还是 $25k（二手来源）？
8. 各 Sponsor Bounty 的要求和金额，特别是 Privy、Dynamic、MetaMask、Chainlink、Agora、Kimi、Alibaba Cloud。
9. Bounty 能否和主赛道同时获奖？一个项目能报几个 Bounty？

## ASSUMPTION｜未验证的技术假设（实现前要对照 docs.monad.xyz）
10. Monad testnet 出块约 400ms、最终性约 800ms，可以稳定支持“每秒一笔”交易的 Demo。
11. Monad 支持 P256 预编译（RIP-7212），可以在合约里验证 WebAuthn/Passkey 签名。具体地址和 gas 待确认。
12. testnet 水龙头额度足够支撑 Demo 期间的高频交易。
13. 公共 RPC 的速率限制不会卡住每秒多笔交易（必要时用 Chainstack 等付费 RPC）。
14. Monad 的 nonce / 交易打包机制允许同一个账户连续快速发送交易（否则要用多个 session key 轮流发）。
