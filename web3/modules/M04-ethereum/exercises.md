# M4 习题

> 难度：★ 基础　★★ 理解　★★★ 拓展　★★★★ 综合设计。B 部分的数值题全部可以手算，建议先手算，再运行 `labs/01-eip1559-sim.mjs` 或 `labs/02-state-trie.mjs` 核对。参考答案在文末。

## A. 概念题

**A1 ★** 以太坊账户状态包含哪四个字段？EOA 与合约账户在这四个字段上分别有什么不同？EIP-7702 又改变了哪一点？

**A2 ★** 比较 calldata、memory、storage、transient storage：生命周期、可写性、相对成本，各举一个典型用途。

**A3 ★★** 从用户点击“发送”到交易被最终化，中间经历哪些阶段？每个阶段由谁验证什么？为什么交易失败后 nonce 仍然递增？

**A4 ★★** 解释 MPT 的分支节点、扩展节点、叶子节点各自存什么。状态根是如何从账户状态计算出来的？为什么验证一个账户只需要路径上的少数节点？

**A5 ★★** 执行层与共识层分别负责什么？列出 Engine API 的三个核心方法及方向，并说明 JWT 的作用。

**A6 ★★** 为什么 EIP-1559 要销毁基础费，而不是把它给验证者？如果基础费进入验证者口袋，会带来什么激励问题？

## B. 计算题

**B1 ★★** EIP-1559 基础费公式为 $b_{t+1} = b_t \times (1 + \frac{1}{8}\frac{g_t-g^*}{g^*})$，目标 gas $g^* = 15{,}000{,}000$。令 $b_t = 12$ gwei，分别求 $g_t = 30{,}000{,}000$、$0$、$22{,}500{,}000$、$7{,}500{,}000$ 时的 $b_{t+1}$（保留两位小数）。

**B2 ★★★** 初始基础费 $b_0 = 10$ gwei，连续 10 个区块都打满（$g_t = 2g^*$）。用解析式求 $b_{10}$；再用“每块向下取整到 wei”的整数算法逐块估算，说明两者为什么会有几个 wei 的差异。

**B3 ★★** 一笔交易消耗 52,000 gas。区块 `baseFee = 12 gwei`，用户设置 `maxFeePerGas = 30 gwei`、`maxPriorityFeePerGas = 2 gwei`。求有效 gas 价格、总手续费、销毁量、验证者小费（分别用 gwei 和 ETH 表示）。

**B4 ★★★** Dencun 参数下 target 为 3 个 blob、max 为 6 个 blob，每个 blob 131,072 blob gas。假设连续 20 个区块每块都打包 6 个 blob，且初始 `excessBlobGas = 0`：
1. 20 块后 `excessBlobGas` 是多少？
2. 用 `fake_exponential(1, excess, 3,338,477) ≈ e^(excess/3,338,477)` 估算 blob 基础费（取整到 wei）。
3. 如果每块只打包 3 个 blob，结果如何？

**B5 ★★** Alice 的账户 `nonce = 7`、`balance = 10 ETH`。她向 Bob 转账 1 ETH，`gasLimit = 21,000`，`maxFeePerGas = 20 gwei`，`maxPriorityFeePerGas = 1 gwei`，区块 `baseFee = 10 gwei`。求 Alice 的新余额与新 nonce、Bob 的余额变化、销毁量与验证者小费（ETH）。

**B6 ★★★** 一笔 nonce = 8 的交易迟迟未打包，但 nonce = 9 的交易已经被打包。用户的交易卡住了。说明至少两种解决办法，并分析“用相同 nonce 替换”时的费用要求与失败风险。

## C. 实践与设计题

**C1 ★★★★** 设计一个支持 EIP-7702 的“安全委托”方案。说明 authorization 的字段、委托代码如何在 EOA 上下文中执行、至少四个攻击面，以及钱包 / 合约 / 监控层各应做什么。

**C2 ★★★★** 某质押服务商占全网约 40% 的验证者，且全部运行同一个执行层客户端。分析两类风险：客户端 bug 与 PBS relay 集中化。给出至少五条工程或治理上的缓解措施。

**C3 ★★★★** 一个轻客户端只保存区块头。它如何验证“账户 X 在状态根 R 下余额为 10 ETH”？写出证明的验证步骤，并说明如何证明“X 不存在”。若把 20 字节地址换成 Verkle 承诺，证明大小和信任假设会怎样变化？

**C4 ★★★** L2 把交易批量数据发布到 L1 时，可以选择 calldata 或 blob。从成本、EVM 可读性、数据保留时间、安全假设四个方面比较两者，并说明为什么 blob 更适合 rollup，但在什么情况下仍应使用 calldata。

---

## 参考答案

**A1**　四个字段是 `nonce`、`balance`、`storageRoot`、`codeHash`。EOA 的 `codeHash` 是空代码哈希、`storageRoot` 是空 trie 根，nonce 表示已发送交易数；合约账户的 `codeHash` 是部署代码哈希、`storageRoot` 是其 storage trie 根，nonce 表示已创建合约数（EIP-161 后从 1 开始）。EIP-7702 允许 EOA 的 code 指向一个委托地址，使其可以执行合约逻辑，但地址、余额与 storage 仍属于该 EOA，因此 EOA 与合约账户的边界被模糊。

**A2**　calldata：随交易提交，单次调用内只读，约 4/16 gas 每字节，用于函数参数；memory：单次调用内可读写，按字扩展且二次方增长，用于临时计算与 ABI 编码；storage：跨交易持久，读写最贵（首次 `SSTORE` 20,000 gas），用于合约状态；transient storage（EIP-1153）：单次交易内可读写，交易结束清空，成本低，用于重入锁与临时记账。关键区别是“生命周期”和“是否持久化”。

**A3**　阶段：① 钱包构造 typed transaction（type 2/3/4 等）并签名；② RPC 节点验证签名、nonce、余额、intrinsic gas，放入 mempool 并 gossip；③ builder / proposer 按有效小费与 MEV 选择交易，组装区块；④ EVM 按 nonce 顺序执行，扣除 gas，修改状态并生成收据；⑤ 共识层验证 execution payload，验证者投票，Casper FFG 最终化。交易失败（revert / out of gas）只回滚状态，不退还已消耗的 gas；nonce 递增是防止重放的核心，否则同一笔失败交易可被反复执行。

**A4**　分支节点有 17 项：前 16 项对应下一个 nibble 的 0–15，第 17 项存放“键在此结束”的值；扩展节点压缩一段共享路径；叶子节点存放剩余路径与值。节点先 RLP 编码，小于 32 字节则内嵌，否则以 `keccak256(RLP(node))` 作为引用。状态根是账户 trie 根节点的哈希。验证账户 X 时，只需提供从根到 X 叶子的路径节点；验证者从已知状态根开始，逐段匹配 nibble、重算哈希，任何篡改都会导致根不匹配，因此不需要下载全部状态。

**A5**　执行层负责 EVM、状态、mempool、JSON-RPC，执行交易并产生 `ExecutionPayload`；共识层负责 Beacon Chain、验证者、attestation、Casper FFG，决定规范链。Engine API：`engine_newPayloadV4`（CL → EL，提交执行区块并验证）、`engine_forkchoiceUpdatedV3`（CL → EL，更新头 / 安全 / 最终化区块，并可请求出块）、`engine_getPayloadV4`（CL → EL，取回构建好的 payload）。JWT 用于认证 EL 的 Engine API 端口（通常 8551），防止未授权进程操控执行层。

**A6**　基础费是对区块空间稀缺性的定价，若支付给验证者，验证者会有动机人为制造拥堵（例如接受低效交易、延迟打包）来提高基础费，也会让费用分配更像“矿工抽租”。销毁使基础费成为全网通缩压力，验证者只获得竞争性的小费，激励更接近“按服务收费”。此外，销毁让所有 ETH 持有人间接受益，减少 PoS 下的中心化租金。

**B1**　$g^*=15$M：
- $g_t=30$M：$(30-15)/15=1$，$b=12\times 9/8=13.50$ gwei；
- $g_t=0$：$(0-15)/15=-1$，$b=12\times 7/8=10.50$ gwei；
- $g_t=22.5$M：$(22.5-15)/15=0.5$，$b=12\times(1+1/16)=12.75$ gwei；
- $g_t=7.5$M：$(7.5-15)/15=-0.5$，$b=12\times(1-1/16)=11.25$ gwei。

**B2**　解析解：$b_{10}=10\times(9/8)^{10}$。$(9/8)^{10}\approx 3.247321025$，所以约 $32.47321025$ gwei。整数算法每块计算 $\lfloor b_t/8 \rfloor$ 后相加，每一步都截断小于 1 wei 的零头，10 步累计约少 4 wei，因此逐块模拟约为 $32.47321025$ gwei，与解析解相差约 $-4$ wei。差异只来自整数取整，不是公式错误。

**B3**　有效价格 $=\min(30,12+2)=14$ gwei。总费 $52{,}000\times14=728{,}000$ gwei $=0.000728$ ETH。销毁 $52{,}000\times12=624{,}000$ gwei $=0.000624$ ETH。小费 $52{,}000\times2=104{,}000$ gwei $=0.000104$ ETH。三者满足 $624{,}000+104{,}000=728{,}000$ gwei。

**B4**　1. 每块超额 $=(6-3)\times131{,}072=393{,}216$ blob gas；20 块后 `excessBlobGas = 20 × 393,216 = 7,864,320`。
2. $7{,}864{,}320/3{,}338{,}477\approx2.3557$，$e^{2.3557}\approx10.55$，用 EIP-4844 的整数 `fake_exponential` 得到 **10 wei**。
3. 每块 3 个 blob 恰好等于 target，超额不增加；`excessBlobGas` 保持 0，blob 基础费保持最小值 1 wei（除非之前已有超额）。这说明 blob 费用只在超过 target 时上升。

**B5**　有效价格 $=\min(20,10+1)=11$ gwei；手续费 $=21{,}000\times11=231{,}000$ gwei $=0.000231$ ETH。Alice 新余额 $=10-1-0.000231=8.999769$ ETH；nonce $=8$；Bob 余额 $+1$ ETH。销毁 $=21{,}000\times10=210{,}000$ gwei $=0.00021$ ETH；小费 $=21{,}000\times1=21{,}000$ gwei $=0.000021$ ETH。

**B6**　办法一：重新广播 nonce = 8 的原交易，确保它到达多个节点 / RPC；办法二：用相同 nonce = 8、更高费用的替换交易（例如给自己转 0 ETH 的“取消”交易），让原交易被替换；办法三：通过私有打包通道提交 nonce = 8 的交易，避免公开 mempool 的传播问题。替换通常要求 `maxFeePerGas` 与 `maxPriorityFeePerGas` 都比原交易高至少 10%（不同客户端策略略有差异）；如果费用提高不够，节点会拒绝替换。风险：原交易可能已经在某个 builder 的区块中，替换交易反而失败；若 nonce = 9 已打包，nonce = 8 的交易最终必须上链或整个 nonce 序列无法继续，不能简单“跳过”。

**C1**　authorization 至少包含 `chainId`、`nonce`、`delegate` 地址与签名（`yParity, r, s`）。执行时，EOA 的 code 变成 `0xef0100 || delegate`；对 EOA 的调用使用 EOA 的地址、余额与 storage 执行 delegate 的代码，效果类似 delegatecall。攻击面：① 钓鱼 / 盲签，用户被诱导设置恶意 delegate；② sweeper 监控并抢跑；③ storage 布局冲突，delegate 覆盖 EOA 的关键槽位；④ 未初始化或可重复初始化；⑤ delegate 自身可升级为恶意实现；⑥ 跨链 / 重放（authorization 必须含 chainId 与 nonce）。钱包应清晰展示 delegate 地址与权限、模拟调用、限制单次授权额度、支持一键撤销（delegate = 0）；合约应使用 ERC-7201 命名空间、一次性初始化、最小权限、不可升级或时间锁升级；监控应告警异常的 `authorization` 与 delegate 变更。

**C2**　客户端 bug 风险：若某执行层客户端占 2/3 以上，单一 bug 可能让所有运行它的验证者最终化错误链；若占 1/3 以上，可能阻止最终化。PBS 风险：relay 能看到区块内容，可能审查交易或泄露信息；builder 市场集中会导致区块构建权集中，MEV 收益分配不均。缓解措施：① 运行少数派客户端，目标没有客户端超过 1/3；② 多样化操作系统、云厂商与地域；③ 使用多个 relay，并保留本地构建区块的能力；④ 采用 ePBS、FOCIL 等协议级方案减少 relay 信任；⑤ 对 builder / relay 做透明度和第三方审计；⑥ 监控最终化延迟、客户端版本与 relay 份额；⑦ 治理上避免单一实体控制超过 1/3 质押。

**C3**　轻客户端从共识层获得已最终化的区块头，取出 `stateRoot = R`。证明是从根到账户叶子的节点列表：每个节点给出 RLP 编码，验证者计算 `keccak256(RLP(node))`，与父节点中的引用比较；按路径 nibble 选择分支或跳过扩展路径；最后在叶子中解码 `RLP([nonce, balance, storageRoot, codeHash])`，检查余额为 10 ETH 且路径匹配。若某条路径在分支节点的对应子项为空，或叶子路径与目标键不一致，就得到“不存在”证明。Verkle 用向量承诺替代逐层哈希，证明大小从“每层一个哈希”降为接近常数（一个或几个承诺证明），但信任假设从纯哈希碰撞抗性变为需要可信的向量承诺设置 / 密码学假设；同时状态访问的见证可以更小，有利于无状态客户端。

**C4**　成本：calldata 按字节计价（非零字节 16 gas，EIP-7623 还设底价），blob 有独立的 blob gas 市场，单位字节成本通常低得多；EVM 可读性：calldata 可被合约直接读取，blob 只能看到版本化哈希，EVM 不能读取内容；保留时间：calldata 随执行层历史长期保存，blob 约 18 天后剪枝；安全假设：calldata 的可用性由执行层全节点保证，blob 由共识层数据可用性采样 / KZG 保证，但长期历史需要 L2 或归档方保存。rollup 只需把批量数据发布出去供验证者 / 挑战者短期读取，因此 blob 更合适；当合约需要在 L1 上直接读取数据、需要永久可用性，或 blob 费用因拥堵高于 calldata 时，仍应使用 calldata。实际实现常把关键状态根与少量元数据放 calldata，把大块交易数据放 blob。
