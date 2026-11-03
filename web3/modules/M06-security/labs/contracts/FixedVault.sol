// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FixedVault —— 一次性初始化
/// @notice initialize 只能成功一次；实现合约自身在 constructor 中锁死，
///         防止攻击者直接初始化实现合约（进而通过 delegatecall 影响代理）。
contract FixedVault {
    address public owner;
    uint256 public feeBps;
    bool private initialized;

    error AlreadyInitialized();
    error NotOwner();

    constructor() {
        // 让实现合约本身不可初始化；代理会用自己的 storage 调用 initialize。
        initialized = true;
    }

    function initialize(address owner_) external {
        if (initialized) revert AlreadyInitialized();
        initialized = true;
        owner = owner_;
    }

    function setFee(uint256 newFeeBps) external {
        if (msg.sender != owner) revert NotOwner();
        feeBps = newFeeBps;
    }
}
