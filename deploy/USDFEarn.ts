import { type DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async ({
    getNamedAccounts, 
    deployments,
    ethers,
    network,
}) => {
    const { deploy } = deployments
    const { deployer, multisig, USDT } = await getNamedAccounts()
    let mockUSDT: string | null = null;
    if (network.name == 'hardhat') {
        //for localhost test deploy mock USDF
        const MockERC20Factory = await ethers.getContractFactory('MockERC20');
        const MockERC20 = await MockERC20Factory.deploy('USDT', 'USDT');
        mockUSDT = MockERC20.address;
    }
    const Timelock = await ethers.getContract('Timelock');
    const USDF = await ethers.getContract('USDF');
    const WithdrawVault = await ethers.getContract('WithdrawVault');
    const asUSDFEarn = await ethers.getContract('asUSDFEarn');
    await deploy('USDFEarn', {
        from: deployer,
        args: [
            Timelock.address, 
            USDT ?? mockUSDT, 
            USDF.address,
            WithdrawVault.address,
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
                        multisig
                    ],
                },
            },
        }
    });
}

deploy.tags = ['USDFEarn']
deploy.dependencies = ['USDFEarnImplementation']
export default deploy
