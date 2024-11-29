import TokenConfig from '../config/token.config';
import { type DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
    network,
}) => {
    const { deploy } = deployments
    const { deployer, multisig } = await getNamedAccounts()
    let endpointV2Deployment = null;
    if (network.name == 'hardhat') {
        // for localhost test, deploy new one
        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock');
        const EndpointV2Mock = await ethers.getContractFactory(
            EndpointV2MockArtifact.abi,
            EndpointV2MockArtifact.bytecode,
        );
        endpointV2Deployment = await EndpointV2Mock.deploy(1);
    } else {
        endpointV2Deployment = (await deployments.get('EndpointV2'))
    }
    const Timelock = await ethers.getContract('Timelock');
    await deploy('USDF', {
        from: deployer,
        args: [
            TokenConfig(network).USDF.name,
            TokenConfig(network).USDF.symbol, 
            [], 
            endpointV2Deployment.address, // LayerZero's EndpointV2 address
            multisig, // _defaultAdmin
            Timelock.address //timelock
        ],
        log: true,
        skipIfAlreadyDeployed: true,
    })
}

deploy.tags = ['USDF'];
deploy.dependencies = ['Timelock'];
export default deploy
