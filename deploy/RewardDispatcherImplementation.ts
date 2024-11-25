import { type DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
}) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const Timelock = await ethers.getContract('Timelock');
    const USDFEarn = await ethers.getContract('USDFEarn');
    const asUSDFEarn = await ethers.getContract('asUSDFEarn');
    await deploy('RewardDispatcher_Implementation', {
        contract: "RewardDispatcher",
        from: deployer,
        args: [
            Timelock.address,
            USDFEarn.address,
            asUSDFEarn.address,
        ],
        log: true, 
        skipIfAlreadyDeployed: true,
    });
}

deploy.tags = ['RewardDispatcherImplementation']
deploy.dependencies = ['Timelock', 'USDFEarn', 'asUSDFEarn']
export default deploy
