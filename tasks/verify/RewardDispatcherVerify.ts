import { task } from 'hardhat/config'

task('verify:RewardDispatcher', 'verify RewardDispatcher contract')
    .setAction(async(_, hre) => {
        const RewardDispatcher = await hre.ethers.getContract('RewardDispatcher_Implementation')
        const Timelock = await hre.ethers.getContract('Timelock')
        const USDFEarn = await hre.ethers.getContract('USDFEarn')
        const asUSDFEarn = await hre.ethers.getContract('asUSDFEarn')
        await hre.run(
            'verify:verify',
            {
                address: RewardDispatcher.address,
                constructorArguments: [
                    Timelock.address,
                    USDFEarn.address,
                    asUSDFEarn.address,
                ]
            }
        )
    })
