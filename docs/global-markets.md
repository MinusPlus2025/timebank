# 各国上门护理核验现状与我们的适配（2026-10-10 调研）

> FACT 都附来源；ASSUMPTION 单独标注。

## 共同漏洞
各国现有的核验，几乎都只证明**护工那一方**：在老人家刷标签、手机打卡、GPS 定位、拨固定电话。被服务的老人（或家属）基本没有独立确认，或者只是在护工递过来的平板上签个名。

## 各国情况
| 国家/地区 | 现有做法 | 已知漏洞（FACT） | 我们的适配 |
|---|---|---|---|
| 美国 | 《21 世纪治愈法案》§12006 强制 Medicaid 居家护理使用 EVV，记录 6 项：服务类型、受服务人、服务人员、日期、地点、起止时间；各州可自选系统 | 护工单方打卡 | 6 项齐全；地点只上链哈希；可导出给州政府的汇总系统（ASSUMPTION：格式待查） |
| 中国 | 长护险按失能等级给付（如每周 3 次、每次 1 小时）；时间银行由各地政府试点 | 2026 年上海案：评估机构与服务机构合谋，324 名老人登记入住却未实际入住；靠事后大数据比对加实地核查 | 每次服务当场双方签名；社区/经办方当认证方（steward）；与时间银行共用一套凭证 |
| 韩国 | 长期护理上门服务：护工用手机碰老人家里的 RFID 标签记录到达和离开 | 护工在自己家刷标签；有人把装标签的柜门拆下带在车上，2021–2023 年持续造假，法院判追回 3740 万韩元 | 标签可以被搬走，**人搬不走**：用老人自己的手机/卡或家属远程确认代替固定标签 |
| 德国 | 2021 年起要求电子化服务记录（Leistungsnachweis），每一项服务都要确认 | 老人常常只被递一个平板签名，看不到清楚的明细 | 签名前用大字和语音读出"谁、做了什么、几点到几点"；链上不存个人数据，符合 GDPR 思路（ASSUMPTION：需法律意见） |
| 英国 | 地方政府要求电子打卡（ECM），按分钟付费；护工到达和离开时拨 0800 电话或用 App | 有系统允许同一护工同时在多个地点打卡 | 合约规定：同一护工同一时间只能有一个进行中的上门 |
| 日本 | 介护保险要求服务后及时写服务记录；曾有 Fureai Kippu 把时间转给异地父母 | 记录晚写、写错护工名字（地方检查指引） | 记录在确认时自动生成，护工身份由刷脸决定，写不错 |

## 由此得到的产品优化（PROPOSED）
1. **上门全过程上链**：到门口刷脸 = 开始（带地点哈希）；双方确认 = 结束。合约检查申报时长不超过实际在场时长，并且同一次上门不能重复使用。
2. **一个护工同一时间只能有一个进行中的上门**（针对英国案例的漏洞）。
3. **被服务方独立确认**：老人自己的手机、实体卡，或家属远程确认，取代固定标签（针对韩国案例的漏洞）。
4. **签名前读出明细**（针对德国反馈的问题）。
5. **隐私**：链上只存哈希和匿名账户，明细由经办机构保存。
6. **地区配置**：字段名称和导出格式按国家调整，不改合约（路线图）。

## 来源
- https://www.medicaid.gov/medicaid/home-community-based-services/guidance/electronic-visit-verification-evv
- https://www.bbtnews.com.cn/2026/0517/593506.shtml
- https://view.asiae.co.kr/en/article/2026071914143993457
- https://www.asiae.co.kr/en/article/2020070810413098217
- https://www.gesetze-im-internet.de/sgb_11/__105.html
- https://www.pflegewegweiser-nrw.de/sites/default/files/pdf/5688-frage-des-monats-august-26-digitaler-leistungnachweis-pflegedienst.pdf
- https://www.communitycare.co.uk/?p=26499
- https://www.cs.stir.ac.uk/courses/msc/projects/PastProjects/2016-2017/Posters/FlynnJ.pdf
- https://www.city.asahikawa.hokkaido.jp/500/548/koureisya/sa-bisu/d081365_d/fil/hs.pdf
