import { type DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
}) => {
    const { deploy } = deployments
    const { deployer, multisig } = await getNamedAccounts()
    const Timelock = await ethers.getContract('Timelock');
    await deploy('WithdrawVault', {
        from: deployer,
        args: [
            Timelock.address
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
                    ],
                },
            },
        }
    });
}

deploy.tags = ['WithdrawVault']
deploy.dependencies = ['WithdrawVaultImplementation']
export default deploy
