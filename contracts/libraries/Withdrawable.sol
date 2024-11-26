// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interface/IWithdrawVault.sol";
import "../interface/IWithdrawable.sol";
import "../interface/IAsERC20.sol";

abstract contract Withdrawable is IWithdrawable {

    using SafeERC20 for IERC20;
    using SafeERC20 for IAsERC20;

    IERC20 immutable sourceToken;
    IAsERC20 immutable asToken;
    IWithdrawVault public immutable WITHDRAW_VAULT;

    bytes32 constant STORAGE_POSITION = keccak256("as.usdt.storage");

    struct Storage {
        bool withdrawEnabled;
        bool emergencyWithdrawEnabled;
        uint256 requestWithdrawMaxNo;
        mapping(address => bool) emergencyWithdrawWhitelist;
        mapping(uint256 => RequestWithdrawInfo) requestWithdraws;
    }

    function getStorage() internal pure returns (Storage storage st) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            st.slot := position
        }
    }

    constructor(IERC20 _sourceToken, IAsERC20 _asToken, IWithdrawVault _withdrawVault) {
        sourceToken = _sourceToken;
        asToken = _asToken;
        WITHDRAW_VAULT = _withdrawVault;
    }

    function _doRequestWithdraw(uint amount, uint receiveAmount,  uint exchangePrice, bool emergency) internal {
        Storage storage st = getStorage();
        require(st.withdrawEnabled == true, "withdraw paused");
        require(amount > 0, "invalid amount");
        if (emergency) {
            require(
                st.emergencyWithdrawEnabled || st.emergencyWithdrawWhitelist[msg.sender], 
                "not support emergency withdraw"
            );
        }

        asToken.safeTransferFrom(msg.sender, address(this), amount);

        RequestWithdrawInfo memory requestWithdrawInfo = RequestWithdrawInfo({
            withdrawToken: asToken,
            withdrawAmount: amount,
            receiveAmount: receiveAmount,
            withdrawTime: block.timestamp,
            exchangePrice: exchangePrice,
            claimable: false,
            receipt: msg.sender,
            emergency: emergency
        });
        st.requestWithdrawMaxNo += 1;
        st.requestWithdraws[st.requestWithdrawMaxNo] = requestWithdrawInfo;

        emit RequestWithdraw(msg.sender, asToken, amount, st.requestWithdrawMaxNo, emergency);
    }

    function _distributeWithdraw(DistributeWithdrawInfo[] calldata distributeWithdrawInfoList, bool doBurn) internal {
        Storage storage st = getStorage();
        require(st.withdrawEnabled == true, "withdraw paused");
        for (uint i = 0; i < distributeWithdrawInfoList.length; i ++) {
            DistributeWithdrawInfo calldata distributeWithdrawInfo = distributeWithdrawInfoList[i];

            RequestWithdrawInfo memory requestWithdrawInfo = st.requestWithdraws[distributeWithdrawInfo.requestWithdrawNo];

            require(
                requestWithdrawInfo.withdrawToken == distributeWithdrawInfo.withdrawToken && 
                requestWithdrawInfo.receipt == distributeWithdrawInfo.receipt, 
                "unmatched request"
            );
            require(!requestWithdrawInfo.claimable, "already distribute");
            requestWithdrawInfo.claimable = true;

            st.requestWithdraws[distributeWithdrawInfo.requestWithdrawNo] = requestWithdrawInfo;
            if (doBurn) {
                asToken.burn(address(this), requestWithdrawInfo.withdrawAmount);
            }

            emit DistributeWithdraw(
                asToken, 
                sourceToken, 
                requestWithdrawInfo.withdrawAmount, 
                requestWithdrawInfo.receiveAmount, 
                distributeWithdrawInfo.requestWithdrawNo
            );
        }
    }

    function _claimWithdraw(uint256[] calldata requestWithdrawNos) internal {
        Storage storage st = getStorage();
        require(st.withdrawEnabled == true, "withdraw paused");
        for (uint i = 0; i < requestWithdrawNos.length; i ++) {
            uint256 requestWithdrawNo = requestWithdrawNos[i];
            RequestWithdrawInfo memory requestWithdrawInfo = st.requestWithdraws[requestWithdrawNo];
            require(requestWithdrawInfo.receiveAmount > 0 && requestWithdrawInfo.claimable, "not available");
            require(requestWithdrawInfo.receipt == msg.sender, "illegal sender");

            delete st.requestWithdraws[requestWithdrawNo];

            WITHDRAW_VAULT.transfer(msg.sender, sourceToken, requestWithdrawInfo.receiveAmount);

            emit ClaimWithdraw(
                msg.sender, 
                asToken, 
                sourceToken, 
                requestWithdrawInfo.withdrawAmount, 
                requestWithdrawInfo.receiveAmount, 
                requestWithdrawNo
            );
        }
    }

    function withdrawEnabled() external view returns (bool) {
        return getStorage().withdrawEnabled;
    }

    function emergencyWithdrawEnabled() external view returns (bool) {
        return getStorage().emergencyWithdrawEnabled;
    }

    function requestWithdrawMaxNo() external view returns (uint) {
        return getStorage().requestWithdrawMaxNo;
    }

    function emergencyWithdrawWhitelist(address user) external view returns (bool) {
        return getStorage().emergencyWithdrawWhitelist[user];
    }

    function requestWithdraws(uint requestWithdrawNo) external view returns (RequestWithdrawInfo memory) {
        return getStorage().requestWithdraws[requestWithdrawNo];
    }

    modifier onlyAdmin() virtual;

    function updateWithdrawEnabled(bool enabled) external onlyAdmin {
        Storage storage st = getStorage();        
        bool oldWithdrawEnabled = st.withdrawEnabled;
        require(oldWithdrawEnabled != enabled, "already set");
        st.withdrawEnabled = enabled;
        emit UpdateWithdrawEnabled(oldWithdrawEnabled, enabled);
    }

    function updateEmergencyWithdrawEnabled(bool enabled) external onlyAdmin {
        Storage storage st = getStorage();        
        bool oldEmergencyWithdrawEnabled = st.emergencyWithdrawEnabled;
        require(oldEmergencyWithdrawEnabled != enabled, "already set");
        st.emergencyWithdrawEnabled = enabled;
        emit UpdateEmergencyWithdrawEnabled(oldEmergencyWithdrawEnabled, enabled);
    }

    function addEmergencyWithdrawWhitelist(address[] calldata users) external onlyAdmin {
        Storage storage st = getStorage();        
        for (uint256 i = 0; i < users.length; i++) {
            st.emergencyWithdrawWhitelist[users[i]] = true;
            emit AddEmergencyWithdrawWhitelist(msg.sender, users[i]);
        }
    }

    function removeEmergencyWithdrawWhitelist(address[] memory users) external onlyAdmin {
        Storage storage st = getStorage();        
        for (uint256 i = 0; i < users.length; i++) {
            delete st.emergencyWithdrawWhitelist[users[i]];
            emit RemoveEmergencyWithdrawWhitelist(msg.sender, users[i]);
        }
    }
}
