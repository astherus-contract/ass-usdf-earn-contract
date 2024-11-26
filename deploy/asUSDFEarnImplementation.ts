import { type DeployFunction } from 'hardhat-deploy/types'
import EarnConfig from '../config/earn.config';
const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
    network,
}) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const Timelock = await ethers.getContract('Timelock');
    const USDF = await ethers.getContract('USDF');
    const WithdrawVault = await ethers.getContract('WithdrawVault');
    const asUSDF = await ethers.getContract('asUSDF');
    await deploy('asUSDFEarn_Implementation', {
        contract: "asUSDFEarn",
        from: deployer,
        args: [
            Timelock.address, 
            USDF.address, 
            asUSDF.address, 
            WithdrawVault.address,
            EarnConfig(network).VESTING_PERIOD
        ],
        log: true, 
        skipIfAlreadyDeployed: true,
    });
}

deploy.tags = ['asUSDFEarnImplementation']
deploy.dependencies = ['Timelock', 'USDF', 'asUSDF', 'WithdrawVault']
export default deploy
