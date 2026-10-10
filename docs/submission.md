# 提交清单

> 截止：**2026-10-13 11:59 PM ET = 北京时间 10-14 11:59**（官方）。**建议内部截止：北京时间 10-14 06:00**，提前至少 6 小时提交，之后再更新。

## 提交要求（[二手]，待官方确认）
- [ ] 在 Portal 创建 Team 和 Project
- [ ] 选择一个主赛道（只能一个），勾选 Bounties
- [ ] GitHub 仓库公开，或给 `metropolis@hackathon.monad.xyz` 读权限（待确认）；带 LICENSE 文件
- [ ] **开发期间保持仓库私有，提交前再按规则处理**
- [ ] README：项目介绍、为什么用 Monad、架构、运行方法、合约地址、**AI 工具使用披露**、**原创性与开发窗口披露**（Rules §4.1 Clause 4，逐项列出比赛前已有的代码 / UI / 工具）
- [ ] Technical Demo 视频 ≤ 3 分钟，展示真实运行的产品和链上交互（不能只有 mockup 或幻灯片）
- [ ] Pitch 视频 ≤ 2 分钟（待确认）
- [ ] 合约部署在 Monad testnet 或 mainnet，并在浏览器上完成 verify
- [ ] Commit 历史覆盖开发期间
- [ ] 相关 Bounty 的单独要求（待查）

## 链接
| 项目 | 链接 |
|---|---|
| 官网 / 报名 | https://www.monad.xyz/metropolis |
| GitHub | https://github.com/MinusPlus2025/monad-metropolis-2026 |
| 在线 Demo | （待定） |
| 演示视频 | （待定） |
| 合约地址 | Monad testnet `0x5CffF39486db8bD4FAd3826A7B19E92312A2949e` |
| 提交页面 / 参赛后台 | https://hackathon.monad.xyz/dashboard （需要登录） |

## 素材
- [ ] 项目 Logo / 封面图
- [ ] 3–5 张产品截图
- [ ] 一句话介绍（英文 ≤ 20 词）
- [ ] 架构图

## 视频结构（3 分钟草稿）
| 时间 | 内容 |
|---|---|
| 0:00–0:20 | Wow moment：直接展示核心交互和链上交易 |
| 0:20–0:45 | 问题和用户 |
| 0:45–1:45 | 完整演示一遍用户流程（区块浏览器同屏） |
| 1:45–2:30 | 为什么只有在 Monad 上才行（数据：延迟、交易数、每笔成本） |
| 2:30–3:00 | 架构、开源、下一步 |

## 最终检查
- [ ] 无痕窗口打开在线 Demo，从头走一遍
- [ ] 换一台手机走一遍
- [ ] README 里每个链接都能打开
- [ ] 视频公开可见（YouTube 不公开链接 / Loom），时长 ≤ 3:00
- [ ] 合约已 verify，浏览器里能看到交易
- [ ] 仓库里没有私钥、.env、API key
- [ ] 已在官方平台点击提交，并截图保存确认页

## 进度（2026-10-10）
- [x] 方向确定：时间银行 × 双方刷脸盖印
- [x] 合约 TimeBank + WebAuthnP256：19 个测试通过（真实 P-256 WebAuthn 签名，经 P256 预编译验证）
- [x] 网页 App：中英双语、大字模式、生成式印章、转赠、匿名捐、开门验真
- [x] 本地端到端测试通过（4 个虚拟刷脸设备：盖印 → 转赠 → 兑换 → 开门验真）
- [x] README（含原创性披露、AI 工具披露）、MIT LICENSE、截图
- [x] 网络已放开（`*.monad.xyz`、`*.figma.com`）
- [x] 部署地址已领 5 MON 测试币
- [x] 合约已部署到 Monad testnet：`0x5CffF39486db8bD4FAd3826A7B19E92312A2949e`
- [x] **实链验证**（scripts/smoke.js）：真人签名通过、冒充者被拒；双方盖印交易 619 ms 确认，gas 305,604（tx `0x354409724604ed053e27b9136e0b3366dc782ff890dfaba9e75416ae6c4d2277`）
- [ ] 在区块浏览器上 verify 合约源码
- [ ] Vercel 部署网页（用户注册 Vercel 并导入仓库；Claude 提供环境变量）
- [ ] 用真实 iPhone / Android 测试刷脸流程（Safari、Chrome）
- [ ] 录 Demo 视频（≤3 分钟）和 Pitch 视频（≤2 分钟，待确认）
- [ ] 在 Portal 提交；仓库公开或给评审账号读权限
