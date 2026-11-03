// Lab 4.3 —— 可选联网实验：用 viem 读取 Sepolia 的区块、费用与存储
// 运行：node modules/M04-ethereum/labs/03-sepolia-read.mjs
// 指定 RPC：RPC_URL=https://your-rpc node modules/M04-ethereum/labs/03-sepolia-read.mjs
//
// 本实验不是后续课程的必需步骤：断网时会打印“跳过”并以 0 退出。
// 只读，不需要私钥，也不要向任何地址转入资产。

import { createPublicClient, http, formatGwei, formatEther } from "viem";
import { sepolia } from "viem/chains";

const RPC_URL = process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 58 - title.length))}`);
}

function short(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "(合约创建)";
}

function predictedBaseFee(parent) {
  const target = parent.gasLimit / 2n;
  const delta = parent.gasUsed - target;
  return parent.baseFeePerGas + (parent.baseFeePerGas * delta) / target / 8n;
}

console.log("[可选联网] 连接 Sepolia，只读；不需要私钥。");
console.log(`RPC：${RPC_URL}`);

try {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL, { timeout: 10_000, retryCount: 1 }),
  });

  const latest = await client.getBlockNumber();
  const parent = await client.getBlock({ blockNumber: latest - 1n });
  const block = await client.getBlock({ blockNumber: latest, includeTransactions: true });

  section("1. 最新区块");
  console.log(`区块号      #${block.number}`);
  console.log(`时间戳      ${new Date(Number(block.timestamp) * 1000).toISOString()}`);
  console.log(`baseFee     ${block.baseFeePerGas} wei = ${formatGwei(block.baseFeePerGas)} gwei`);
  console.log(`gasUsed     ${block.gasUsed} / ${block.gasLimit} (${(Number(block.gasUsed) / Number(block.gasLimit) * 100).toFixed(2)}%)`);
  console.log(`交易数      ${block.transactions.length}`);
  console.log(`状态根      ${block.stateRoot}`);
  console.log(`blobGasUsed ${block.blobGasUsed ?? 0}（Fusaka 后 blob 参数以链上为准）`);

  section("2. 用父块验证 EIP-1559 公式");
  const predicted = predictedBaseFee(parent);
  console.log(`父块 #${parent.number}：gasUsed=${parent.gasUsed}, gasLimit=${parent.gasLimit}, baseFee=${parent.baseFeePerGas} wei`);
  console.log(`父块 target = gasLimit/2 = ${parent.gasLimit / 2n}`);
  console.log(`预测本块 baseFee = ${predicted} wei`);
  console.log(`实际本块 baseFee = ${block.baseFeePerGas} wei`);
  console.log(`公式验证：${predicted === block.baseFeePerGas ? "一致 ✓" : "不一致（可能跨过了空块或 RPC 数据不一致）"}`);

  section("3. 最近 5 个区块的费用历史");
  const history = await client.getFeeHistory({
    blockCount: 5,
    blockTag: "latest",
    rewardPercentiles: [50],
  });
  console.log("block   baseFee(wei)   gasUsedRatio   50% tip(wei)");
  history.baseFeePerGas.slice(1).forEach((fee, i) => {
    const tip = history.reward?.[i]?.[0] ?? 0n;
    console.log(
      `${String(Number(history.oldestBlock) + i).padStart(5)}   ${fee.toString().padStart(12)}   ` +
      `${history.gasUsedRatio[i].toFixed(4).padStart(12)}   ${tip.toString().padStart(11)}`
    );
  });

  section("4. 区块中的第一笔交易");
  const tx = block.transactions.find((item) => typeof item === "object");
  if (tx) {
    console.log(`hash    ${tx.hash}`);
    console.log(`type    ${tx.type}`);
    console.log(`from    ${short(tx.from)}  →  to ${short(tx.to)}`);
    console.log(`value   ${formatEther(tx.value)} ETH`);
    console.log(`nonce   ${tx.nonce}`);
    console.log(`gas      ${tx.gas}（limit）`);
    console.log(`maxFee  ${tx.maxFeePerGas ?? "-"} wei, maxPriority ${tx.maxPriorityFeePerGas ?? "-"} wei`);
  } else {
    console.log("该区块没有交易。");
  }

  section("5. eth_getStorageAt：读取 WETH 合约的 slot 0");
  const code = await client.getCode({ address: WETH_SEPOLIA });
  if (!code || code === "0x") {
    console.log("WETH 地址在当前网络上没有代码，跳过。");
  } else {
    const slot0 = await client.getStorageAt({ address: WETH_SEPOLIA, slot: "0x0" });
    // Solidity 短字符串：字节左对齐，最后一个字节是 length*2。
    const raw = slot0.slice(2);
    const length = parseInt(raw.slice(-2), 16) / 2;
    const text = Buffer.from(raw.slice(0, length * 2), "hex").toString("utf8");
    console.log(`地址    ${WETH_SEPOLIA}`);
    console.log(`slot 0  ${slot0}`);
    console.log(`解码    "${text}"（短字符串长度 ${length} 字节）`);
    console.log("storage 是 32 字节槽位；字符串、mapping、动态数组的布局规则见 M5。");
  }

  section("6. 思考点");
  console.log("1) 把 RPC_URL 换成另一个公共节点，比较 baseFee 与区块号是否一致。");
  console.log("2) 找一笔 blob 交易（type=3），观察 blobVersionedHashes 与 blobGasPrice。");
  console.log("3) 为什么 eth_getStorageAt 返回 32 字节，而不是 Solidity 里的 uint128？");
} catch (error) {
  console.log("\n[跳过] 无法连接 Sepolia 或 RPC 返回错误。");
  console.log(`原因：${error.shortMessage ?? error.message}`);
  console.log("本实验是可选的；Lab 4.1 / 4.2 完全离线，已覆盖本模块的核心机制。");
}
