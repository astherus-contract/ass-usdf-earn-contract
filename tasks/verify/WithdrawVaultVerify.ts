import { task } from 'hardhat/config'

task('verify:WithdrawVault', 'verify WithdrawVault contract')
    .setAction(async(_, hre) => {
        const WithdrawVault = await hre.ethers.getContract('WithdrawVault_Implementation')
        const Timelock = await hre.ethers.getContract('Timelock')
        await hre.run(
            'verify:verify',
            {
                address: WithdrawVault.address,
                constructorArguments: [
                    Timelock.address,
                ]
            }
        )
    })
