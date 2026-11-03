# Web 3.0：理论与实践

课程大纲见 [`SYLLABUS.md`](./SYLLABUS.md)。

## 进度

| 模块 | 讲义 | 实验 | 习题 | 状态 |
|---|---|---|---|---|
| M0 从 Web1 到 Web3 | [README](./modules/M00-intro/README.md) | [labs](./modules/M00-intro/labs/README.md) | [exercises](./modules/M00-intro/exercises.md) | ✅ v0.1 |
| M1 密码学基础 | [README](./modules/M01-cryptography/README.md) | [labs](./modules/M01-cryptography/labs/README.md) | [exercises](./modules/M01-cryptography/exercises.md) | ✅ v0.1 |
| M2 分布式共识 | — | — | — | ⏳ |

## 快速开始

```bash
npm install          # Node.js ≥ 20
npm run m0:trace     # M0：解析 Sepolia 上一笔最新交易（需联网）
npm run m1:cpp       # M1：C++ SHA-256 / Merkle 树（需 C++17 编译器）
npm run m1:js        # M1：依次运行全部 JS 实验
```

## 目录约定

```
modules/M{nn}-{slug}/
├── README.md        讲义：学习目标 → 直觉 → 形式化 → 代码 → 案例 → 习题 → 延伸阅读
├── exercises.md     习题与参考答案
├── assets/          图片
└── labs/            实验代码（Solidity / TypeScript + viem / C++17）
```

> ⚠️ 所有实验仅使用本地链与测试网，私钥与助记词均为公开测试值。
