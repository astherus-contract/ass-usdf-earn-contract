// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './IAsERC20.sol';

interface IAsUSDFEarn {
    function USDF() external view returns (IAsERC20);
    function asUSDF() external view returns (IAsERC20);
    function dispatchReward(uint amount) external;
    function deposit(uint256 amountIn) external;
}
