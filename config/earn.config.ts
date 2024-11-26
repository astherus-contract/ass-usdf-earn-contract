import { BigNumber, ethers } from 'ethers';
import { Network } from 'hardhat/types';


interface EarnConfig {
    VESTING_PERIOD: number,
    USDF_MAX_SUPPLY: BigNumber,
    USDF_BURN_COMMISSION_RATE: BigNumber,
    MAX_REWARD_PERCENT: BigNumber,
}

const EarnConfig: {[key:string]:EarnConfig} = {
    default: {
        VESTING_PERIOD: 5 * 60,
        USDF_MAX_SUPPLY: ethers.utils.parseEther('1000000'),
        USDF_BURN_COMMISSION_RATE: ethers.utils.parseUnits('0.001', 4),
        MAX_REWARD_PERCENT: ethers.utils.parseUnits('1', 18),
    },
    bscMainnet: {
        VESTING_PERIOD: 8 * 60 * 60,
        USDF_MAX_SUPPLY: ethers.utils.parseEther('5000000'),
        USDF_BURN_COMMISSION_RATE: ethers.utils.parseUnits('0.001', 4),
        MAX_REWARD_PERCENT: ethers.utils.parseUnits('0.01', 18),
    },
}

export default function config(network: Network): EarnConfig {
    return EarnConfig[network.name] ?? EarnConfig['default']
}
