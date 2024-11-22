import { task } from 'hardhat/config'
import TokenConfig from '../../config/token.config';

task('verify:USDF', 'verify USDF contract')
    .setAction(async(_, hre) => {
        const { deployer } = await hre.getNamedAccounts();
        const USDF = await hre.ethers.getContract('USDF');
        const Timelock = await hre.ethers.getContract('Timelock');
        const endpointV2Deployment = (await hre.deployments.get('EndpointV2'))
        await hre.run(
            'verify:verify',
            {
                address: USDF.address,
                constructorArguments: [
                    TokenConfig(hre.network).USDF.name,
                    TokenConfig(hre.network).USDF.symbol, 
                    [], 
                    endpointV2Deployment.address, // LayerZero's EndpointV2 address
                    deployer, // _defaultAdmin
                    Timelock.address //timelock
                ]
            }
        )
    })

