// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWithdrawable {

    struct RequestWithdrawInfo {
        IERC20 withdrawToken;
        uint256 withdrawAmount;
        uint256 receiveAmount;
        uint256 withdrawTime;
        uint256 exchangePrice;
        bool claimable;
        address receipt;
        bool emergency;
    }

    struct DistributeWithdrawInfo {
        IERC20 withdrawToken;
        uint256 requestWithdrawNo;
        address receipt;
    }

    event RequestWithdraw(address indexed sender, IERC20 indexed token, uint256 amount, uint256 requestWithdrawNo, bool emergency);
    event DistributeWithdraw(
        IERC20 indexed withdrawToken, 
        IERC20 indexed receiveToken, 
        uint256 withdrawAmount, 
        uint256 receiveAmount, 
        uint256 requestWithdrawNo
    );
    event ClaimWithdraw(
        address indexed sender, 
        IERC20 indexed withdrawToken, 
        IERC20 indexed receiveToken, 
        uint256 withdrawAmount, 
        uint256 receiveAmount, 
        uint256 requestWithdrawNo
    );

    event UpdateWithdrawEnabled(bool oldValue, bool newValue);
    event UpdateEmergencyWithdrawEnabled(bool oldValue, bool newValue);
    event AddEmergencyWithdrawWhitelist(address indexed sender, address indexed user);
    event RemoveEmergencyWithdrawWhitelist(address indexed sender, address indexed user);

    function requestWithdraw(uint256 amount) external;
    function requestEmergencyWithdraw(uint256 amount) external;
    function distributeWithdraw(DistributeWithdrawInfo[] calldata distributeWithdrawInfoList)  external;
    function claimWithdraw(uint256[] calldata requestWithdrawNos) external;
}
