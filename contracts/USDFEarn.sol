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

import "./interface/IAsERC20.sol";
import "./libraries/Withdrawable.sol";
import "./interface/IWithdrawVault.sol";
import "./interface/IUSDFEarn.sol";
import "./interface/IAsUSDFEarn.sol";

contract USDFEarn is Initializable, PausableUpgradeable, AccessControlEnumerableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable, Withdrawable, IUSDFEarn {

    using Address for address payable;
    using SafeERC20 for IERC20;
    using SafeERC20 for IAsERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");

    event UpdateUSDTDepositEnabled(bool oldUSDTDepositEnabled, bool newUSDTDepositEnabled);
    event UpdateUSDFMaxSupply(uint256 oldUSDFMaxSupply, uint256 newUSDFMaxSupply);
    event UpdateCommissionRate(uint256 oldCommissionRate, uint256 newCommissionRate);
    event UpdateBurnCommissionRate(uint256 oldCommissionRate, uint256 newCommissionRate);
    event UpdateCeffuAddress(address oldCeffuAddress, address newCeffuAddress);
    event UpdateTransferToCeffuEnabled(bool oldTransferToCeffuEnabled, bool newTransferToCeffuEnabled);
    event TransferToCeffu(IERC20 indexed token, uint256 USDTAmount, address ceffuAddress);
    event MintUSDF(address indexed sender, IERC20 indexed USDT, IERC20 indexed USDF, uint256 amountIn, uint256 USDFAmount);


    address public immutable TIMELOCK_ADDRESS;
    IERC20 public immutable USDT;
    IAsERC20 public immutable USDF;
    IAsERC20 public immutable AsUSDF;
    IAsUSDFEarn public immutable AsUSDFEarn;

    uint256 public commissionRate;
    uint256 public USDFMaxSupply;
    bool public USDTDepositEnabled;
    address public ceffuAddress;
    bool public transferToCeffuEnabled;
    uint256 public burnCommissionRate;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _timeLockAddress, IERC20 _USDT, IAsERC20 _USDF, IWithdrawVault _withdrawVault, IAsUSDFEarn _AsUSDFEarn) 
        Withdrawable(_USDT, _USDF, _withdrawVault) 
    {
        require(_timeLockAddress != address(0), "timeLockAddress cannot be a zero address");
        require(address(_USDT) != address(0), "USDTAddress cannot be a zero address");
        require(address(_USDF) != address(0), "USDFAddress cannot be a zero address");

        TIMELOCK_ADDRESS = _timeLockAddress;
        USDT = _USDT;
        USDF = _USDF;
        AsUSDFEarn = _AsUSDFEarn;
        AsUSDF = _AsUSDFEarn.asUSDF();
        require(address(AsUSDF) != address(0), "illegal AsUSDF");
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

    function initialize(address _admin) initializer public {
        __Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, TIMELOCK_ADDRESS);
        // do some initialize and will renounce after initialize
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(PAUSE_ROLE, _admin);
    }

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal onlyTimeLock override {}

    function updateUSDTDepositEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        bool oldUSDTDepositEnabled = USDTDepositEnabled;
        require(oldUSDTDepositEnabled != enabled, "newUSDTDepositEnabled can not be equal oldUSDTDepositEnabled");

        USDTDepositEnabled = enabled;
        emit UpdateUSDTDepositEnabled( oldUSDTDepositEnabled, USDTDepositEnabled);
    }

    function updateCommissionRate(uint256 _commissionRate) external onlyRole(ADMIN_ROLE) {
        require(_commissionRate >= 0, "commissionRate cannot less than zero");
        require(_commissionRate <= 1e4, "commissionRate cannot greater than 10000");

        uint256 oldCommissionRate = commissionRate;
        require(oldCommissionRate != _commissionRate, "newCommissionRate can not be equal oldCommissionRate");

        commissionRate = _commissionRate;
        emit UpdateCommissionRate(oldCommissionRate, commissionRate);
    }

    function updateBurnCommissionRate(uint256 _commissionRate) external onlyRole(ADMIN_ROLE) {
        require(_commissionRate >= 0, "commissionRate cannot less than zero");
        require(_commissionRate <= 1e4, "commissionRate cannot greater than 10000");

        uint256 oldCommissionRate = burnCommissionRate;
        require(oldCommissionRate != _commissionRate, "newCommissionRate can not be equal oldCommissionRate");

        burnCommissionRate = _commissionRate;
        emit UpdateBurnCommissionRate(oldCommissionRate, burnCommissionRate);
    }

    function updateUSDFMaxSupply(uint256 _USDFMaxSupply) external onlyRole(ADMIN_ROLE) {
        require(_USDFMaxSupply > 0, "USDFMaxSupply cannot be a zero");

        uint256 oldUSDFMaxSupply = USDFMaxSupply;
        require(oldUSDFMaxSupply != _USDFMaxSupply, "newUSDFMaxSupply can not be equal oldUSDFMaxSupply");

        USDFMaxSupply = _USDFMaxSupply;
        emit UpdateUSDFMaxSupply(oldUSDFMaxSupply, USDFMaxSupply);
    }

    function updateCeffuAddress(address _ceffuAddress) external onlyRole(ADMIN_ROLE) {
        require(_ceffuAddress != address(0), "ceffuAddress cannot be a zero address");

        address oldCeffuAddress = ceffuAddress;
        require(oldCeffuAddress != _ceffuAddress, "newCeffuAddress can not be equal oldCeffuAddress");

        ceffuAddress = _ceffuAddress;
        emit UpdateCeffuAddress( oldCeffuAddress, ceffuAddress);
    }

    function updateTransferToCeffuEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        bool oldTransferToCeffuEnabled = transferToCeffuEnabled;
        require(oldTransferToCeffuEnabled != enabled, "newTransferToCeffuEnabled can not be equal oldTransferToCeffuEnabled");

        transferToCeffuEnabled = enabled;
        emit UpdateTransferToCeffuEnabled(oldTransferToCeffuEnabled, transferToCeffuEnabled);
    }


    function deposit(uint256 amountIn) external nonReentrant whenNotPaused {
        _mintUSDF(amountIn, msg.sender);
    }

    function mintAsUSDF(uint256 amountIn) external nonReentrant whenNotPaused {
        uint USDFAmount = _mintUSDF(amountIn, address(this));
        USDF.approve(address(AsUSDFEarn), USDFAmount);
        uint asUSDFBalanceBefore = AsUSDF.balanceOf(address(this));
        AsUSDFEarn.deposit(USDFAmount);
        uint asUSDFBalanceAfter = AsUSDF.balanceOf(address(this));
        AsUSDF.safeTransfer(msg.sender, asUSDFBalanceAfter - asUSDFBalanceBefore);
        USDF.approve(address(AsUSDFEarn), 0);
    }

    /**
      * @dev mint USDF token
      */
    function _mintUSDF(uint256 amountIn, address _for) private returns (uint) {
        require(amountIn > 0, "invalid amount");
        require(USDTDepositEnabled, "Deposit is paused");

        uint256 resultAmountIn = _transferToVault(msg.sender, USDT, amountIn);
        require(resultAmountIn == amountIn, "Amount not matched");

        uint256 totalSupply = USDF.totalSupply();
        uint256 USDFAmount =  amountIn * (1e4 - commissionRate) / 1e4;
        require(totalSupply + USDFAmount <= USDFMaxSupply, "The amount is too large");

        USDF.mint(_for, USDFAmount);
        emit MintUSDF(_for, USDT, USDF, amountIn, USDFAmount);
        return USDFAmount;
    }

    /**
     * @dev transfer amount to ceffuAddress
      */
    function transferToCeffu() external nonReentrant onlyRole(BOT_ROLE) {
        if (transferToCeffuEnabled) {
            require(ceffuAddress != address(0), "ceffuAddress cannot be a zero address");
            uint256 amount = USDT.balanceOf(address(this));
            require(amount > 0 , "Insufficient balance");

            USDT.safeTransfer(ceffuAddress, amount);
            emit TransferToCeffu(USDT, amount, ceffuAddress);
        }
    }

    function _transferToVault(address from, IERC20 token, uint256 amount) private returns (uint256) {
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        return token.balanceOf(address(this)) - before;
    }

    function requestWithdraw(uint256 amount) external nonReentrant whenNotPaused {
        //the decimal of price is 1e18, and fix to 1 but sub burnCommissionRate
        uint price = 1e18 * (1e4 - burnCommissionRate) / 1e4;
        uint256 USDTAmount =  amount * (1e4 - burnCommissionRate) / 1e4;
        Withdrawable._doRequestWithdraw(amount, USDTAmount, price, false);
    }
    
    function requestEmergencyWithdraw(uint256 amount) external nonReentrant whenNotPaused {
        uint price = 1e18 * (1e4 - burnCommissionRate) / 1e4;
        uint256 USDTAmount =  amount * (1e4 - burnCommissionRate) / 1e4;
        Withdrawable._doRequestWithdraw(amount, USDTAmount, price, true);
    }

    function distributeWithdraw(DistributeWithdrawInfo[] calldata distributeWithdrawInfoList)  external nonReentrant whenNotPaused onlyRole(BOT_ROLE) {
        Withdrawable._distributeWithdraw(distributeWithdrawInfoList, true);
    }

    function claimWithdraw(uint256[] calldata requestWithdrawNos) external nonReentrant whenNotPaused {
        Withdrawable._claimWithdraw(requestWithdrawNos);
    }
}
