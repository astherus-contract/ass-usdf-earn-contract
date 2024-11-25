import { type DeployFunction } from 'hardhat-deploy/types'
import TokenConfig from '../config/token.config';

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
    network,
}) => {
    const { deploy } = deployments
    const { deployer, multisig } = await getNamedAccounts()

    const Timelock = await ethers.getContract('Timelock');
    await deploy('asUSDF', {
        from: deployer,
        args: [
            TokenConfig(network).asUSDF.name, // name
            TokenConfig(network).asUSDF.symbol, // symbol
            multisig, // _defaultAdmin
            Timelock.address //timelock
        ],
        log: true,
        skipIfAlreadyDeployed: true,
    })
}

deploy.tags = ['asUSDF']
deploy.dependencies = ['Timelock']
export default deploy
