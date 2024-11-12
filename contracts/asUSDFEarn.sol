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


contract asUSDFEarn is Initializable, PausableUpgradeable, AccessControlEnumerableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {


    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");

    uint256 public constant EXCHANGE_PRICE_DECIMALS = 1e18;

    using Address for address payable;
    using SafeERC20 for IERC20;

    event AddToken(address indexed asUSDFAddress, address indexed USDFAddress);
    event UpdateUSDFDepositEnabled(bool oldUSDFDepositEnabled, bool newUSDFDepositEnabled);
    event MintasUSDF(address indexed sender, address indexed USDFAddress, address indexed asUSDFAddress, uint256 amountIn, uint256 asUSDFAmount, uint256 exchangePrice);

    address public immutable TIMELOCK_ADDRESS;

    address public immutable USDFAddress;
    address public immutable asUSDFAddress;

    bool public USDFDepositEnabled;


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address timeLockAddress, address _USDFAddress, address _asUSDFAddress) {
        require(timeLockAddress != address(0), "timeLockAddress cannot be a zero address");
        require(_USDFAddress != address(0), "USDFAddress cannot be a zero address");
        require(_asUSDFAddress != address(0), "asUSDFAddress cannot be a zero address");

        TIMELOCK_ADDRESS = timeLockAddress;
        USDFAddress = _USDFAddress;
        asUSDFAddress = _asUSDFAddress;
        _disableInitializers();
        emit AddToken(asUSDFAddress, USDFAddress);
    }

    modifier onlyTimeLock() {
        require(msg.sender == TIMELOCK_ADDRESS, "only time lock");
        _;
    }

    function initialize(address defaultAdmin) initializer public {
        __Pausable_init();
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, TIMELOCK_ADDRESS);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSE_ROLE, defaultAdmin);
    }

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSE_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal onlyTimeLock override {}



    function updateDepositEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        bool oldUSDFDepositEnabled = USDFDepositEnabled;
        require(oldUSDFDepositEnabled != enabled, "newUSDFDepositEnabled can not be equal oldUSDFDepositEnabled");

        USDFDepositEnabled = enabled;
        emit UpdateUSDFDepositEnabled( oldUSDFDepositEnabled, USDFDepositEnabled);
    }

    function deposit(uint256 amountIn) external nonReentrant whenNotPaused {
        _mintasUSDF(amountIn);
    }


    function _mintasUSDF(uint256 amountIn) private {
        require(USDFAddress != address(0), "USDFAddress cannot be a zero address");
        require(asUSDFAddress != address(0), "asUSDFAddress cannot be a zero address");
        require(USDFDepositEnabled == true, "Deposit is paused");
        require(amountIn > 0, "invalid amount");

        amountIn = _transferToVault(msg.sender, USDFAddress, amountIn);
        uint256 exchangePrice = exchangePrice();
        uint256 asUSDFAmount = amountIn * EXCHANGE_PRICE_DECIMALS / exchangePrice;
        require(asUSDFAmount > 0, "invalid amount");

        IAs(asUSDFAddress).mint(msg.sender, asUSDFAmount);
        emit MintasUSDF(msg.sender, USDFAddress, asUSDFAddress, amountIn, asUSDFAmount, exchangePrice);
    }


    function _transferToVault(address from, address token, uint256 amount) private returns (uint256){
        IERC20 erc20 = IERC20(token);
        uint256 before = erc20.balanceOf(address(this));
        erc20.safeTransferFrom(from, address(this), amount);
        return erc20.balanceOf(address(this)) - before;
    }

    function exchangePrice() public view returns (uint256){
        require(USDFAddress != address(0), "USDFAddress cannot be a zero address");
        require(asUSDFAddress != address(0), "asUSDFAddress cannot be a zero address");

        IERC20 USDFToken = IERC20(USDFAddress);
        uint256 USDFBalance = USDFToken.balanceOf(address(this));

        IERC20 asUSDFToken = IERC20(asUSDFAddress);
        uint256 totalSupply = asUSDFToken.totalSupply();
        if (totalSupply <= 0){
            return EXCHANGE_PRICE_DECIMALS;
        }
        if (USDFBalance <= 0){
            return EXCHANGE_PRICE_DECIMALS;
        }

        uint256 exchangePrice = (USDFBalance * EXCHANGE_PRICE_DECIMALS) / totalSupply;
        return exchangePrice ;
    }
    

}
