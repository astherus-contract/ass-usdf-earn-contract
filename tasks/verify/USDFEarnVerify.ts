import { task } from 'hardhat/config'

task('verify:USDFEarn', 'verify USDFEarn contract')
    .setAction(async(_, hre) => {
        const { USDT } = await hre.getNamedAccounts()
        const USDFEarn = await hre.ethers.getContract('USDFEarn_Implementation')
        const Timelock = await hre.ethers.getContract('Timelock')
        const WithdrawVault = await hre.ethers.getContract('WithdrawVault')
        const USDF = await hre.ethers.getContract('USDF')
        const asUSDFEarn = await hre.ethers.getContract('asUSDFEarn');
        await hre.run(
            'verify:verify',
            {
                address: USDFEarn.address,
                constructorArguments: [
                    Timelock.address, 
                    USDT, 
                    USDF.address,
                    WithdrawVault.address,
                    asUSDFEarn.address,
                ]
            }
        )
    });
