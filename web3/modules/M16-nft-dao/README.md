# M16 NFT、DAO、身份与现实资产

> 所属：Part V · 应用与治理　｜　建议学时：1 周（理论 5 : 实践 5）　｜　截至 2026-11
> 前置：M5 智能合约、M6 安全、M8 代币经济　｜　后续：M17 链上数据分析、M18 风险与监管

## 学习目标

1. **解释** NFT 的"链上所有权 + 链下元数据"结构，比较中心化服务器、IPFS、Arweave、全链存储的持久性与成本；
2. **推导** 版税在无需许可转移下为何无法强制，比较 ERC-2981、转移限制、市场合作、版税换权益四种方案；
3. **计算** 二次方投票成本与二次方资助匹配额，说明它们各自防什么、怕什么；
4. **复盘** 闪电贷治理攻击（Beanstalk），说出快照、时间锁、提案门槛、法定人数各阻断哪一步；
5. **区分** DID、VC、SBT、EAS 四种身份原语，说明它们分别回答"谁声称什么"的哪一层；
6. **解释** RWA 的法律映射：token 持有人对 SPV/底层资产拥有什么权利，ERC-3643 的合规层如何工作；
7. **评估** DePIN、SocialFi、预测市场、AI 代理支付的真实需求与风险。

## 本章地图

| 问题 | 工具 / 概念 | 在区块链中的位置 | 小节 |
|---|---|---|---|
| 如何证明"这个 token 归你"？ | ERC-721/1155、`ownerOf`、`transferFrom` | 应用层资产合约 | §1–2 |
| 图片和属性存在哪？ | 元数据 JSON、IPFS CID、Arweave、全链 SVG | 存储与数据可用性层 | §2 |
| 创作者如何从转售中分成？ | ERC-2981、市场分账、转移限制 | 市场与代币接口 | §2.3 |
| 一群陌生人如何集体决策？ | 代币投票、委托、QV/QF、乐观治理 | 治理合约与链下论坛 | §3 |
| 如何防止治理被闪电贷劫持？ | 快照、时间锁、提案门槛、法定人数 | 治理安全 | §3.4 |
| 如何证明"我是谁 / 我有什么资格"？ | DID、VC、SBT、EAS | 身份与证明层 | §4 |
| 如何把国债、私募信贷搬上链？ | RWA、SPV、ERC-3643、转让代理 | 资产层与合规层 | §5 |
| 下一波应用在哪？ | DePIN、SocialFi、预测市场、x402 | 应用层 | §6 |

## 1. 直觉：一张演唱会门票的三层结构

一张门票包含：**凭证**（票根，证明持票人有权入场）、**指向**（座位、场次、规则）、**发行方承诺**（演出真实、不超卖）。NFT 把第一层放进区块链：一个 `tokenId` 与 `ownerOf(tokenId) = 你的地址`。第二层通常放在链下：一个 JSON，包含图片 URL、名称、属性。第三层取决于发行方：公司、DAO、多签，甚至匿名团队。

> **NFT 不是图片。** NFT 是链上的所有权记录；图片只是记录指向的内容。记录可以永久存在，图片却可能因服务器关停而消失；图片可以永久存储，合约却可能被管理员改掉 `tokenURI`。

这个三层结构贯穿本章：NFT 是"凭证 + 指向 + 承诺"，DAO 决定"承诺由谁来做"，DID/VC 回答"承诺由谁签发"，RWA 回答"承诺对应哪份法律合同"。

## 2. NFT：所有权、元数据与版税

### 2.1 ERC-721 与 ERC-1155

ERC-721（2018）的核心接口只有几个：`ownerOf(tokenId)` 返回所有者；`transferFrom` 无需发行方同意；`tokenURI` 返回元数据 URI；`Transfer` 事件供索引器重建持仓。ERC-1155 用 `(id, balance)` 表示半同质化资产，适合游戏道具、会员卡、系列藏品。

```solidity
function ownerOf(uint256 tokenId) external view returns (address);
function transferFrom(address from, address to, uint256 tokenId) external;
function tokenURI(uint256 tokenId) external view returns (string memory);
```

`transferFrom` 不经过发行方，也不需要市场批准——这正是版税困境的根源。

### 2.2 元数据放在哪

典型元数据 JSON：`{"name":"Course Pass #42","image":"ipfs://bafy.../42.png","attributes":[{"trait_type":"Level","value":"Advanced"}]}`。

| 方案 | 寻址 | 持久性 | 成本 | 主要风险 |
|---|---|---|---|---|
| 中心化服务器 | `https://...` | 取决于运营者 | 低 | 服务器关停、URL 被改、审查 |
| IPFS + pin | `ipfs://CID` | 只要有节点保存 | 中（pin 服务） | 无人 pin 时内容可能消失 |
| Arweave | `ar://txid` | 协议层长期存储 | 一次性较高 | 依赖网络与 endowment 机制 |
| 全链存储 | `data:application/json;base64,...` | 与链共存 | 高 gas | 合约可升级时仍可变 |

IPFS 的 CID 是内容哈希：内容改一个字节，CID 就变。因此"CID 不可变"是真的；但合约里的 `tokenURI` 可以被管理员改成另一个 CID。判断 NFT 是否真正不可变，要同时检查：合约是否有修改 `tokenURI` 的函数、元数据是否内容寻址且持续 pin、合约是否可升级。Arweave 的"永久"是**经济上的永久性**：一次性付费进入 endowment，依赖网络持续运行与代币价值。

### 2.3 版税困境：ERC-2981 只是报价单

ERC-2981 定义 `royaltyInfo(tokenId, salePrice)`，只回答"如果这笔成交愿意付版税，应付给谁、付多少"，**不强制**市场支付。原因：`transferFrom` 无需许可，买卖双方可以场外点对点转移；版税发生在市场成交环节，市场可以选择不调用；即使调用，也可以只当作可选附加费。2022–2024 年 Blur 把版税变为可选，OpenSea 的 operator filter 也在 2024 年初停止强制。**截至 2026-11，不存在跨市场的链上版税强制标准。**

**手算示例：** 创作者发行 1,000 个 NFT，一级价格 0.08 ETH，收入 $80$ ETH。二级 5 笔成交：$0.10+0.12+0.15+0.12+0.10=0.59$ ETH。版税 5%、市场费 2.5%：

$$
\text{版税}=0.59\times5\%=0.0295,\quad
\text{市场费}=0.59\times2.5\%=0.01475,\quad
\text{卖家到手}=0.59-0.0295-0.01475=0.54575\ \text{ETH}
$$

若最后两笔（$0.22$ ETH）走不付版税的市场，创作者版税变为 $(0.59-0.22)\times5\%=0.0185$ ETH，有效版税率 $0.0185/0.59=3.14\%$。**版税是可执行性问题的函数，不是费率参数的函数。**

| 缓解思路 | 做法 | 代价 |
|---|---|---|
| 市场合作 | 与主流市场签协议/白名单 | 新市场不受约束 |
| 转移限制 | operator filter / 允许列表 | 损害可组合性，可能反竞争 |
| 合约钩子 | 自定义 transfer、托管转移 | 破坏 ERC-721 兼容性，用户可走 wrapper |
| 版税换权益 | 空投、会员、线下权益 | 需要持续运营，本质是会员制 |

### 2.4 动态 NFT 与金融化

动态 NFT 的 `tokenURI` 读取链上状态或预言机：全链生成艺术、游戏道具、现实资产数据。ERC-6551（2023）让每个 NFT 拥有代币绑定账户，可持有其他资产、参与协议，NFT 从"图片"变成"可组合账户"。金融化路径包括：碎片化（NFT 拆成 ERC-20）、NFT 借贷（NFTfi、BendDAO）、地板价衍生品、交易挖矿/积分。2022 年 8 月 BAYC 地板价下跌时，BendDAO 出现清算拥堵与坏账风险：NFT 流动性差，清算人无法迅速卖出，预言机价格与拍卖机制脱节。

## 3. DAO：治理模型与攻击面

### 3.1 治理栈

典型 DAO 分五层：**代币**（治理权计量）、**Governor 合约**（提案/投票/法定人数/执行）、**Timelock**（执行前强制延迟）、**金库**（多签或 Timelock 控制）、**链下协调**（论坛、Snapshot、工作组）。OpenZeppelin Governor 流程：

```
propose → votingDelay → vote → quorum → queue → timelock delay → execute
```

每个参数都是攻击面：`votingDelay` 太短会被闪电贷/抢跑利用；`quorum` 太低容易被少数人通过；`timelock` 太短则没有退出时间。

### 3.2 代币投票、委托与二次方投票

"一币一票"简单可组合，但巨鲸可单方面阻止/通过提案，且多数小持有人不投票。**委托**让持有人把投票权交给代表，资产仍在钱包；ERC-5805 标准化检查点：投票读取提案开始时的快照，而非实时余额。

**二次方投票（QV）**：买 $v$ 票需 $v^2$ 信用点：

$$
\text{cost}(v)=v^2,\qquad \text{marginal}(v)=v^2-(v-1)^2=2v-1
$$

| 票数 $v$ | 1 | 2 | 3 | 5 | 10 |
|---|---:|---:|---:|---:|---:|
| 总成本 $v^2$ | 1 | 4 | 9 | 25 | 100 |
| 边际成本 | 1 | 3 | 5 | 9 | 19 |

**手算示例**：一个人买 10 票成本 $10^2=100$；10 个人各买 1 票总成本 $10\times1^2=10$。同样 10 票，集中投票成本是分散投票的 **10 倍**。QV 让"偏好强度"付费，但软肋是女巫：一个人拆成 100 个地址各买 1 票，成本仍是 100，却获得 100 票。安全性取决于"一人一身份"的成本。

### 3.3 二次方资助（QF）

$$
M_p=\left(\sum_i\sqrt{c_i}\right)^2-\sum_i c_i
$$

**手算示例**：贡献 $4,9,16$：$\sum\sqrt{c_i}=2+3+4=9$，平方 $81$，$\sum c_i=29$，$M_p=81-29=52$。对比一笔 $100$ 的贡献：$10^2-100=0$；100 笔 $1$：$100^2-100=9900$。QF 奖励"人数"而非"金额"，但对女巫极其敏感：同样 100 美元拆成 100 个地址，匹配额从 0 变成 9900。匹配池有上限时通常按原始匹配额比例分配，女巫收益下降但不会消失。

### 3.4 乐观治理与治理攻击

**乐观治理**：提案默认通过，除非被否决/挑战。Optimism 采用双院制：Token House（代币持有者）与 Citizens' House（公民），后者负责追溯性公共物品资助。其他模型包括信念投票（权重随时间累积）、全息共识（预测市场筛选提案）、未来学（futarchy，用预测市场决定政策）。共同风险是**元治理**：谁设定参数、谁分配匹配池、谁解释规则。

**案例：Beanstalk（2022-04-17）**。攻击者用闪电贷借入约 10 亿美元，在单笔交易内获得约 79% 治理权，提交并通过恶意提案 BIP-18，转走约 **1.82 亿美元**。根因是治理设计而非代码漏洞：投票权按实时余额计算、没有 Timelock、提案门槛低。

| 防御 | 阻断的攻击步骤 |
|---|---|
| 快照/检查点 | 闪电贷在同一交易内获得的投票权无效 |
| Timelock | 通过后不能立即执行，给社区退出/否决时间 |
| 提案门槛 | 提高攻击者所需资金/代币 |
| 法定人数 + 反对票 | 让攻击提案难以达到 quorum |
| 多签/紧急暂停 | 极端情况下冻结（引入中心化信任） |

其他攻击面：投票贿赂（Convex/Votium 等 bribe 市场）、委托集中、提案内容混淆、金库升级密钥被钓鱼。

### 3.5 法律外壳

DAO 不是法律实体；未注册可能被认定为普通合伙或非法人社团，成员承担无限责任。常见结构：怀俄明州 DAO LLC（2021，成员有限责任）、马绍尔群岛 DAO LLC（2022，离岸/隐私）、瑞士/开曼基金会（治理与法律分离）、多签 + 离岸公司（灵活但透明度低）。

**案例：Ooki DAO（CFTC，2022）**。CFTC 起诉 Ooki DAO 非法提供杠杆交易，法院认定 DAO 可作为"非法人社团"被起诉，判决约 **64 万美元**罚金；投票支持过提案的代币持有人可能被认定为成员。"代码即法律"不是法律抗辩，治理参与本身可能带来责任。

## 4. 身份：DID、VC、SBT、EAS

| 原语 | 回答的问题 | 信任锚 | 可转移？ | 典型用途 |
|---|---|---|---|---|
| **DID** | 标识符对应哪个公钥/端点？ | DID 方法 + 解析器 | 标识符不转移 | 登录、签名、端点发现 |
| **VC** | 发行方是否声称某人具备某属性？ | 发行方签名 | 凭证可出示 | KYC、学历、会员 |
| **SBT** | 链上是否有不可转让的证明？ | 合约 | 不可转让 | 声誉、出席、角色 |
| **EAS** | 谁对什么做了证明？ | 证明者签名 + schema | 证明可撤销 | 标签、审计、投票资格 |

**DID** 是 W3C 定义的 URI 标识符，如 `did:ethr:0x...`、`did:key:z6Mk...`、`did:web:example.com`；解析得到 DID Document（公钥、认证方式、服务端点）。DID 不一定在链上：`did:web` 用 HTTPS，`did:key` 把公钥编码进标识符。其价值是**可解析、可验证、与传输层解耦**，而非"去中心化"本身。

**VC** 是发行方对"主体 + 属性"的签名断言，验证者检查签名、发行方可信度、有效期与撤销状态；高级方案支持选择性披露与零知识证明（M14）。**SBT** 是不可转让 NFT（ERC-5192 的 `locked`），适合出席证明、课程结业、贡献记录；但 SBT 不是身份本身，可信度取决于发行方，公开可查还可能泄露隐私。**EAS** 把证明做成通用协议：按 schema 发布链上/链下、可撤销/不可撤销的 attestation，适合 KYC 标签、审计结论、投票资格。

人格证明方案各有取舍：Worldcoin（虹膜 + ZK，覆盖广但隐私争议）、Gitcoin Passport（多源凭证评分）、BrightID（社交图谱）、政府 eID（可信但覆盖/隐私受限）。本质是在 **Sybil 抵抗、隐私、包容性、成本**之间权衡。

## 5. RWA：把现实资产搬上链

代币化国债/货币基金的卖点：24/7 结算、可作 DeFi 抵押品（需白名单）、份额可编程拆分、账本透明。但它没有消除信用风险、利率风险、法律风险，只是换了载体。

| 产品 | 发行方 | 上线 | 结构要点 |
|---|---|---|---|
| BUIDL | BlackRock + Securitize | 2024-03 | 以太坊份额代币；每日 NAV；转让受限 |
| BENJI | Franklin Templeton | 2021 | 货币基金份额上链 |
| OUSG | Ondo Finance | 2023 | SPV 持有短期美债/货币基金 |
| USTB | Superstate | 2024 | 短期国债基金；链上转让代理 |

收益分配有两种模式：**Rebasing**（余额自动增加）与**价格增值**（价格随 NAV 上升）。**手算示例**：100 万美元投入年化 5% 的代币化国债，管理费 0.2%、平台费 0.1%，净收益 $1{,}000{,}000\times(5\%-0.2\%-0.1\%)=47{,}000$ 美元/年（4.7%）。若二级价格 0.995，折价买入持有到期收益率更高；溢价买入则相反。

**私募信贷**（Maple、Centrifuge、Goldfinch）把贷款池拆成份额：借款人通常是链下企业，需要 KYC/法律合同；池子分 senior/junior tranche，junior 先吸收损失；链上代币代表对 SPV/贷款池的受益权，不是对借款人的直接债权。

**合规层 ERC-3643（T-REX）**：Identity Registry 要求每个地址绑定验证身份；Compliance Modules 在转账前检查投资者类别、司法辖区、锁定期、持仓上限；只有满足条件才执行转账；Trusted Issuers 白名单签发身份声明。ERC-1400 是更早的证券型代币标准，支持份额分级、强制转让、文档锚定。

```solidity
function transfer(address to, uint256 amount) public override returns (bool) {
    require(identityRegistry.isVerified(to), "not verified");
    require(compliance.canTransfer(msg.sender, to, amount), "compliance failed");
    return super.transfer(to, amount);
}
```

**法律映射**：常见结构是"发行人设 SPV → SPV 持有底层资产 → token 代表 SPV 受益权 → 持牌托管人/转让代理维护名册"。关键问题是**破产隔离**：发行人破产时 SPV 资产是否独立？持有人是优先债权人还是普通债权人？链上记录能否被法院认可？监管框架包括美国 Reg D 506(c)/Reg S、欧盟 MiCA、香港 SFC 证券型代币牌照。**截至 2026-11，规则仍在快速变化，具体项目必须取得当地法律意见。**

RWA 风险清单：法律（token 性质、破产隔离、跨境执行）、托管（谁保管、审计、保险）、估值/NAV（预言机、折溢价）、流动性（白名单导致二级稀薄）、合规（KYC/AML、投资者适当性）、技术（合约漏洞、管理员密钥、链上/链下对账）。

## 6. 新兴方向（截至 2026-11）

| 方向 | 机制 | 代表 | 真实需求 | 主要风险 |
|---|---|---|---|---|
| **DePIN** | 代币激励用户部署硬件，提供存储/带宽/地图/算力 | Helium、Hivemapper、Filecoin、Render | 供给冷启动；需求看单位成本 | 补贴退坡后硬件闲置 |
| **SocialFi** | 社交关系/内容代币化，创作者与用户分成 | Friend.tech（2023）、Farcaster、Lens | 创作者变现、社区所有权 | 投机驱动、留存低 |
| **预测市场** | 市场价格聚合信息，事件结算 | Polymarket、Kalshi（CFTC 监管） | 信息发现、对冲 | 结算争议、操纵、赌博监管 |
| **AI 代理支付** | 给 agent 钱包/预算，按 API 调用付费 | x402（Coinbase，2025） | 机器对机器微支付 | 责任归属、提示注入、欺诈 |

**x402** 复用 HTTP 402 "Payment Required"：客户端请求资源，服务器返回 402 与支付要求，客户端用稳定币支付后再请求。它让 AI agent 无需人类信用卡即可按次购买数据/算力。关键问题不是支付，而是**授权与责任**：谁给 agent 预算？被 prompt injection 后能否转走全部资金？如何审计支付行为？

## 7. 代码与实现

### 7.1 带版税声明的 NFT

```solidity
contract CoursePass is ERC721, ERC2981 {
    uint256 public nextId;
    string public baseURI;
    address public immutable creator;

    constructor(address _creator) ERC721("Course Pass", "PASS") {
        creator = _creator;
        _setDefaultRoyalty(_creator, 500); // 5% = 500/10000
    }
    function mint() external payable {
        require(msg.value == 0.08 ether, "wrong price");
        _safeMint(msg.sender, nextId++);
    }
    function tokenURI(uint256 id) public view override returns (string memory) {
        return string.concat(baseURI, _toString(id), ".json");
    }
    function setBaseURI(string calldata uri) external {
        require(msg.sender == creator, "not creator");
        baseURI = uri; // 注意：这使元数据可变
    }
}
```

这里故意保留 `setBaseURI`：它让创作者可以改元数据。若要"不可变"，应去掉 setter、把 baseURI 写进 constructor，并使用内容寻址存储。

### 7.2 QV / QF 核心计算

```js
const qvCost = (v) => v * v;
const qvMarginal = (v) => 2 * v - 1;
function qfMatch(cs) {
  const s = cs.reduce((a, c) => a + Math.sqrt(c), 0);
  return s ** 2 - cs.reduce((a, c) => a + c, 0);
}
```

这正是 Lab 16.1 的实现，运行可看到成本表、匹配额与女巫攻击收益。

### 7.3 Governor + Timelock 最小流程

```
propose → 等待 votingDelay → castVote → 投票期结束
→ 若 Succeeded：queue → 等待 timelockDelay → execute
```

关键参数：`votingDelay`、`votingPeriod`、`proposalThreshold`、`quorum`、`timelockDelay`。每个都要按社区规模与攻击成本校准。

## 8. 案例

- **Beanstalk（2022-04）**：闪电贷获得 79% 治理权，恶意提案转走约 1.82 亿美元；无快照、无 Timelock、门槛低。修复靠快照 + 时间锁 + 门槛 + 紧急暂停。
- **OpenSea / Blur（2022–2023）**：版税从默认收入变成市场竞争变量；operator filter 停止强制后，创作者转向会员制、版税换权益。
- **BUIDL（2024-03）**：BlackRock + Securitize 的 permissioned 代币化货币基金；合规优先、每日 NAV、持牌转让代理，说明 RWA 竞争力在法律确定性 + 结算效率 + 分销。
- **Ooki DAO（CFTC，2022）**：DAO 可作为非法人社团被起诉，投票成员可能承担责任；推动 DAO 法律外壳，但实体控制权与链上治理如何对齐仍是难题。

## 9. CS / 工程视角

| 本章概念 | 已有计算机知识 | 对应关系 |
|---|---|---|
| NFT 所有权 | 数据库主键 + 访问控制 | `tokenId` 是主键，`ownerOf` 是权限检查 |
| 元数据 URI | 指针 / 外键 | 链上存指针，链下存内容；指针可变则记录可变 |
| IPFS CID | 内容寻址存储 / Merkle DAG | 哈希即地址；去重、可验证、需可用性层 |
| Arweave | 一次性付费归档存储 | endowment = 预付费信托；依赖经济持续性 |
| DAO 治理 | 状态机 + ACL + 投票协议 | 提案是事务，投票是提交，Timelock 是两阶段提交 |
| 快照投票 | MVCC / 事务隔离 | 读取提案开始时的快照，避免"同一事务读到自己刚写入的余额" |
| 闪电贷治理攻击 | 同一事务内的读己之写 | 没有快照 = 没有隔离级别 |
| DID | PKI / DNS | 标识符 → 公钥/端点的可解析映射 |
| VC | 签名断言 / 属性证书 | 发行方签名 + 验证方策略 |
| SBT | 不可转让的能力令牌 | capability token；不可转移但不等于可信 |
| EAS | 只追加的证明日志 | append-only log + schema；可撤销是软删除 |
| RWA | 双账本 / 对账 | 链上 token 是视图，链下法律合同是源 |

工程启示：链上只存无法替代的状态；可变性是安全参数（管理员能否改 URI/升级/暂停，决定用户真正拥有什么）；治理参数就是攻击成本；身份层是 QV/QF、空投、RWA 合规的前提。

## 10. 常见误区

1. **"NFT 就是图片。"** 事实：NFT 是链上所有权记录；图片只是 `tokenURI` 指向的内容，可能不在链上、可能被改、可能消失。
2. **"上链就不可变。"** 事实：合约可以有 `setTokenURI`、可升级代理、管理员权限；IPFS CID 不可变，但合约可以指向新 CID。
3. **"ERC-2981 强制版税。"** 事实：它只是查询接口；市场可以选择不调用。版税是市场合作与品牌议价的结果。
4. **"DAO 就是完全去中心化。"** 事实：多数 DAO 仍有核心多签、基金会、委托代表与低投票率；法律外壳可能把控制权集中到少数董事。
5. **"SBT 等于可信身份。"** 事实：SBT 只是不可转让的断言；可信度取决于发行方、隐私与防胁迫；没有反女巫机制可被批量铸造。
6. **"RWA 就是把资产上链。"** 事实：核心是法律映射：token 代表对 SPV/底层资产的什么权利、破产时是否隔离、转让是否合规。

## 11. 实践

见 [`labs/README.md`](./labs/README.md)：

- **Lab 16.1** 二次方投票成本、二次方资助匹配与女巫攻击模拟；
- **Lab 16.2** NFT 版税与创作者收益模拟（强制 / 自愿 / 零版税）。

## 12. 习题

见 [`exercises.md`](./exercises.md)（含完整参考答案）。

## 13. 延伸阅读

- Buterin, Weyl & Ohlhaver (2022). [Decentralized Society: Finding Web3's Soul](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763)
- W3C. [DID Core](https://www.w3.org/TR/did-core/)；[Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [EIP-721](https://eips.ethereum.org/EIPS/eip-721)、[EIP-1155](https://eips.ethereum.org/EIPS/eip-1155)、[EIP-2981](https://eips.ethereum.org/EIPS/eip-2981)、[EIP-6551](https://eips.ethereum.org/EIPS/eip-6551)
- [ERC-3643 (T-REX)](https://eips.ethereum.org/EIPS/eip-3643)；[ERC-1400](https://github.com/ethereum/EIPs/issues/1411)
- OpenZeppelin. [Governor 文档](https://docs.openzeppelin.com/contracts/5.x/governance)
- CFTC. [Ooki DAO 案件](https://www.cftc.gov/PressRoom/PressReleases/8590-22)
- Coinbase. [x402 协议](https://x402.org/)
