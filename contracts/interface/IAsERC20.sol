// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IAsERC20 is IERC20 {

    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;

}
