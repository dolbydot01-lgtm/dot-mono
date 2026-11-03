// merkle.hpp —— 带域分离的二叉 Merkle 树（RFC 6962 风格）
//   叶子哈希：H(0x00 || data)      内部节点：H(0x01 || left || right)
// 域分离防止"把内部节点伪装成叶子"的第二原像攻击。
// 奇数个节点时：最后一个节点直接提升到上一层（不复制），避免比特币 CVE-2012-2459 式的歧义。
#pragma once
#include <stdexcept>
#include <vector>

#include "sha256.hpp"

namespace edu {

struct ProofStep {
    Digest sibling;
    bool siblingOnLeft;  // true: parent = H(0x01 || sibling || cur)
};

class MerkleTree {
public:
    explicit MerkleTree(const std::vector<std::string>& leaves) {
        if (leaves.empty()) throw std::invalid_argument("no leaves");
        std::vector<Digest> level;
        for (const auto& d : leaves) level.push_back(leafHash(d));
        levels_.push_back(level);
        while (levels_.back().size() > 1) {
            const auto& cur = levels_.back();
            std::vector<Digest> next;
            for (size_t i = 0; i < cur.size(); i += 2) {
                if (i + 1 < cur.size()) next.push_back(nodeHash(cur[i], cur[i + 1]));
                else next.push_back(cur[i]);  // 奇数：提升
            }
            levels_.push_back(next);
        }
    }

    const Digest& root() const { return levels_.back()[0]; }
    size_t height() const { return levels_.size() - 1; }

    // 生成第 index 个叶子的包含证明：自底向上的兄弟节点序列
    std::vector<ProofStep> prove(size_t index) const {
        if (index >= levels_[0].size()) throw std::out_of_range("index");
        std::vector<ProofStep> proof;
        for (size_t lv = 0; lv + 1 < levels_.size(); ++lv) {
            const auto& cur = levels_[lv];
            size_t sib = index ^ 1;  // 兄弟节点下标：翻转最低位
            if (sib < cur.size()) proof.push_back({cur[sib], (index & 1) == 1});
            // 若无兄弟（被提升的奇数节点），这一层不产生证明步骤
            index >>= 1;
        }
        return proof;
    }

    static bool verify(const std::string& leafData, const std::vector<ProofStep>& proof, const Digest& root) {
        Digest cur = leafHash(leafData);
        for (const auto& st : proof)
            cur = st.siblingOnLeft ? nodeHash(st.sibling, cur) : nodeHash(cur, st.sibling);
        return cur == root;
    }

    static Digest leafHash(const std::string& data) {
        SHA256 h;
        uint8_t prefix = 0x00;
        h.update(&prefix, 1);
        h.update(data);
        return h.finalize();
    }
    static Digest nodeHash(const Digest& l, const Digest& r) {
        SHA256 h;
        uint8_t prefix = 0x01;
        h.update(&prefix, 1);
        h.update(l.data(), 32);
        h.update(r.data(), 32);
        return h.finalize();
    }

private:
    std::vector<std::vector<Digest>> levels_;
};

}  // namespace edu
