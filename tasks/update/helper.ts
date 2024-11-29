import { ethers } from "ethers";
import { Address } from "hardhat-deploy/types";
import { UUPSUpgradeable__factory, Timelock } from '../../typechain-types/'
import { HardhatRuntimeEnvironment } from "hardhat/types";

const UPDATE_FUNCTION = 'upgradeToAndCall(address,bytes)';
const TIMELOCK_ABI = '[{"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"string","name":"functionSignature","type":"string"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"executeTask","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"string","name":"functionSignature","type":"string"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"scheduleTask","outputs":[],"stateMutability":"nonpayable","type":"function"}]';
const PROPOSER_ROLE = ethers.utils.id('PROPOSER_ROLE')
const EXECUTOR_ROLE = ethers.utils.id('EXECUTOR_ROLE')
const CANCELLER_ROLE = ethers.utils.id('CANCELLER_ROLE')

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function updateImplementation(
    contractName: string, 
    contractAddress: Address, 
    newImplementation: Address,
    hre: HardhatRuntimeEnvironment,
) {
    const storage = `0x${(BigInt(ethers.utils.id('eip1967.proxy.implementation')) - 1n).toString(16)}`;
    const currentImplementation = hre.ethers.utils.defaultAbiCoder.decode(
        ['address'], 
        await hre.ethers.provider.getStorageAt(contractAddress, storage)
    )[0];

    if (currentImplementation == newImplementation) {
        console.log(`already update to ${currentImplementation}`)
        return
    }

    const Timelock = await hre.ethers.getContract<Timelock>('Timelock')
    const data = '0x' + UUPSUpgradeable__factory
        .createInterface()
        .encodeFunctionData('upgradeToAndCall', [newImplementation, '0x'])
        .substring(10)
    
    const { deployer } = await hre.ethers.getNamedSigners();
    const hasProposerRole = await Timelock.hasRole(PROPOSER_ROLE, deployer.address);
    const hasExecutorRole = await Timelock.hasRole(EXECUTOR_ROLE, deployer.address);
    const minDelay = await Timelock.getMinDelay();

    if (hasProposerRole) {
        const tx = await Timelock.connect(deployer).scheduleTask(contractAddress, UPDATE_FUNCTION, data);
        await tx.wait()
        console.log(`proposer finish: ${tx.hash}`)
    } else {
        console.log(`Update ${contractName} implementation proposer:`)
        console.log(`\tCall contract: ${Timelock.address}`)
        console.log(`\tCall method: scheduleTask`)
        console.log(`\tCall parameters: `)
        console.log(`\t\ttarget: ${contractAddress}`)
        console.log(`\t\tfunctionSignature: ${UPDATE_FUNCTION}`)
        console.log(`\t\tdata: ${data}`)
        console.log(`ABI: ${TIMELOCK_ABI}`)
    }

    if (hasExecutorRole) {
        console.log(`Wait ${minDelay} seconds for Timelock`)
        await delay(minDelay.toNumber() * 1000)
        const tx = await Timelock.connect(deployer).executeTask(contractAddress, UPDATE_FUNCTION, data);
        await tx.wait();
        console.log(`executor finish: ${tx.hash}`)
    } else {
        console.log(`Update ${contractName} implementation executor:`)
        console.log(`\tCall contract: ${Timelock.address}`)
        console.log(`\tCall method: executeTask`)
        console.log(`\tCall parameters: `)
        console.log(`\t\ttarget: ${contractAddress}`)
        console.log(`\t\tfunctionSignature: ${UPDATE_FUNCTION}`)
        console.log(`\t\tdata: ${data}`)
        console.log(`ABI: ${TIMELOCK_ABI}`)
    }
}