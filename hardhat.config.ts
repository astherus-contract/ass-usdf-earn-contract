import 'dotenv/config'

//import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import '@nomiclabs/hardhat-waffle'
//import "@nomicfoundation/hardhat-ethers";
import '@layerzerolabs/toolbox-hardhat'
import '@nomiclabs/hardhat-ethers'
import 'hardhat-deploy';
import "hardhat-deploy-ethers";
import 'hardhat-abi-exporter';
import 'hardhat-abi-exporter';
//import './tasks';
import '@typechain/hardhat'

import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            MNEMONICS: string,
            PRIVATE_KEY: string,
            ETHERSCAN_KEY_BSC: string,
        }
    }
}

// Set your preferred authentication method
//
// If you prefer using a mnemonic, set a MNEMONIC environment variable
// to a valid mnemonic
const MNEMONIC = process.env.MNEMONIC

// If you prefer to be authenticated using a private key, set a PRIVATE_KEY environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY

const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
    ? { mnemonic: MNEMONIC }
    : PRIVATE_KEY
        ? [PRIVATE_KEY]
        : undefined

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.25',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000,
                    },
                    viaIR: true
                },
            },
        ],
    },
    networks: {
        'bscTestnet': {
            eid: EndpointId.BSC_V2_TESTNET,
            url: process.env.RPC_URL_SEPOLIA || 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
            chainId: 97,
            accounts,
            tags: ['testnet']
        },
        'bscMainnet': {
            eid: EndpointId.BSC_V2_MAINNET,
            url: process.env.RPC_URL_SEPOLIA || 'https://bsc-dataseed.binance.org/',
            chainId: 56,
            accounts,
            tags: ['mainnet']
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // wallet address of index[0], of the mnemonic in .env
        },
        multisig: {
            default: 1,
            56: '0xF68Ec3D8e8C4d26e63B91b16432bb5d5a09EFaFe',
            97: '0xa8c0C6Ee62F5AD95730fe23cCF37d1c1FFAA1c3f',
        },
        USDT: {
            56: '0x55d398326f99059fF775485246999027B3197955',
            97: '0xB9EF9C975EBB606498d14B105a1619E89255c972',
        },
        bot: {
            31337: 3,
            56: '0x0000000000000000000000000000000000000000',
            97: '0x0000000000000000000000000000000000000000',
        },
        ceffu: {
            31337: 4,
            56: '0x0000000000000000000000000000000000000000',
            97: '0x0000000000000000000000000000000000000000',
        },
    },
    etherscan: {
        // npx hardhat verify --network sepolia <address> <Constructor argument>
        apiKey: {
            // 查看有哪些 apiKey 配置的命令: npx hardhat verify --list-networks
            bsc: process.env.ETHERSCAN_KEY_BSC,
            bscTestnet: process.env.ETHERSCAN_KEY_BSC,
        },
    }
}

export default config
