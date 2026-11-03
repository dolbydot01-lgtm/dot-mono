// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VulnVault —— 未受保护的初始化函数（教学用）
/// @notice 任何人只要抢在部署者之前调用 init，就能成为 owner。
///         代理模式下这是高发漏洞：实现合约的 constructor 不会在代理的
///         storage 上执行，初始化必须由 initialize 完成，而 initialize 必须防重入。
contract VulnVault {
    address public owner;
    uint256 public feeBps;

    function init(address owner_) external {
        owner = owner_;
    }

    function setFee(uint256 newFeeBps) external {
        require(msg.sender == owner, "not owner");
        feeBps = newFeeBps;
    }
}
