import { type DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
}) => {
    const { deploy } = deployments
    const { deployer, multisig, bot } = await getNamedAccounts()
    const Timelock = await ethers.getContract('Timelock');
    const USDFEarn = await ethers.getContract('USDFEarn');
    const asUSDFEarn = await ethers.getContract('asUSDFEarn');
    await deploy('RewardDispatcher', {
        from: deployer,
        args: [
            Timelock.address,
            USDFEarn.address,
            asUSDFEarn.address,
        ],
        log: true, 
        skipIfAlreadyDeployed: true,
        proxy: {
            proxyContract: 'UUPS',
            execute: {
                init: {
                    methodName: 'initialize', 
                    args: [
                        multisig,
                        deployer,
                        bot,
                    ],
                },
            },
        }
    });
}

deploy.tags = ['RewardDispatcher']
deploy.dependencies = ['RewardDispatcherImplementation']
export default deploy
