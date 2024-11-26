import { type DeployFunction } from 'hardhat-deploy/types'
import { AsUSDFEarn, RewardDispatcher, USDFEarn, WithdrawVault } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import EarnConfig from '../config/earn.config';

const deploy: DeployFunction = async ({
    getNamedAccounts,
    ethers,
    network,
}) => {
    const BOT_ROLE = ethers.utils.id('BOT_ROLE');
    const REWARD_ROLE = ethers.utils.id('REWARD_ROLE');
    const TRANSFER_ROLE = ethers.utils.id('TRANSFER_ROLE');
    const ADMIN_ROLE = ethers.utils.id('ADMIN_ROLE');
    const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;

    const { deployer, multisig, bot } = await getNamedAccounts();
    const deployerSigner = await ethers.getSignerOrNull(deployer);
    const multisigSigner = await ethers.getSignerOrNull(multisig);
    const USDFEarn = await ethers.getContract<USDFEarn>('USDFEarn');
    const asUSDFEarn = await ethers.getContract<AsUSDFEarn>('asUSDFEarn');
    const RewardDispatcher = await ethers.getContract<RewardDispatcher>('RewardDispatcher');
    const WithdrawVault = await ethers.getContract<WithdrawVault>('WithdrawVault');
    // Set REWARD_ROLE
    if (!(await asUSDFEarn.hasRole(REWARD_ROLE, RewardDispatcher.address))) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await asUSDFEarn.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await asUSDFEarn.hasRole(DEFAULT_ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await asUSDFEarn.connect(admin).grantRole(REWARD_ROLE, RewardDispatcher.address);
            await tx.wait();
            console.log(`asUSDFEarn grant REWARD_ROLE for RewardDispatcher: ${tx.hash}`)
        } else {
            console.log(`We Should grant REWARD_ROLE for RewardDispatcher Mannualy`)
        }
    }
    // Check WithdrawEnable
    if (!(await asUSDFEarn.withdrawEnabled())) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await asUSDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await asUSDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await asUSDFEarn.connect(admin).updateWithdrawEnabled(true);
            await tx.wait();
            console.log(`asUSDFEarn EnableWithdraw: ${tx.hash}`);
        } else {
            console.log(`asUSDFEarn We Should EnableWithdraw Mannualy`)
        }
    }
    // Check BOT_ROLE
    if (bot && (await asUSDFEarn.getRoleMemberCount(BOT_ROLE)).toNumber() == 0) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await asUSDFEarn.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await asUSDFEarn.hasRole(DEFAULT_ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await asUSDFEarn.connect(admin).grantRole(BOT_ROLE, bot);
            await tx.wait();
            console.log(`asUSDFEarn grant BOT_ROLE for ${bot}: ${tx.hash}`)
        } else {
            console.log(`asUSDFEarn We Should grant BOT_ROLE Mannualy`)
        }
    }
    // Check WithdrawEnable
    if (!(await USDFEarn.withdrawEnabled())) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await USDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await USDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await USDFEarn.connect(admin).updateWithdrawEnabled(true);
            await tx.wait();
            console.log(`USDFEarn EnableWithdraw: ${tx.hash}`);
        }
    }
    // Check TRANSFER_ROLE
    if (!(await WithdrawVault.hasRole(TRANSFER_ROLE, USDFEarn.address))) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await WithdrawVault.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await WithdrawVault.hasRole(DEFAULT_ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await WithdrawVault.connect(admin).grantRole(TRANSFER_ROLE, USDFEarn.address);
            await tx.wait();
            console.log(`WithdrawVault grant TRANSFER_ROLE for USDFEarn: ${tx.hash}`)
        } else {
            console.log(`WithdrawVault: We Should grant TRANSFER_ROLE for USDFEarn Mannualy`);
        }
    }
    // Check TRANSFER_ROLE
    if (!(await WithdrawVault.hasRole(TRANSFER_ROLE, asUSDFEarn.address))) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await WithdrawVault.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await WithdrawVault.hasRole(DEFAULT_ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await WithdrawVault.connect(admin).grantRole(TRANSFER_ROLE, asUSDFEarn.address);
            await tx.wait();
            console.log(`WithdrawVault grant TRANSFER_ROLE for asUSDFEarn: ${tx.hash}`)
        } else {
            console.log(`WithdrawVault We Should grant TRANSFER_ROLE for asUSDFEarn Mannualy`);
        }
    }
    // Check burnCommissionRate
    if ((await USDFEarn.burnCommissionRate()).eq(ethers.constants.Zero)) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await USDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await USDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await USDFEarn.connect(admin).updateBurnCommissionRate(EarnConfig(network).USDF_BURN_COMMISSION_RATE);
            await tx.wait();
            console.log(`USDFEarn: set burnCommissionRate to: ${EarnConfig(network).USDF_BURN_COMMISSION_RATE}: ${tx.hash}`);
        } else {
            console.log(`USDFEarn: We Should set burnCommissionRate Mannualy`);
        }
    }
    // Check MaxRewardPercent
    if (((await asUSDFEarn.maxRewardPercent()).eq(ethers.constants.Zero))) {
        let admin: SignerWithAddress | undefined;
        if (deployerSigner && await asUSDFEarn.hasRole(ADMIN_ROLE, deployer)) {
            admin = deployerSigner;
        } else if (multisigSigner && await asUSDFEarn.hasRole(ADMIN_ROLE, multisig)) {
            admin = multisigSigner;
        }
        if (admin) {
            const tx = await asUSDFEarn.connect(admin).updateMaxRewardPercent(EarnConfig(network).MAX_REWARD_PERCENT);
            await tx.wait();
            console.log(`asUSDFEarn: set maxRewardPercent to: ${EarnConfig(network).MAX_REWARD_PERCENT}: ${tx.hash}`);
        } else {
            console.log(`asUSDFEarn: We Should set maxRewardPercent Mannualy`);
        }
    }
}

deploy.tags = ['Step3']
deploy.dependencies = ['Step2', 'RewardDispatcher', 'WithdrawVault', 'USDFEarn', 'asUSDFEarn']
export default deploy