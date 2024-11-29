import { type DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
}) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const Timelock = await ethers.getContract('Timelock');
    await deploy('WithdrawVault_Implementation', {
        contract: "WithdrawVault",
        from: deployer,
        args: [
            Timelock.address, 
        ],
        log: true, 
        skipIfAlreadyDeployed: true,
    });
}

deploy.tags = ['WithdrawVaultImplementation']
deploy.dependencies = ['Timelock']
export default deploy
