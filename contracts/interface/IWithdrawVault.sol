// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWithdrawVault {

    event ReceiveETH(address indexed from, address indexed to, uint256 amount);
    event TransferNative(address receipt, uint256 amount);
    event Transfer(address receipt, IERC20 token, uint256 amount);

    function transfer(address receipt, IERC20 token, uint256 amount) external;
    function transferNative(address receipt, uint256 amount) external;

}
