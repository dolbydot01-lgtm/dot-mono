# 最小上界（上确界）Lean 最小示例

用 Lean 4 + Mathlib 把 `analysis/note.md` 中的“最小上界性”形式化。
代码面向 Lean 初学者：

* 每一行 tactic / 定义都有中文注释，解释它在做什么；
* Mathlib 名字均使用全限定形式，例如 `Set.Ioo`、`Set.range`、`Set.Nonempty`；
* 缩写名在注释中补充英文全称与中文含义，例如
  `IsLUB` = least upper bound、`sSup` = supremum；
* 文件末尾附有 Mathlib 名字与 tactic 的全称速查表。

## 文件

- `LubDemo.lean`：最小上界相关示例，从 `IsLUB` 的定义一路到 `sSup` 的等式写法。
- `ArchimedeanProperty.lean`：用反证法 + 最小上界性证明实数集的阿基米德性质。
- `lakefile.toml`：依赖固定到 Mathlib 提交 `2ddf59c8f14`。
- `lean-toolchain`：Lean 版本 `v4.36.0-rc2`，与该 Mathlib 提交一致。

## 概念对照

| 数学 | Lean / Mathlib 全名 |
|---|---|
| `a` 是 `S` 的上界 | `a ∈ upperBounds S` |
| `a` 是 `S` 的最小上界 | `IsLUB S a` |
| `S` 的上确界 | `sSup S` |
| 最小上界性（完备性） | `isLUB_csSup : Set.Nonempty S → BddAbove S → IsLUB S (sSup S)` |
| 证明 `IsLUB` 后得到 `sSup` 等式 | `IsLUB.csSup_eq` |
| 上界集的刻画 | `mem_upperBounds : a ∈ upperBounds S ↔ ∀ x ∈ S, x ≤ a` |
| 下界集的刻画 | `mem_lowerBounds : a ∈ lowerBounds S ↔ ∀ x ∈ S, a ≤ x` |
| 开区间 | `Set.Ioo a b` |
| 函数值域 | `Set.range f` |

注意 `IsLUB` 的定义是 `IsLeast (upperBounds S)`，所以它的两个分量是：

1. `a ∈ upperBounds S`（是上界）；
2. `a ∈ lowerBounds (upperBounds S)`（比所有上界都小）。

## 运行

本目录已配置本地 elan 工具链（`~/.elan`，未修改 shell 配置），Mathlib 缓存也已下载。在项目根目录执行：

```bash
export PATH="$HOME/.elan/bin:$PATH"
lake build
```

`lake build` 成功即表示所有示例通过 Lean 检查。也可以在 VS Code 中安装 Lean 4 扩展后直接打开 `LubDemo.lean`。

### 如果重新拉取依赖时 GitHub 主站超时

当前网络下 `github.com` 的 DNS 可能解析到不可达的 IP，但 SSH 可用。Lake 拉依赖时可以临时让 git 走 SSH（只对当前命令生效，不改全局配置）：

```bash
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0='url.git@github.com:.insteadOf'
export GIT_CONFIG_VALUE_0='https://github.com/'
lake update
lake exe cache get
```

## 示例内容

1. **最小上界性本身**：`isLUB_csSup`。
2. **上确界可以不属于集合**：`Set.Ioo 0 1` 的 `IsLUB` 是 `1`，但 `1 ∉ Set.Ioo 0 1`，该集合没有最大值。
3. **逼近式定义**：数列 `1 - 1/(n+1)` 的上确界是 `1`，`1` 不是任何一项；证明中显式使用了“任给 ε > 0，存在一项大于 `1 - ε`”。
4. **从 `IsLUB` 推出 `sSup` 等式**：`sSup (Set.Ioo 0 1) = 1`。
5. **有理数不完备**：文件末尾给出了 `¬ ∃ a : ℚ, IsLUB {q : ℚ | q ^ 2 < 2} a` 的练习提示（该集合在 `ℚ` 中的“缺口”就是 `√2`）。

## 阿基米德性质（乘积形式）

`ArchimedeanProperty.lean` 证明：

```lean
theorem real_archimedean_mul (ε : ℝ) (hε : 0 < ε) (B : ℝ) :
    ∃ n : ℕ, B < ε * (n : ℝ)
```

即：对任意正实数 `ε` 和任意实数 `B`，总存在自然数 `n`，使乘积
`ε * n` 超过 `B`。等价说法：集合 `{ε * n | n ∈ ℕ}` 在 ℝ 中无上界。

证明采用**反证法**：

1. 假设存在 `B`，使所有自然数都满足 `ε * n ≤ B`；
2. 于是 `S = Set.range (fun n : ℕ => ε * (n : ℝ))` 非空且有上界；
3. 由最小上界性，`a = sSup S` 是 `S` 的最小上界；
4. 因为 `ε > 0`，所以 `a - ε < a`，故 `a - ε` 不是上界；
5. 因此存在 `n` 使 `a - ε < ε * n`，两边加 `ε` 得 `a < ε * (n + 1)`；
6. 但 `ε * (n + 1) ∈ S` 且 `a` 是上界，所以 `ε * (n + 1) ≤ a`，矛盾。

取 `ε = 1` 就得到加法形式 `real_archimedean : ∃ n : ℕ, x < n`。
这个证明没有直接调用 Mathlib 已有的 `exists_nat_gt`，而是从
`isLUB_csSup`（最小上界性）推出阿基米德性质。
