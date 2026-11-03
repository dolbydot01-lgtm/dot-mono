# 参与编写

本课程是"讲义 + 习题 + 可运行实验"的开源教学材料。欢迎补充案例、修正错误、增加实验。

## 开始之前

1. 读 [`docs/MODULE_TEMPLATE.md`](./docs/MODULE_TEMPLATE.md)：模块目录、README 章节、习题与实验规范。
2. 读 [`SYLLABUS.md`](./SYLLABUS.md)：确认你的内容属于哪个模块、前后依赖是什么。
3. 参考 M0/M1 的成品：语气、公式排版、实验输出风格保持一致。

## 新增 / 修改模块

```bash
# 1. 在对应模块目录下工作
cd modules/M09-amm

# 2. 修改 README.md / exercises.md / labs/

# 3. 运行该模块的实验（可直接 node，也可用根目录 runner）
node modules/M09-amm/labs/01-constant-product.mjs
cd ../.. && node scripts/run-all-labs.mjs --filter m09

# 4. 检查链接、结构与占位符
npm run links
npm run check:modules
npm run check:content
npm run check:labs
npm run check:placeholders
```

## 实验写作要求

- 每个 `.mjs` 必须能从仓库根目录直接 `node <path>` 运行，不联网、不新增依赖。
- 随机实验使用固定种子（mulberry32），输出可复现。
- 开头写 `// Lab x.y —— 一句话目标` 与运行命令；结尾留 1–3 个"动手改一改"。
- 需要联网的脚本在文件前 2KB 内标注 `// REQUIRES_NETWORK`，并保证断网时优雅退出（退出码 0）。
- Solidity / Circom 代码可以放在 `labs/contracts/` 或 `labs/circuits/`，但同时要提供一个不依赖编译器的 JS 实验。

## 习题要求

- 至少 8 题，A 概念 / B 计算 / C 实践，难度用 ★–★★★ 标注。
- 参考答案放在文末，计算题给出关键中间量，便于手算复核。
- 计算题的数字要自洽；写完用 Node 快速验算。

## 提交前检查

```bash
npm run qa          # 结构 + 内容 + 链接 + 全部离线实验
npm run quiz:sync   # 如果新增了模块或改了习题路径
npm run check:quiz
```

## 合规与安全

- 所有链上实验仅在本地链（Anvil）或测试网进行；不要提交真实私钥、助记词、API key。
- 教学合约与密码学实现未经审计，不可用于生产。
- 引用第三方代码 / 数据 / 图表时注明来源与许可证。
- 中国大陆禁止虚拟货币交易及相关业务活动；课程内容以学术与工程教学为目的。
