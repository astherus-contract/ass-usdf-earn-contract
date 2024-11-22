import { task } from 'hardhat/config'
import TokenConfig from '../../config/token.config';

task('verify:asUSDF', 'verify asUSDF contract')
    .setAction(async(_, hre) => {
        const { deployer } = await hre.getNamedAccounts();
        const asUSDF = await hre.ethers.getContract('asUSDF');
        const Timelock = await hre.ethers.getContract('Timelock');
        await hre.run(
            'verify:verify',
            {
                address: asUSDF.address,
                constructorArguments: [
                    TokenConfig(hre.network).asUSDF.name, // name
                    TokenConfig(hre.network).asUSDF.symbol, // symbol
                    deployer, // _defaultAdmin
                    Timelock.address //timelock
                ]
            }
        )
    })

