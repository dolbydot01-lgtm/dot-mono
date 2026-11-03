# Changelog

## v0.2 — 2026-11

### 新增

- **M2–M18 全部模块**：讲义 `README.md`、习题 `exercises.md`、实验 `labs/`（每个模块至少一个可离线运行的 Node.js 实验）。
  - Part I：M2 分布式系统与共识、M3 比特币
  - Part II：M4 以太坊架构、M5 Solidity 工程、M6 智能合约安全
  - Part III：M7 货币与稳定币、M8 代币经济学、M9 AMM、M10 借贷、M11 衍生品、M12 MEV / 预言机
  - Part IV：M13 Layer 2、M14 零知识证明、M15 账户抽象与跨链
  - Part V–VI：M16 NFT / DAO / RWA、M17 链上数据、M18 风险与监管
- **Capstone**：三条路线（协议构建 / 金融研究 / 基础设施）、时间线、评分维度与提交清单。
- **交付模板**：合约审计报告、Token Design Review、协议风险评估、Capstone Proposal。
- **Solidity 教学合约**：M5 / M6 / M15 共 7 个零依赖合约，已用 `solc 0.8.30` 编译通过。
- **课程文档**：模块编写规范、术语表、模块索引、课程地图。
- **课程级脚本**：
  - `npm run labs` / `labs:online`：运行全部实验；
  - `npm run links`：检查 Markdown 相对链接；
  - `npm run check:modules` / `check:content` / `check:labs` / `check:placeholders` / `check:quiz`；
  - `npm run quiz:sync`：同步 `quiz.html` 的模块元信息；
  - `npm run qa`：串行运行结构与实验检查。

### 修改

- 根 `README.md`：补齐 M2–M18 进度表、学习路径、配套资料与实验命令。
- `SYLLABUS.md`：版本升至 v0.2；附录 B/C/D 链接到可填写的模板。
- `package.json`：新增课程级脚本。
- `quiz.html`：M2–M18 从“预习题”切换为“配套习题”，并指向对应 `exercises.md`。

### 约定

- 所有实验仅在本地链 / 测试网运行；私钥、助记词均为公开测试值。
- 教学实现不是常数时间、未经审计，不可用于生产。
- 时效性内容（升级、监管、市场数据）以“截至 2026-11”为准。
