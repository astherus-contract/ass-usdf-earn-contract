// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interface/IWithdrawVault.sol";
import "./interface/IWithdrawable.sol";
import "./interface/IAsERC20.sol";
import "./interface/IUSDFEarn.sol";
import "./interface/IAsUSDFEarn.sol";

contract RewardDispatcher is Initializable, AccessControlEnumerableUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IAsERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");

    address public immutable TIMELOCK_ADDRESS;
    IUSDFEarn public immutable USDFEarn;
    IAsUSDFEarn public immutable AsUSDFEarn;
    IERC20 immutable USDT;
    IAsERC20 immutable USDF;
    IAsERC20 immutable asUSDF;

    constructor(address _timeLock, IUSDFEarn _USDFEarn, IAsUSDFEarn _AsUSDFEarn) {
        TIMELOCK_ADDRESS = _timeLock;
        USDFEarn = _USDFEarn;
        AsUSDFEarn = _AsUSDFEarn;
        USDT = _USDFEarn.USDT();
        require(_AsUSDFEarn.USDF() == _USDFEarn.USDF(), "earn not match");
        USDF = _USDFEarn.USDF();
        asUSDF = _AsUSDFEarn.asUSDF();
        _disableInitializers();
    }

    function initialize(address _admin, address _deployer, address _bot) initializer public {
        __Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, TIMELOCK_ADDRESS);
        // the deployer do some init afther deploy contract
        // and then renounce the permission
        _grantRole(DEFAULT_ADMIN_ROLE, _deployer);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(PAUSE_ROLE, _admin);
        if (_bot != address(0)) {
            grantRole(BOT_ROLE, _bot);
        }
    }

    modifier onlyTimeLock() {
        require(msg.sender == TIMELOCK_ADDRESS, "only time lock");
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal onlyTimeLock override {}

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function mintReward(uint amount) external onlyRole(BOT_ROLE) {
        USDT.forceApprove(address(USDFEarn), amount);
        USDFEarn.deposit(amount);
        USDT.forceApprove(address(USDFEarn), 0);
    }

    function dispatchReward(uint amount) external onlyRole(BOT_ROLE) {
        USDF.forceApprove(address(AsUSDFEarn), amount);
        AsUSDFEarn.dispatchReward(amount);
        USDF.forceApprove(address(AsUSDFEarn), 0);
    }
}
