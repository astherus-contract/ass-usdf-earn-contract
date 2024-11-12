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


contract asUSDPEarn is Initializable, PausableUpgradeable, AccessControlEnumerableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {


    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant BOT_ROLE = keccak256("BOT_ROLE");

    uint256 public constant EXCHANGE_PRICE_DECIMALS = 1e18;

    using Address for address payable;
    using SafeERC20 for IERC20;

    event AddToken(address indexed asUSDPAddress, address indexed USDPAddress);
    event UpdateUSDPDepositEnabled(bool oldUSDPDepositEnabled, bool newUSDPDepositEnabled);
    event MintasUSDP(address indexed sender, address indexed USDPAddress, address indexed asUSDPAddress, uint256 amountIn, uint256 asUSDPAmount, uint256 exchangePrice);

    address public immutable TIMELOCK_ADDRESS;

    address public immutable USDPAddress;
    address public immutable asUSDPAddress;

    bool public USDPDepositEnabled;


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address timeLockAddress, address _USDPAddress, address _asUSDPAddress) {
        require(timeLockAddress != address(0), "timeLockAddress cannot be a zero address");
        require(_USDPAddress != address(0), "USDPAddress cannot be a zero address");
        require(_asUSDPAddress != address(0), "asUSDPAddress cannot be a zero address");

        TIMELOCK_ADDRESS = timeLockAddress;
        USDPAddress = _USDPAddress;
        asUSDPAddress = _asUSDPAddress;
        _disableInitializers();
        emit AddToken(asUSDPAddress, USDPAddress);
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
        bool oldUSDPDepositEnabled = USDPDepositEnabled;
        require(oldUSDPDepositEnabled != enabled, "newUSDPDepositEnabled can not be equal oldUSDPDepositEnabled");

        USDPDepositEnabled = enabled;
        emit UpdateUSDPDepositEnabled( oldUSDPDepositEnabled, USDPDepositEnabled);
    }

    function deposit(uint256 amountIn) external nonReentrant whenNotPaused {
        _mintasUSDP(amountIn);
    }


    function _mintasUSDP(uint256 amountIn) private {
        require(USDPAddress != address(0), "USDPAddress cannot be a zero address");
        require(asUSDPAddress != address(0), "asUSDPAddress cannot be a zero address");
        require(USDPDepositEnabled == true, "Deposit is paused");
        require(amountIn > 0, "invalid amount");

        amountIn = _transferToVault(msg.sender, USDPAddress, amountIn);
        uint256 exchangePrice = _exchangePrice();
        uint256 asUSDPAmount = amountIn * EXCHANGE_PRICE_DECIMALS / exchangePrice;
        require(asUSDPAmount > 0, "invalid amount");

        IAs(asUSDPAddress).mint(msg.sender, asUSDPAmount);
        emit MintasUSDP(msg.sender, USDPAddress, asUSDPAddress, amountIn, asUSDPAmount, exchangePrice);
    }


    function _transferToVault(address from, address token, uint256 amount) private returns (uint256){
        IERC20 erc20 = IERC20(token);
        uint256 before = erc20.balanceOf(address(this));
        erc20.safeTransferFrom(from, address(this), amount);
        return erc20.balanceOf(address(this)) - before;
    }

    function _exchangePrice() public view returns (uint256){
        require(USDPAddress != address(0), "USDPAddress cannot be a zero address");
        require(asUSDPAddress != address(0), "asUSDPAddress cannot be a zero address");

        IERC20 USDPToken = IERC20(USDPAddress);
        uint256 USDPBalance = USDPToken.balanceOf(address(this));

        IERC20 asUSDP = IERC20(asUSDPAddress);
        uint256 totalSupply = asUSDP.totalSupply();
        if (totalSupply <= 0){
            return EXCHANGE_PRICE_DECIMALS;
        }
        if (USDPBalance <= 0){
            return EXCHANGE_PRICE_DECIMALS;
        }

        uint256 exchangePrice = (USDPBalance * EXCHANGE_PRICE_DECIMALS) / totalSupply;
        return exchangePrice ;
    }
    

}
