// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// 参考合约：一个最小 ERC-4337 智能账户（仅阅读，未在本机编译/测试）。
//
// 它展示 4337 的两个核心入口：
//   1. EntryPoint 调用 validateUserOp：验证签名，并为缺失的 prefund 付款；
//   2. EntryPoint 在验证通过后调用 execute：执行用户真正的 callData。
//
// 真实实现还需要：EIP-712 userOpHash、ERC-1271 合约签名、2D nonce、
// 初始化（initCode / factory）、Paymaster 交互、升级与恢复逻辑、重入保护。
// 生产环境请使用经过审计的实现（如 Safe、Alchemy Modular Account、Coinbase Smart Wallet）。

struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits;
    uint256 preVerificationGas;
    bytes32 gasFees;
    bytes paymasterAndData;
    bytes signature;
}

interface IAccount {
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}

interface IEntryPoint {
    function depositTo(address account) external payable;
    function withdrawTo(address payable withdrawAddress, uint256 amount) external;
}

contract MinimalAccount4337 is IAccount {
    IEntryPoint public immutable entryPoint;
    address public owner;
    uint256 public constant SIG_VALIDATION_FAILED = 1;

    error NotEntryPoint();
    error NotOwner();
    error PrefundFailed();
    error ExecutionFailed();

    event Executed(address indexed target, uint256 value, bytes data);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert NotEntryPoint();
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        if (msg.sender != owner && msg.sender != address(entryPoint)) revert NotOwner();
        _;
    }

    constructor(address _entryPoint, address _owner) {
        entryPoint = IEntryPoint(_entryPoint);
        owner = _owner;
    }

    receive() external payable {}

    /// @notice EntryPoint 在验证阶段调用。返回 0 表示签名有效，1 表示失败。
    /// @dev missingAccountFunds 是账户应补交给 EntryPoint 的 prefund 差额。
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        if (!_isValidSignature(userOpHash, userOp.signature)) {
            return SIG_VALIDATION_FAILED;
        }
        if (missingAccountFunds != 0) {
            (bool ok, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            if (!ok) revert PrefundFailed();
        }
        return 0;
    }

    /// @notice 执行一笔调用。真实账户通常会把 callData 解成批量操作并做权限检查。
    function execute(address target, uint256 value, bytes calldata data)
        external
        onlyOwnerOrEntryPoint
    {
        (bool ok, ) = target.call{value: value}(data);
        if (!ok) revert ExecutionFailed();
        emit Executed(target, value, data);
    }

    /// @notice EIP-7702 委托场景下，EOA 的代码会在这个合约的上下文里运行；
    /// 因此所有入口都必须检查 msg.sender，不能假设调用者一定是 EntryPoint 或 owner。
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwnerOrEntryPoint {
        require(targets.length == values.length && targets.length == datas.length, "length");
        for (uint256 i = 0; i < targets.length; i++) {
            (bool ok, ) = targets[i].call{value: values[i]}(datas[i]);
            if (!ok) revert ExecutionFailed();
            emit Executed(targets[i], values[i], datas[i]);
        }
    }

    function setOwner(address newOwner) external onlyOwnerOrEntryPoint {
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function withdrawDepositTo(address payable to, uint256 amount) external onlyOwnerOrEntryPoint {
        entryPoint.withdrawTo(to, amount);
    }

    /// @dev 教学版 ECDSA 验证：65 字节 (r, s, v)，对 userOpHash 直接 ecrecover。
    /// 生产实现应使用 EIP-712 + ERC-1271 + low-s 检查，并防止签名延展性。
    function _isValidSignature(bytes32 hash, bytes calldata signature)
        internal
        view
        returns (bool)
    {
        if (signature.length != 65) return false;
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        address recovered = ecrecover(hash, v, r, s);
        return recovered != address(0) && recovered == owner;
    }
}
