// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./interface/IAsERC20.sol";
import "./libraries/Withdrawable.sol";
import "./interface/IWithdrawVault.sol";
import "./interface/IAsUSDFEarn.sol";

contract asUSDFEarn is Initializable, PausableUpgradeable, AccessControlEnumerableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable, Withdrawable, IAsUSDFEarn {
    using Address for address payable;
    using SafeERC20 for IERC20;
    using SafeERC20 for IAsERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");
    bytes32 public constant REWARD_ROLE = keccak256("REWARD_ROLE");

    uint256 public constant EXCHANGE_PRICE_DECIMALS = 1e18;

    event AddToken(IERC20 indexed asUSDF, IERC20 indexed USDF);
    event UpdateUSDFDepositEnabled(bool oldUSDFDepositEnabled, bool newUSDFDepositEnabled);
    event UpdateMaxRewardPercent(uint oldValue, uint newValue);
    event MintasUSDF(address indexed sender, IERC20 indexed USDFAddress, IERC20 indexed asUSDFAddress, uint256 amountIn, uint256 asUSDFAmount, uint256 exchangePrice);
    event RewardDispatched(uint amount, uint startTime, uint period);

    address public immutable TIMELOCK_ADDRESS;
    IAsERC20 public immutable USDF;
    IAsERC20 public immutable asUSDF;
    uint256 public immutable VESTING_PERIOD;

    bool public USDFDepositEnabled;
    uint public lastDispatchTime;
    uint public lastReward;
    uint public maxRewardPercent;

    constructor(address _timeLockAddress, IAsERC20 _USDF, IAsERC20 _asUSDF, IWithdrawVault _withdrawVault, uint _vestingPeriod) 
        Withdrawable(_USDF, _asUSDF, _withdrawVault)
    {
        require(_timeLockAddress != address(0), "timeLockAddress cannot be a zero address");
        require(address(_USDF) != address(0), "USDFAddress cannot be a zero address");
        require(address(_asUSDF) != address(0), "asUSDFAddress cannot be a zero address");

        TIMELOCK_ADDRESS = _timeLockAddress;
        USDF = _USDF;
        asUSDF = _asUSDF;
        VESTING_PERIOD = _vestingPeriod;
        _disableInitializers();
    }

    modifier onlyTimeLock() {
        require(msg.sender == TIMELOCK_ADDRESS, "only time lock");
        _;
    }

    modifier onlyAdmin() override(Withdrawable) {
        require(hasRole(ADMIN_ROLE, msg.sender), "only admin");
        _;
    }

    function initialize(address admin) initializer public {
        __Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, TIMELOCK_ADDRESS);
        // do some initialize and will renounce after initialize
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSE_ROLE, admin);
        USDFDepositEnabled = true;

        emit AddToken(asUSDF, USDF);
    }

    function _authorizeUpgrade(address newImplementation) internal onlyTimeLock override {}

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function updateDepositEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        bool oldUSDFDepositEnabled = USDFDepositEnabled;
        require(oldUSDFDepositEnabled != enabled, "newUSDFDepositEnabled can not be equal oldUSDFDepositEnabled");

        USDFDepositEnabled = enabled;
        emit UpdateUSDFDepositEnabled( oldUSDFDepositEnabled, USDFDepositEnabled);
    }

    function updateMaxRewardPercent(uint newValue) external onlyRole(ADMIN_ROLE) {
        uint oldValue = maxRewardPercent;
        require(oldValue != newValue, "already set");
        maxRewardPercent = newValue;
        emit UpdateMaxRewardPercent(oldValue, newValue);
    }

    function deposit(uint256 amountIn) external nonReentrant whenNotPaused {
        _mintasUSDF(amountIn);
    }


    function _mintasUSDF(uint256 amountIn) private {
        require(USDFDepositEnabled, "Deposit is paused");
        require(amountIn > 0, "invalid amount");

        //getting exchange price must be in front of transferToVault.
        uint256 exchange_price = exchangePrice();

        amountIn = _transferToVault(msg.sender, USDF, amountIn);
        uint256 asUSDFAmount = amountIn * EXCHANGE_PRICE_DECIMALS / exchange_price;
        require(asUSDFAmount > 0, "invalid amount");

        asUSDF.mint(msg.sender, asUSDFAmount);
        emit MintasUSDF(msg.sender, USDF, asUSDF, amountIn, asUSDFAmount, exchange_price);
    }


    function _transferToVault(address from, IERC20 token, uint256 amount) private returns (uint256){
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        return token.balanceOf(address(this)) - before;
    }

    function getUnvestedAmount() public view returns (uint) {
        uint256 timeSinceLastDistribution = block.timestamp - lastDispatchTime;
        if (timeSinceLastDistribution >= VESTING_PERIOD) {
            return 0;
        }
        uint256 deltaT;
        unchecked {
            deltaT = (VESTING_PERIOD - timeSinceLastDistribution);
        }
        return (deltaT * lastReward) / VESTING_PERIOD;
    }

    function exchangePrice() public view returns (uint256) {
        uint256 USDFBalance = USDF.balanceOf(address(this)) - getUnvestedAmount();
        uint256 totalSupply = asUSDF.totalSupply();
        if (totalSupply <= 0 || USDFBalance <= 0){
            return EXCHANGE_PRICE_DECIMALS;
        }
        return Math.mulDiv(USDFBalance,EXCHANGE_PRICE_DECIMALS,totalSupply);
    }

    function requestWithdraw(uint256 amount) external nonReentrant whenNotPaused {
        uint price = exchangePrice();
        uint USDFAmount = amount * price / EXCHANGE_PRICE_DECIMALS;
        USDF.safeTransfer(address(WITHDRAW_VAULT), USDFAmount);
        Withdrawable._doRequestWithdraw(amount, USDFAmount, price, false);
        asUSDF.burn(address(this), amount);
    }
    
    function requestEmergencyWithdraw(uint256 amount) external nonReentrant whenNotPaused {
        uint price = exchangePrice();
        uint USDFAmount = amount * price / EXCHANGE_PRICE_DECIMALS;
        USDF.safeTransfer(address(WITHDRAW_VAULT), USDFAmount);
        Withdrawable._doRequestWithdraw(amount, USDFAmount, price, true);
        asUSDF.burn(address(this), amount);
    }

    function distributeWithdraw(DistributeWithdrawInfo[] calldata distributeWithdrawInfoList)  external nonReentrant whenNotPaused onlyRole(BOT_ROLE) {
        Withdrawable._distributeWithdraw(distributeWithdrawInfoList, false);
    }

    function claimWithdraw(uint256[] calldata requestWithdrawNos) external nonReentrant whenNotPaused {
        Withdrawable._claimWithdraw(requestWithdrawNos);
    }

    function dispatchReward(uint amount) external nonReentrant onlyRole(REWARD_ROLE) {
        //限制最大值，USDF发行量的百分比
        if (getUnvestedAmount() > 0) {
            return;
        }
        require(amount <= USDF.totalSupply() * maxRewardPercent / EXCHANGE_PRICE_DECIMALS, "too much");
        lastDispatchTime = block.timestamp;
        USDF.safeTransferFrom(msg.sender, address(this), amount);
        lastReward = amount;
        emit RewardDispatched(amount, block.timestamp, VESTING_PERIOD);
    }
}
