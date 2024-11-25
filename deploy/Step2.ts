import { type DeployFunction } from 'hardhat-deploy/types'
import { AsUSDF, AsUSDFEarn, USDF, USDFEarn } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import EarnConfig from '../config/earn.config'

const deploy: DeployFunction = async ({
    getNamedAccounts,
    ethers,
    network,
}) => {
    const ADMIN_ROLE = ethers.utils.id('ADMIN_ROLE');
    const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
    const MINTER_AND_BURN_ROLE = ethers.utils.id('MINTER_AND_BURN_ROLE');
    const BOT_ROLE = ethers.utils.id('BOT_ROLE');

    const { deployer, multisig, bot, ceffu } = await getNamedAccounts();
    const deployerSigner = await ethers.getSignerOrNull(deployer);
    const multisigSigner = await ethers.getSignerOrNull(multisig);
    const USDF = await ethers.getContract<USDF>('USDF');
    const USDFEarn = await ethers.getContract<USDFEarn>('USDFEarn');
    const asUSDF = await ethers.getContract<AsUSDF>('asUSDF');
    const asUSDFEarn = await ethers.getContract<AsUSDFEarn>('asUSDFEarn');
    //for testnet we have multisig, we'll use this to initialize
    //for mainnet new deploy contract, we have deployer, and do some initialize and renounce
    if (!(await USDFEarn.USDTDepositEnabled())) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await USDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await USDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await USDFEarn.connect(admin).updateUSDTDepositEnabled(true);
            await tx.wait();
            console.log(`USDFEarn: EnableDeposit: ${tx.hash}`);
        } else {
            console.log(`USDFEarn: We Should EnableDeposit Mannualy`);
        }
    }
    // Check USDFMaxSupply, only when not set
    if ((await USDFEarn.USDFMaxSupply()).eq(ethers.constants.Zero)) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await USDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await USDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await USDFEarn.connect(admin).updateUSDFMaxSupply(EarnConfig(network).USDF_MAX_SUPPLY);
            await tx.wait();
            console.log(`USDFEarn: SetMaxSupply: ${ethers.utils.formatEther(EarnConfig(network).USDF_MAX_SUPPLY)} USDF: ${tx.hash}`)
        } else {
            console.log(`USDFEarn: We Should SetMaxSupply Mannualy`)
        }
    }
    // Check USDFEarn have MINTER_OR_BURN Role
    if (!(await USDF.hasRole(MINTER_AND_BURN_ROLE, USDFEarn.address))) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await USDF.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await USDF.hasRole(DEFAULT_ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await USDF.connect(admin).grantRole(MINTER_AND_BURN_ROLE, USDFEarn.address);
            await tx.wait();
            console.log(`USDF grant MINTER_AND_BURN_ROLE for USDFEarn: ${tx.hash}`)
        } else {
            console.log(`USDF: We Should grant MINTER_AND_BURN_ROLE for USDFEarn Mannuly`)
        }
    }
    // Check BOT_ROLE have been set
    if ((await USDFEarn.getRoleMemberCount(BOT_ROLE)).toNumber() == 0) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await USDFEarn.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await USDFEarn.hasRole(DEFAULT_ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await USDFEarn.connect(admin).grantRole(BOT_ROLE, bot);
            await tx.wait();
            console.log(`USDFEarn grant BOT_ROLE for ${bot}: ${tx.hash}`)
        } else {
            console.log(`USDFEarn We Should set BOT_ROLE Mannualy`)
        }
    }
    // Check transferToCeffuEnable
    if (!(await USDFEarn.transferToCeffuEnabled())) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await USDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await USDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await USDFEarn.connect(admin).updateTransferToCeffuEnabled(true);
            await tx.wait();
            console.log(`USDFEarn EnableTransferToCeffu: ${tx.hash}`)
        } else {
            console.log(`USDFEarn We Should EnableTransferToCeffu Mannualy`)
        }
    }
    // Check ceffu address been set
    if ((await USDFEarn.ceffuAddress()).toLowerCase() == ethers.constants.AddressZero) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await USDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await USDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await USDFEarn.connect(admin).updateCeffuAddress(ceffu);
            await tx.wait();
            console.log(`USDFEarn set ceff to ${ceffu}: ${tx.hash}`)
        } else {
            console.log(`We Should set Ceffu Address Mannualy`)
        }
    }
    // Check Deposit Enable
    if (!(await asUSDFEarn.USDFDepositEnabled())) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await asUSDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await asUSDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await asUSDFEarn.connect(admin).updateDepositEnabled(true);
            await tx.wait();
            console.log(`asUSDFEarn EnableDeposit: ${tx.hash}`);
        } else {
            console.log(`asUSDFEarn: We Should EnableDeposit Mannualy`);
        }
    }
    // Check Earn Have MINTER_OR_BURN_ROLE
    if (!(await asUSDF.hasRole(MINTER_AND_BURN_ROLE, asUSDFEarn.address))) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await asUSDF.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await asUSDF.hasRole(DEFAULT_ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await asUSDF.connect(admin).grantRole(MINTER_AND_BURN_ROLE, asUSDFEarn.address);
            await tx.wait();
            console.log(`asUSDF grant MINTER_AND_BURN_ROLE for asUSDFEarn: ${tx.hash}`)
        } else {
            console.log(`asUSDF: We Should grant MINTER_AND_BURN_ROLE for asUSDFEarn Mannualy`)
        }
    }

}

deploy.tags = ['Step2']
deploy.dependencies = ['Timelock', 'USDF', 'asUSDF', 'USDFEarn', 'asUSDFEarn']
export default deploy