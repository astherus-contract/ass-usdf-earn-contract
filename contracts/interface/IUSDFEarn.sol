// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './IAsERC20.sol';

interface IUSDFEarn {
    function USDT() external view returns (IERC20);
    function USDF() external view returns (IAsERC20);
    function deposit(uint256 amountIn) external;
}
