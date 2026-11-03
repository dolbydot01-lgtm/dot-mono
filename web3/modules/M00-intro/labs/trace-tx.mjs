// Lab 0.3 —— 迷你区块浏览器：解析一笔以太坊交易
// 用法：
//   node trace-tx.mjs                 # 自动选取 Sepolia 最新区块中一笔带日志的交易
//   node trace-tx.mjs <txHash>        # 解析指定交易
//   RPC_URL=https://... node trace-tx.mjs <txHash>   # 自定义 RPC（主网、L2、本地 anvil 均可）

import { createPublicClient, http, formatEther, formatGwei, decodeEventLog, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';

const RPC_URL = process.env.RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const client = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });

// 常见事件的 ABI，用于尝试解码日志
const KNOWN_EVENTS = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Deposit(address indexed dst, uint256 wad)',
  'event Withdrawal(address indexed src, uint256 wad)',
]);

async function pickRecentTx() {
  // 一次取回整个区块的收据，优先挑一笔包含 ERC-20 Transfer 事件的交易，便于观察日志解码
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const receipts = await client.request({ method: 'eth_getBlockReceipts', params: ['latest'] });
  const withTransfer = receipts.find((r) => r.logs.some((l) => l.topics[0] === TRANSFER_TOPIC));
  const withLogs = receipts.find((r) => r.logs.length > 0);
  return (withTransfer ?? withLogs ?? receipts[0]).transactionHash;
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

async function main() {
  const hash = process.argv[2] ?? (await pickRecentTx());
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash }),
    client.getTransactionReceipt({ hash }),
  ]);
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });

  section('1. 交易（发送方签名的内容）');
  console.log({
    hash: tx.hash,
    type: tx.type,                       // legacy / eip2930 / eip1559 / eip4844 / eip7702
    chainId: tx.chainId,                 // 防止跨链重放（EIP-155）
    from: tx.from,                       // 注意：from 不在签名数据里，而是由 (v,r,s) 恢复出来的！
    to: tx.to ?? '(合约创建)',
    nonce: tx.nonce,                     // 该账户发出的第几笔交易，防止重放、保证顺序
    value: `${formatEther(tx.value)} ETH`,
    gasLimit: tx.gas,
    maxFeePerGas: tx.maxFeePerGas ? `${formatGwei(tx.maxFeePerGas)} gwei` : undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? `${formatGwei(tx.maxPriorityFeePerGas)} gwei` : undefined,
    selector: tx.input.slice(0, 10),     // calldata 前 4 字节 = 函数选择器（M5 详述）
    inputBytes: (tx.input.length - 2) / 2,
    signature: { v: tx.v, yParity: tx.yParity, r: tx.r, s: tx.s }, // M1：ECDSA 签名
  });

  section('2. 收据（执行结果）');
  console.log({
    status: receipt.status,              // success / reverted —— 失败的交易照样上链、照样扣费
    blockNumber: receipt.blockNumber,
    txIndex: receipt.transactionIndex,   // 在区块内的排序位置 —— "全局排序"就体现在这里
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: `${formatGwei(receipt.effectiveGasPrice)} gwei`,
    contractAddress: receipt.contractAddress ?? undefined,
    logs: receipt.logs.length,
  });

  section('3. 手续费拆分（EIP-1559，M4 详述）');
  const baseFee = block.baseFeePerGas ?? 0n;
  const priority = receipt.effectiveGasPrice - baseFee;
  const burned = baseFee * receipt.gasUsed;
  const tip = priority * receipt.gasUsed;
  console.log({
    baseFeePerGas: `${formatGwei(baseFee)} gwei`,
    priorityFeePerGas: `${formatGwei(priority)} gwei`,
    burned: `${formatEther(burned)} ETH  （基础费 × gasUsed，被销毁）`,
    tipToProposer: `${formatEther(tip)} ETH  （小费 × gasUsed，给出块者）`,
    totalFee: `${formatEther(burned + tip)} ETH`,
    gasUtilization: `${((Number(receipt.gasUsed) / Number(tx.gas)) * 100).toFixed(1)}% of gasLimit`,
  });

  section('4. 事件日志');
  receipt.logs.forEach((log, i) => {
    let decoded = null;
    try {
      decoded = decodeEventLog({ abi: KNOWN_EVENTS, data: log.data, topics: log.topics });
    } catch { /* 未知事件 */ }
    console.log(`#${i} @ ${log.address}`);
    console.log(`   topic0 = ${log.topics[0]}   (通常是事件签名的 keccak256 哈希；匿名事件除外)`);
    if (decoded) console.log(`   ⇒ ${decoded.eventName}`, decoded.args);
    else console.log(`   ⇒ 未识别事件（topics: ${log.topics.length}, data: ${(log.data.length - 2) / 2} bytes）`);
  });

  section('5. 所在区块');
  console.log({
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,        // 链式结构：每个区块指向父区块的哈希（M1、M2）
    timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
    txCount: block.transactions.length,
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    stateRoot: block.stateRoot,          // 世界状态 Merkle Patricia Trie 的根（M1、M4）
    transactionsRoot: block.transactionsRoot,
    receiptsRoot: block.receiptsRoot,
  });
}

main().catch((e) => {
  console.error('出错：', e.shortMessage ?? e.message);
  process.exit(1);
});
