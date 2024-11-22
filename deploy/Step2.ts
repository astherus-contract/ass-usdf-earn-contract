import { type DeployFunction } from 'hardhat-deploy/types'
import { AsUSDF, AsUSDFEarn, Timelock, USDF, USDFEarn } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import EarnConfig from '../config/earn.config'

const deploy: DeployFunction = async ({
    getNamedAccounts,
    ethers,
    network,
}) => {
    const { deployer, multisig } = await getNamedAccounts();
    const deployerSigner = await ethers.getSignerOrNull(deployer);
    const multisigSigner = await ethers.getSignerOrNull(multisig);
    const USDF = await ethers.getContract<USDF>('USDF');
    const USDFEarn = await ethers.getContract<USDFEarn>('USDFEarn');
    const asUSDF = await ethers.getContract<AsUSDF>('asUSDF');
    const asUSDFEarn = await ethers.getContract<AsUSDFEarn>('asUSDFEarn');
    let admin: SignerWithAddress | null;
    if (deployerSigner && await USDFEarn.hasRole(ethers.utils.id('ADMIN_ROLE'), deployer)) {
        admin = deployerSigner;
    } else if (multisigSigner && await USDFEarn.hasRole(ethers.utils.id('ADMIN_ROLE'), multisig)) {
        admin = multisigSigner;
    } else {
        console.log(`deployer have no ADMIN_ROLE`);
        return;
    }
    if (!(await USDFEarn.USDTDepositEnabled())) {
        const tx = await USDFEarn.connect(admin).updateUSDTDepositEnabled(true);
        await tx.wait();
        console.log(`USDFEarn EnableDeposit: ${tx.hash}`);
    }
    if (!(await USDFEarn.USDFMaxSupply()).eq(EarnConfig(network).USDF_MAX_SUPPLY)) {
        const tx = await USDFEarn.connect(admin).updateUSDFMaxSupply(EarnConfig(network).USDF_MAX_SUPPLY);
        await tx.wait();
        console.log(`USDFEarn SetMaxSupply: ${ethers.utils.formatEther(EarnConfig(network).USDF_MAX_SUPPLY)} USDF: ${tx.hash}`)
    }
    if (!(await USDF.hasRole(ethers.utils.id('MINTER_AND_BURN_ROLE'), USDFEarn.address))) {
        const tx = await USDF.connect(admin).grantRole(ethers.utils.id('MINTER_AND_BURN_ROLE'), USDFEarn.address);
        await tx.wait();
        console.log(`USDF grant MINTER_AND_BURN_ROLE for USDFEarn: ${tx.hash}`)
    }
    if (!(await asUSDFEarn.USDFDepositEnabled())) {
        const tx = await asUSDFEarn.connect(admin).updateDepositEnabled(true);
        await tx.wait();
        console.log(`asUSDFEarn EnableDeposit: ${tx.hash}`);
    }
    if (!(await asUSDF.hasRole(ethers.utils.id('MINTER_AND_BURN_ROLE'), asUSDFEarn.address))) {
        const tx = await asUSDF.connect(admin).grantRole(ethers.utils.id('MINTER_AND_BURN_ROLE'), asUSDFEarn.address);
        await tx.wait();
        console.log(`asUSDF grant MINTER_AND_BURN_ROLE for asUSDFEarn: ${tx.hash}`)
    }
}

deploy.tags = ['Step2']
deploy.dependencies = ['Timelock', 'USDF', 'asUSDF', 'USDFEarn', 'asUSDFEarn']
export default deploy