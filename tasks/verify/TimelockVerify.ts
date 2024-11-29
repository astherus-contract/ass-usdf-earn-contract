import TimeLockConfig from '../../config/timelock.config';
import { task } from 'hardhat/config'

task('verify:Timelock', 'verify Timelock contract')
    .setAction(async(_, hre) => {
        const { multisig } = await hre.getNamedAccounts();
        const Timelock = await hre.ethers.getContract('Timelock');
        await hre.run(
            'verify:verify',
            {
                address: Timelock.address,
                constructorArguments: [
                    TimeLockConfig(hre.network).minDelay,
                    TimeLockConfig(hre.network).maxDelay,
                    [multisig],
                    [multisig],
                ]
            }
        )
    })