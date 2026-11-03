// SPDX-License-Identifier: MIT
pragma circom 2.1.6;

// 与 Lab 14.2 第 1 节同一个电路：t = x*x; z = t + y
// 约束：
//   1) x · x = t
//   2) (t + y) · 1 = z
// 在 Circom 中，<== 同时完成赋值与约束；乘法门自动生成 R1CS 约束。
//
// 仅作阅读参考（本机未安装 circom）：
//   circom qap-demo.circom --r1cs --wasm --sym

template QapDemo() {
    signal input x;
    signal input y;
    signal output z;

    signal t;

    t <== x * x;   // 约束 1
    z <== t + y;   // 约束 2（加法本身不增加乘法约束）
}

component main = QapDemo();
