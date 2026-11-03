// Lab 1.1 —— 哈希函数与 Merkle 树（C++17，无第三方依赖）
// 编译运行：c++ -std=c++17 -O2 -Wall main.cpp -o lab1 && ./lab1
#include <cmath>
#include <iomanip>
#include <iostream>
#include <random>
#include <unordered_map>

#include "merkle.hpp"
#include "sha256.hpp"

using namespace edu;

static void check(bool ok, const std::string& what) {
    std::cout << (ok ? "  [PASS] " : "  [FAIL] ") << what << "\n";
    if (!ok) std::exit(1);
}

// ── 1. 用 NIST 标准测试向量验证我们的 SHA-256 ─────────────────────────
void testSha256() {
    std::cout << "\n== 1. SHA-256 测试向量 ==\n";
    check(toHex(SHA256::hash("")) ==
              "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "SHA256(\"\")");
    check(toHex(SHA256::hash("abc")) ==
              "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA256(\"abc\")");
    check(toHex(SHA256::hash("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")) ==
              "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1", "SHA256(448-bit msg)");
    check(toHex(SHA256::hash(std::string(1000000, 'a'))) ==
              "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0", "SHA256(10^6 x 'a')");
}

// ── 2. 雪崩效应：改 1 个比特，约一半输出比特翻转 ──────────────────────
void avalanche() {
    std::cout << "\n== 2. 雪崩效应 ==\n";
    auto a = SHA256::hash("Web3 course");
    auto b = SHA256::hash("Web3 coursf");  // 'e'(0x65) -> 'f'(0x66)：仅最后一字节变化
    int diff = 0;
    for (int i = 0; i < 32; ++i) diff += __builtin_popcount(a[i] ^ b[i]);
    std::cout << "  H(\"Web3 course\") = " << toHex(a) << "\n"
              << "  H(\"Web3 coursf\") = " << toHex(b) << "\n"
              << "  翻转比特数: " << diff << " / 256  (期望约 128)\n";
}

// ── 3. 生日攻击：对截断到 n 位的哈希找碰撞，期望约 2^{n/2} 次 ───────────
void birthday(int nbits) {
    uint64_t mask = (nbits == 64) ? ~0ULL : ((1ULL << nbits) - 1);
    std::unordered_map<uint64_t, uint64_t> seen;
    for (uint64_t i = 0;; ++i) {
        auto d = SHA256::hash("msg-" + std::to_string(i));
        uint64_t t = 0;
        for (int k = 0; k < 8; ++k) t = (t << 8) | d[k];
        t &= mask;
        auto it = seen.find(t);
        if (it != seen.end()) {
            double expect = std::sqrt(M_PI / 2 * std::pow(2.0, nbits));
            std::cout << "  n=" << std::setw(2) << nbits << " 位: 第 " << std::setw(8) << i + 1
                      << " 次找到碰撞 (msg-" << it->second << ", msg-" << i << ")"
                      << "   理论期望 ≈ " << std::fixed << std::setprecision(0) << expect << "\n";
            return;
        }
        seen[t] = i;
    }
}

// ── 4. Merkle 树：构建、证明、验证、篡改检测 ─────────────────────────
void merkle() {
    std::cout << "\n== 4. Merkle 树 ==\n";
    std::vector<std::string> txs;
    for (int i = 0; i < 13; ++i) txs.push_back("tx#" + std::to_string(i) + ": Alice -> Bob " + std::to_string(i) + " ETH");
    MerkleTree tree(txs);
    std::cout << "  叶子数 = " << txs.size() << ", 树高 = " << tree.height()
              << ", root = " << toHex(tree.root()) << "\n";

    bool all = true;
    size_t maxLen = 0;
    for (size_t i = 0; i < txs.size(); ++i) {
        auto p = tree.prove(i);
        maxLen = std::max(maxLen, p.size());
        all &= MerkleTree::verify(txs[i], p, tree.root());
    }
    check(all, "全部 13 个叶子的包含证明均通过");
    std::cout << "  最长证明 = " << maxLen << " 个哈希  (ceil(log2 13) = 4)\n";

    auto p7 = tree.prove(7);
    check(!MerkleTree::verify("tx#7: Alice -> Bob 700 ETH", p7, tree.root()), "篡改叶子内容后证明失败");
    p7[0].sibling[0] ^= 1;
    check(!MerkleTree::verify(txs[7], p7, tree.root()), "篡改证明路径后验证失败");

    // 规模感受：100 万笔交易的证明只需 20 个哈希 = 640 字节
    std::cout << "  若有 2^20 ≈ 100 万个叶子：证明长度 = 20 个哈希 = " << 20 * 32 << " 字节\n";
}

int main() {
    testSha256();
    avalanche();
    std::cout << "\n== 3. 生日攻击（截断哈希）==\n";
    for (int n : {16, 24, 32, 40}) birthday(n);
    std::cout << "  → 完整 256 位需要约 2^128 次：以全球算力也不可行\n";
    merkle();
    return 0;
}
