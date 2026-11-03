// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FixedBank —— 重入修复：Checks-Effects-Interactions + nonReentrant
/// @notice 两道防线互相独立：
///         1) 先扣账本再外部调用（CEI），回调时余额已经是 0；
///         2) nonReentrant 锁在入口拒绝嵌套调用。
contract FixedBank {
    mapping(address => uint256) public balances;

    uint256 private locked = 1; // 1 = 未锁定，2 = 已锁定

    error ReentrantCall();
    error InsufficientBalance(uint256 available, uint256 required);
    error TransferFailed();

    modifier nonReentrant() {
        if (locked != 1) revert ReentrantCall();
        locked = 2;
        _;
        locked = 1;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external nonReentrant {
        uint256 available = balances[msg.sender];
        if (amount == 0 || amount > available) {
            revert InsufficientBalance(available, amount);
        }

        // Effects：先更新状态。
        balances[msg.sender] = available - amount;

        // Interactions：最后才把控制权交出去。
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
