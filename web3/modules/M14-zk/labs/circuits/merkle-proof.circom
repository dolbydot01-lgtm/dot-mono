// SPDX-License-Identifier: MIT
pragma circom 2.1.6;

// 参考电路：证明"我知道 Merkle 树中某个叶子的原像"，而不公开叶子、路径或秘密。
//
// 结构对应讲义 §7（Tornado 式协议）与 Lab 14.1 的第 4 节：
//   leaf          = Poseidon(secret, nullifier)
//   root          = MerkleRoot(leaf, pathElements, pathIndices)
//   nullifierHash = Poseidon(nullifier)          // 公开，用于防双花
//
// 依赖 circomlib（Poseidon）。本机没有 circom / snarkjs，以下命令仅作阅读参考：
//   circom merkle-proof.circom --r1cs --wasm --sym -l node_modules
//   snarkjs groth16 setup merkle-proof.r1cs pot.ptau merkle.zkey
//   snarkjs zkey export solidityverifier merkle.zkey Verifier.sol
//
// 说明：
// - depth=20 可容纳约 100 万个叶子；真实 Tornado 使用 20 层。
// - 电路只证明"叶子在树中"与"我知道 secret/nullifier"；它不证明存款金额、
//   时间或地址，这些信息必须由协议层（固定面额、时间延迟、relayer）处理。

include "circomlib/circuits/poseidon.circom";

template MerkleProof(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    signal current[depth + 1];
    signal left[depth];
    signal right[depth];

    current[0] <== leaf;

    component hashers[depth];

    for (var i = 0; i < depth; i++) {
        // pathIndices[i] 必须是 0 或 1：0 表示当前节点在左，1 表示在右
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        left[i] <== current[i] * (1 - pathIndices[i]) + pathElements[i] * pathIndices[i];
        right[i] <== pathElements[i] * (1 - pathIndices[i]) + current[i] * pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        current[i + 1] <== hashers[i].out;
    }

    root === current[depth];
}

template Withdrawal(depth) {
    // 私有输入：秘密、路径
    signal input secret;
    signal input nullifier;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    // 公开输入：存款树的根
    signal input root;

    // 公开输出：nullifier 哈希，合约用它防止同一笔存款被取两次
    signal output nullifierHash;

    component leafHash = Poseidon(2);
    leafHash.inputs[0] <== secret;
    leafHash.inputs[1] <== nullifier;

    component proof = MerkleProof(depth);
    proof.leaf <== leafHash.out;
    proof.root <== root;
    for (var i = 0; i < depth; i++) {
        proof.pathElements[i] <== pathElements[i];
        proof.pathIndices[i] <== pathIndices[i];
    }

    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash <== nullifierHasher.out;
}

// root 是公开输入；nullifierHash 是 output，自动公开
component main {public [root]} = Withdrawal(20);
