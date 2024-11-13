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

import "./interface/IAs.sol";


contract USDFEarn is Initializable, PausableUpgradeable, AccessControlEnumerableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");


    using Address for address payable;
    using SafeERC20 for IERC20;

    event AddToken(address indexed asTokenAddress, address indexed sourceTokenAddress);
    event UpdateUSDTDepositEnabled(bool oldUSDTDepositEnabled, bool newUSDTDepositEnabled);
    event UpdateUSDFMaxSupply(uint256 oldUSDFMaxSupply, uint256 newUSDFMaxSupply);
    event UpdateCommissionRate(uint256 oldCommissionRate, uint256 newCommissionRate);
    event UpdateCeffuAddress(address oldCeffuAddress, address newCeffuAddress);
    event UpdateTransferToCeffuEnabled(bool oldTransferToCeffuEnabled, bool newTransferToCeffuEnabled);
    event TransferToCeffu(address indexed USDTAddress, uint256 USDTAmount, address ceffuAddress);

    event MintUSDF(address indexed sender, address indexed USDTAddress, address indexed USDFAddress, uint256 amountIn, uint256 USDFAmount);

    address public immutable TIMELOCK_ADDRESS;

    address public immutable USDTAddress;
    address public immutable USDFAddress;
    uint256 public commissionRate;
    uint256 public USDFMaxSupply;
    bool public USDTDepositEnabled;
    address public ceffuAddress;
    bool public transferToCeffuEnabled;


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _timeLockAddress, address _USDTAddress, address _USDFAddress) {
        require(_timeLockAddress != address(0), "timeLockAddress cannot be a zero address");
        require(_USDTAddress != address(0), "USDTAddress cannot be a zero address");
        require(_USDFAddress != address(0), "USDFAddress cannot be a zero address");

        TIMELOCK_ADDRESS = _timeLockAddress;
        USDTAddress = _USDTAddress;
        USDFAddress = _USDFAddress;
        _disableInitializers();
        emit AddToken(USDFAddress, USDTAddress);
    }

    modifier onlyTimeLock() {
        require(msg.sender == TIMELOCK_ADDRESS, "only time lock");
        _;
    }

    function initialize(address _defaultAdmin) initializer public {
        __Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, TIMELOCK_ADDRESS);
        _grantRole(ADMIN_ROLE, _defaultAdmin);
        _grantRole(PAUSE_ROLE, _defaultAdmin);
    }

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSE_ROLE) {
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
        _mintUSDF(amountIn);
    }

    /**
      * @dev mint USDF token
      */
    function _mintUSDF(uint256 amountIn) private {
        require(USDTAddress != address(0), "USDTAddress cannot be a zero address");

        require(amountIn > 0, "invalid amount");
        require(USDTDepositEnabled == true, "Deposit is paused");
        require(USDFAddress != address(0), "USDFAddress cannot be a zero address");

        uint256 resultAmountIn = _transferToVault(msg.sender, USDTAddress, amountIn);
        require(resultAmountIn == amountIn, "Amount not matched");

        IERC20 erc20 = IERC20(USDFAddress);
        uint256 totalSupply = erc20.totalSupply();
        uint256 USDFAmount =  amountIn * (1e4 - commissionRate) / 1e4;
        require(totalSupply + USDFAmount <= USDFMaxSupply, "The amount is too large");

        IAs(USDFAddress).mint(msg.sender, USDFAmount);
        emit MintUSDF(msg.sender, USDTAddress, USDFAddress, amountIn, USDFAmount);
    }

    /**
     * @dev transfer amount to ceffuAddress
      */
    function transferToCeffu() external nonReentrant onlyRole(BOT_ROLE) {
        if (transferToCeffuEnabled) {
            require(ceffuAddress != address(0), "ceffuAddress cannot be a zero address");
            uint256 amount = IERC20(USDTAddress).balanceOf(address(this));
            require(amount > 0 , "Insufficient balance");

            IERC20(USDTAddress).safeTransfer(ceffuAddress, amount);
            emit TransferToCeffu(USDTAddress, amount, ceffuAddress);
        }
    }

    function _transferToVault(address from, address token, uint256 amount) private returns (uint256){
            IERC20 erc20 = IERC20(token);
            uint256 before = erc20.balanceOf(address(this));
            erc20.safeTransferFrom(from, address(this), amount);
            return erc20.balanceOf(address(this)) - before;
    }
    

}
