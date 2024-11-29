import 'dotenv/config'
import fs from 'fs'
import path, { dirname } from 'path'
import "@nomicfoundation/hardhat-verify";
import '@nomiclabs/hardhat-waffle'

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
import './tasks';
import '@typechain/hardhat'

import { HardhatUserConfig } from 'hardhat/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            ETHERSCAN_KEY_BSC: string,
            TESTNET_DEPLOYER: string,
            MAINNET_DEPLOYER: string,
        }
    }
}

// Supports configuring multiple private keys in separate .secret files, one per line
// Generally, one is used for the mainnet and the other is used for the testnet.
const PRIVATE_KEYS: string[] = [];
const PRIVATE_KEY_FILES = path.join(__dirname, '.secret');
if(fs.existsSync(PRIVATE_KEY_FILES)) {
    fs.readFileSync(PRIVATE_KEY_FILES, 'utf8')
        .split('\n')
        .filter(c => !!c && c != '')
        .map(c => c.startsWith('0x') || c.startsWith('0X') ? c : '0x' + c)
        .forEach(c => PRIVATE_KEYS.push(c))
}

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
            accounts: PRIVATE_KEYS,
            tags: ['testnet']
        },
        'bscMainnet': {
            eid: EndpointId.BSC_V2_MAINNET,
            url: process.env.RPC_URL_SEPOLIA || 'https://bsc-dataseed.binance.org/',
            chainId: 56,
            accounts: PRIVATE_KEYS,
            tags: ['mainnet']
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
            97: process.env.TESTNET_DEPLOYER ? process.env.TESTNET_DEPLOYER : 0,
            56: process.env.MAINNET_DEPLOYER ? process.env.MAINNET_DEPLOYER : 0,
        },
        multisig: {
            default: 1,
            56: '0xa8c0C6Ee62F5AD95730fe23cCF37d1c1FFAA1c3f',
            97: process.env.TESTNET_DEPLOYER ? process.env.TESTNET_DEPLOYER : 0,
        },
        USDT: {
            56: '0x55d398326f99059fF775485246999027B3197955',
            97: '0xB9EF9C975EBB606498d14B105a1619E89255c972',
        },
        bot: {
            31337: 3,
            56: '0xF68Ec3D8e8C4d26e63B91b16432bb5d5a09EFaFe',
            97: process.env.TESTNET_DEPLOYER ? process.env.TESTNET_DEPLOYER : 0,
        },
        ceffu: {
            31337: 4,
            56: '0xfEeACFdB0ec3B848B83De8B7c730Fbf3e472E7Cc',
            97: process.env.TESTNET_DEPLOYER ? process.env.TESTNET_DEPLOYER : 0,
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
