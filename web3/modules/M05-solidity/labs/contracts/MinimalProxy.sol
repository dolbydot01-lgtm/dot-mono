// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MinimalProxy —— EIP-1167 最小代理（clone）
/// @notice 部署一段固定字节码，所有调用都 delegatecall 到 implementation。
///         逻辑合约的 storage 布局就是代理的 storage 布局；逻辑合约必须提供
///         initialize()，且不能被实现合约的 constructor 初始化。
contract MinimalProxy {
    error CloneFailed();

    /// @notice 部署一个指向 implementation 的最小代理。
    /// @dev 部署后的代理地址的 code 是 45 字节的 EIP-1167 runtime。
    function clone(address implementation) external returns (address instance) {
        bytes memory bytecode = abi.encodePacked(
            // creation code：把 runtime 复制到内存并返回
            hex"3d602d80600a3d3981f3",
            // runtime：calldatacopy; calldatasize; calldatacopy; delegatecall; returndatacopy; return
            hex"363d3d373d3d3d363d73",
            implementation,
            hex"5af43d82803e903d91602b57fd5bf3"
        );
        assembly {
            instance := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        if (instance == address(0)) revert CloneFailed();
    }

    /// @notice 用 CREATE2 在可预测地址部署克隆（可选扩展）。
    function cloneDeterministic(address implementation, bytes32 salt)
        external
        returns (address instance)
    {
        bytes memory bytecode = abi.encodePacked(
            hex"3d602d80600a3d3981f3",
            hex"363d3d373d3d3d363d73",
            implementation,
            hex"5af43d82803e903d91602b57fd5bf3"
        );
        assembly {
            instance := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        if (instance == address(0)) revert CloneFailed();
    }
}
