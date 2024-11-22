import { type DeployFunction } from 'hardhat-deploy/types'
import TokenConfig from '../config/token.config';

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
}) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    const Timelock = await ethers.getContract('Timelock');
    await deploy('asUSDF', {
        from: deployer,
        args: [
            TokenConfig.asUSDF.name, // name
            TokenConfig.asUSDF.symbol, // symbol
            deployer, // _defaultAdmin
            Timelock.address //timelock
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })
}

deploy.tags = ['asUSDF']
deploy.dependencies = ['Timelock']
export default deploy
