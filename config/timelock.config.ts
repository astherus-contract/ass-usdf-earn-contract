import * as hre from 'hardhat';

interface TimeLockConfig {
    minDelay: number,
    maxDelay: number,
}
const TimeLockConfig: {[key:string]:TimeLockConfig} = {
    default: {
        minDelay: 5,
        maxDelay: 365 * 24 * 60 * 60,
        
    },
    bscMainnet: {
        minDelay: 6 * 60 * 60,
        maxDelay: 24 * 60 * 60,
    },
}

export default TimeLockConfig[hre.network.name] ?? TimeLockConfig['default']
