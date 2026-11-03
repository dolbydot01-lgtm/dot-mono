# 课程文档与模板

本目录存放跨模块复用的写作规范与交付模板。

| 文件 | 用途 | 相关模块 |
|---|---|---|
| [`MODULE_TEMPLATE.md`](./MODULE_TEMPLATE.md) | 模块目录结构、README / 习题 / 实验的统一规范 | 全部 |
| [`audit-report-template.md`](./audit-report-template.md) | 智能合约审计报告模板 | M6、Capstone A |
| [`token-design-review-template.md`](./token-design-review-template.md) | 代币设计评审模板 | M8、Capstone B |
| [`risk-assessment-template.md`](./risk-assessment-template.md) | 协议风险评估模板 | M18、Capstone B/C |
| [`capstone-proposal-template.md`](./capstone-proposal-template.md) | Capstone 选题与范围模板 | Capstone |
| [`glossary.md`](./glossary.md) | 课程术语表（按主题分组） | 全部 |
| [`course-map.md`](./course-map.md) | 一页版课程地图与学习路线 | 全部 |

## 使用建议

- **写新模块**：先读 `MODULE_TEMPLATE.md`，再参考 M0/M1 的成品；实验必须是可直接 `node` 运行的 `.mjs`。
- **做 Capstone**：根据路线选择对应模板；模板中的"范围与限制""残余风险"不能删。
- **评审同学作业**：用模板中的检查表逐项打分，先看风险与可复现性，再看功能。

## 仓库级脚本

```bash
npm run labs            # 运行全部离线 JS 实验
npm run labs:online     # 含需要联网的实验
npm run links           # 检查 Markdown 相对链接
npm run quiz:sync       # 同步 quiz.html 的模块元信息
node scripts/check-modules.mjs   # 检查模块目录与文件完整性
node scripts/check-content.mjs   # 检查讲义章节与习题数量
```
