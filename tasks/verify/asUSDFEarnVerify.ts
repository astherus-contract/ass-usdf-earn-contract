import { task } from 'hardhat/config'
import EarnConfig from '../../config/earn.config';

task('verify:asUSDFEarn', 'verify asUSDFEarn contract')
    .setAction(async(_, hre) => {
        const asUSDFEarn = await hre.ethers.getContract('asUSDFEarn_Implementation')
        const Timelock = await hre.ethers.getContract('Timelock')
        const USDF = await hre.ethers.getContract('USDF')
        const asUSDF = await hre.ethers.getContract('asUSDF')
        const WithdrawVault = await hre.ethers.getContract('WithdrawVault')
        await hre.run(
            'verify:verify',
            {
                address: asUSDFEarn.address,
                constructorArguments: [
                    Timelock.address, 
                    USDF.address, 
                    asUSDF.address, 
                    WithdrawVault.address,
                    EarnConfig(hre.network).VESTING_PERIOD
                ]
            }
        )
    })
