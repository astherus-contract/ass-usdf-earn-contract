import { ethers } from "ethers";
import * as hre from 'hardhat';
import { Timelock } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
describe('Step3.deploy', async() => {
    const TIMELOCK_ADDRESS = '0xe829a87F4Dfa41B032D8B6Feca6C2213d6ee1861';
    const USDFEARN_IMPLEMENTATION_ADDRESS = '0x63A2aCEBDD98911d252B7A45642Ea7685cBb5c6E';
    const AsUSDFEARN_IMPLEMENTATION_ADDRESS = '0x29f30635431426363D130aa163816Ead1101662f';
    const WITHDRAW_VAULT_ADDRESS = '0xAd4836bBf3671EBd4f2e1F49119c1184655E47CA';
    const REWARD_DISPATCHER_ADDRESS = '0x56F966fD321128A2a4E107aF82282455e9025D02';
    const BOT_ADDRESS = '0xB4AACDA6F49b9c140ee1E9b74F5A982364F3D8ae';
    const ADMIN_ADDRESS = '0xa8c0C6Ee62F5AD95730fe23cCF37d1c1FFAA1c3f';
    const MAX_REWARD_PERCENT = ethers.utils.parseEther('0.01')

    let TimeLock: Timelock;
    let admin: SignerWithAddress;
    before(async() => {
        //unlock admin
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ADMIN_ADDRESS],
        });
        admin = await hre.ethers.getSigner(ADMIN_ADDRESS);
        //set enough balance
        await hre.network.provider.send("hardhat_setBalance", [
            admin.address,
            ethers.utils.parseEther('10').toHexString(),
        ]);
        TimeLock = await hre.ethers.getContractAt<Timelock>('Timelock', TIMELOCK_ADDRESS);
    })

    it('Update', async() => {
        console.log(hre.network);
        console.log(TimeLock.address);
        console.log(await TimeLock.MAX_DELAY())
    })

    it('Check', async() => {

    })
})