import { Network } from 'hardhat/types';

interface EarnConfig {
    VESTING_PERIOD: number,
}

const EarnConfig: {[key:string]:EarnConfig} = {
    default: {
        VESTING_PERIOD: 5 * 60,
    },
    bscMainnet: {
        VESTING_PERIOD: 8 * 60 * 60,
    },
}

export default function config(network: Network): EarnConfig {
    return EarnConfig[network.name] ?? EarnConfig['default']
}
