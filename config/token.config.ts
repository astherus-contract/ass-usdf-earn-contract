import { Network } from 'hardhat/types';

interface TokenConfig {
    name: string,
    symbol: string,
}
type Tokens = 'USDF' | 'asUSDF';

const TokenConfig: {[key:string]:{[key in Tokens]:TokenConfig}} = {
    default: {
        USDF: {
            name: 'Astherus USDF',
            symbol: 'USDF',
        },
        asUSDF: {
            name: 'Astherus asUSDF',
            symbol: 'asUSDF',
        },
    },
    bscMainnet: {
        USDF: {
            name: 'Astherus USDF',
            symbol: 'USDF',
        },
        asUSDF: {
            name: 'Astherus asUSDF',
            symbol: 'asUSDF',
        },
    },
}

export default function config(network: Network): {[key in Tokens]:TokenConfig} {
    return TokenConfig[network.name] ?? TokenConfig['default']
}

// export default TokenConfig[hre.network.name] ?? TokenConfig['default']
