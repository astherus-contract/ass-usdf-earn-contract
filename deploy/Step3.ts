import { type DeployFunction } from 'hardhat-deploy/types'
import { AsUSDFEarn, RewardDispatcher, USDFEarn, WithdrawVault } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import EarnConfig from '../config/earn.config';

const deploy: DeployFunction = async ({
    getNamedAccounts,
    ethers,
    network,
}) => {
    const { deployer, multisig, bot } = await getNamedAccounts();
    const deployerSigner = await ethers.getSignerOrNull(deployer);
    const multisigSigner = await ethers.getSignerOrNull(multisig);
    const USDFEarn = await ethers.getContract<USDFEarn>('USDFEarn');
    const asUSDFEarn = await ethers.getContract<AsUSDFEarn>('asUSDFEarn');
    const RewardDispatcher = await ethers.getContract<RewardDispatcher>('RewardDispatcher');
    const WithdrawVault = await ethers.getContract<WithdrawVault>('WithdrawVault');
    let admin: SignerWithAddress | null;
    if (deployerSigner && await asUSDFEarn.hasRole(ethers.utils.id('ADMIN_ROLE'), deployer)) {
        admin = deployerSigner;
    } else if (multisigSigner && await asUSDFEarn.hasRole(ethers.utils.id('ADMIN_ROLE'), multisig)) {
        admin = multisigSigner;
    } else {
        console.log(`deployer have no ADMIN_ROLE`);
        return;
    }

    if (!(await asUSDFEarn.hasRole(ethers.utils.id('REWARD_ROLE'), RewardDispatcher.address))) {
        const tx = await asUSDFEarn.connect(admin).grantRole(ethers.utils.id('REWARD_ROLE'), RewardDispatcher.address);
        await tx.wait();
        console.log(`asUSDFEarn grant REWARD_ROLE for RewardDispatcher: ${tx.hash}`)
    }

    if (!(await asUSDFEarn.withdrawEnabled())) {
        const tx = await asUSDFEarn.connect(admin).updateWithdrawEnabled(true);
        await tx.wait();
        console.log(`asUSDFEarn EnableWithdraw: ${tx.hash}`);
    }

    if (!(await USDFEarn.withdrawEnabled())) {
        const tx = await USDFEarn.connect(admin).updateWithdrawEnabled(true);
        await tx.wait();
        console.log(`USDFEarn EnableWithdraw: ${tx.hash}`);
    }

    if (bot && !(await asUSDFEarn.hasRole(ethers.utils.id('BOT_ROLE'), bot))) {
        const tx = await asUSDFEarn.connect(admin).grantRole(ethers.utils.id('BOT_ROLE'), bot);
        await tx.wait();
        console.log(`asUSDFEarn grant BOT_ROLE for ${bot}: ${tx.hash}`)
    }

    if (!(await WithdrawVault.hasRole(ethers.utils.id('TRANSFER_ROLE'), USDFEarn.address))) {
        const tx = await WithdrawVault.connect(deployerSigner!!).grantRole(ethers.utils.id('TRANSFER_ROLE'), USDFEarn.address);
        await tx.wait();
        console.log(`WithdrawVault grant TRANSFER_ROLE for USDFEarn: ${tx.hash}`)
    }

    if (!(await WithdrawVault.hasRole(ethers.utils.id('TRANSFER_ROLE'), asUSDFEarn.address))) {
        const tx = await WithdrawVault.connect(deployerSigner!!).grantRole(ethers.utils.id('TRANSFER_ROLE'), asUSDFEarn.address);
        await tx.wait();
        console.log(`WithdrawVault grant TRANSFER_ROLE for asUSDFEarn: ${tx.hash}`)
    }
    if (!(await USDFEarn.burnCommissionRate()).eq(EarnConfig(network).USDF_BURN_COMMISSION_RATE)) {
        const tx = await USDFEarn.connect(admin).updateBurnCommissionRate(EarnConfig(network).USDF_BURN_COMMISSION_RATE);
        await tx.wait();
        console.log(`USDFEarn: set burnCommissionRate to: ${EarnConfig(network).USDF_BURN_COMMISSION_RATE}: ${tx.hash}`);
    }

}

deploy.tags = ['Step3']
deploy.dependencies = ['Step2', 'RewardDispatcher', 'WithdrawVault', 'USDFEarn', 'asUSDFEarn']
export default deploy