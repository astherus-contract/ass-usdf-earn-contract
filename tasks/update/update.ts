import { task } from 'hardhat/config'
import { updateImplementation } from './helper';

task('update', 'update contract implementation')
    .addParam<string>('contractName', 'the name of contract')
    .setAction(async({ contractName }, hre) => {
        const proxy = await hre.ethers.getContract(contractName);
        const implementation = await hre.ethers.getContract(`${contractName}_Implementation`)
        await updateImplementation(contractName, proxy.address, implementation.address, hre)
    })