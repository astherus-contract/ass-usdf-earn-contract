import { type DeployFunction } from 'hardhat-deploy/types'
import EarnConfig from '../config/earn.config';

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
    network,
}) => {
    const { deploy } = deployments
    const { deployer, multisig } = await getNamedAccounts()
    const Timelock = await ethers.getContract('Timelock');
    const USDF = await ethers.getContract('USDF');
    const WithdrawVault = await ethers.getContract('WithdrawVault');
    const asUSDF = await ethers.getContract('asUSDF');
    await deploy('asUSDFEarn', {
        from: deployer,
        args: [
            Timelock.address, 
            USDF.address, 
            asUSDF.address,
            WithdrawVault.address,
            EarnConfig(network).VESTING_PERIOD,
        ],
        log: true, 
        skipIfAlreadyDeployed: true,
        proxy: {
            proxyContract: 'UUPS',
            execute: {
                init: {
                    methodName: 'initialize', 
                    args: [
                        multisig
                    ],
                },
            },
        }
    });
}

deploy.tags = ['asUSDFEarn']
deploy.dependencies = ['asUSDFEarnImplementation']
export default deploy
