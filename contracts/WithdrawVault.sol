// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interface/IWithdrawVault.sol";


contract WithdrawVault is Initializable, PausableUpgradeable, AccessControlEnumerableUpgradeable, UUPSUpgradeable, IWithdrawVault, ReentrancyGuardUpgradeable {
    using Address for address payable;
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    address public immutable TIMELOCK_ADDRESS;

    constructor(address timelockAddress) {
        require(timelockAddress != address(0), "timelockAddress cannot be a zero address");
        TIMELOCK_ADDRESS = timelockAddress;
        _disableInitializers();
    }

    function initialize(address admin, address deployer) initializer public {
        __Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, TIMELOCK_ADDRESS);
        // temporarily give the deployer DEFAULT_ADMIN_ROLE
        // for the deployer need grant TRANSFER_ROLE to other contract
        // after that, deployer will renounce DEFAULT_ADMIN_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, deployer);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSE_ROLE, admin);
    }

    receive() external payable {
        if (msg.value > 0) {
            emit ReceiveETH(msg.sender, address(this), msg.value);
        }
    }

    modifier onlyTimeLock() {
        require(msg.sender == TIMELOCK_ADDRESS, "only time lock");
        _;
    }

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal onlyTimeLock override {}

    function transferNative(address receipt, uint256 amount) external nonReentrant whenNotPaused onlyRole(TRANSFER_ROLE) {
        require(amount > 0, "invalid amount");
        payable(receipt).sendValue(amount);
        emit TransferNative(receipt, amount);
    }

    function transfer(address receipt, IERC20 token, uint256 amount) external nonReentrant whenNotPaused onlyRole(TRANSFER_ROLE) {
        require(amount > 0, "invalid amount");
        token.safeTransfer(receipt, amount);
        emit Transfer(receipt, token, amount);
    }

    function balance(IERC20 currency) external view returns (uint256) {
        return currency.balanceOf(address(this));
    }
}
