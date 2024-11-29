import * as hre from 'hardhat'
import { AsUSDF, AsUSDFEarn, MockERC20, RewardDispatcher, Timelock, USDF, USDFEarn, WithdrawVault } from '../typechain-types';
import { BaseContract, BigNumber } from 'ethers';
import { ethers } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

const POW18 = BigNumber.from('10').pow(18).toBigInt();

/*
 * user1, user2, emergencyUser deposit USDT for USDF
 * then deposit USDF for asUSDF
 * then transfer all USDT to ceff
 * then ceff earn ${rewardAmount} USDT
 * then ceff mint ${rewardAmount} USDT for USDF
 * then ceff dispatch ${dispatchAmount} USDF for reward at ${dipsatchStartTime}
 * then user1 and user2 withdraw asUSDF for USDF, emergencyUser use emergencyWithdraw
 * then user1 and user2 withdraw USDF for USDT, emergencyUser use emergencyWithdraw
 */
describe('Step3', async() => {
    let deployer: SignerWithAddress;
    let bot: SignerWithAddress;
    let ceffu: SignerWithAddress;
    let multisig: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let emergencyUser: SignerWithAddress;
    
    let Timelock: Timelock;
    let USDT: MockERC20;
    let USDF: USDF;
    let asUSDF: AsUSDF;
    let USDFEarn: USDFEarn;
    let asUSDFEarn: AsUSDFEarn;
    let WithdrawVault: WithdrawVault;
    let RewardDispatcher: RewardDispatcher;

    let rewardAmount: BigNumber;
    let dispatchAmount: BigNumber;
    let dipsatchStartTime: number;

    before(async() => {
        //deploy contract
        await hre.deployments.fixture('Step3');
        //get typechain of Contract
        Timelock = await hre.ethers.getContract<Timelock>('Timelock');
        USDF = await hre.ethers.getContract<USDF>('USDF');
        asUSDF = await hre.ethers.getContract<AsUSDF>('asUSDF');
        USDFEarn = await hre.ethers.getContract<USDFEarn>('USDFEarn');
        asUSDFEarn = await hre.ethers.getContract<AsUSDFEarn>('asUSDFEarn');
        WithdrawVault = await hre.ethers.getContract<WithdrawVault>('WithdrawVault');
        RewardDispatcher = await hre.ethers.getContract<RewardDispatcher>('RewardDispatcher');
        USDT = await hre.ethers.getContractAt('MockERC20', await USDFEarn.USDT()) as BaseContract as MockERC20;
        //get some wallet
        ;({ deployer, bot, ceffu, multisig } = await hre.ethers.getNamedSigners())
        ;[, , , , user1, user2, emergencyUser] = (await hre.ethers.getSigners());
        //mint enough token for users
        await USDT.mint(user1.address, hre.ethers.utils.parseEther('1000000'));
        await USDT.mint(user2.address, hre.ethers.utils.parseEther('1000000'));
        await USDT.mint(emergencyUser.address, hre.ethers.utils.parseEther('1000000'));
    })
    beforeEach(async() => {

    })

    it('Deposit USDT->USDF', async() => {
        const amount = hre.ethers.utils.parseEther('1000');
        const mintCommissionRate = await USDFEarn.commissionRate();
        {
            await USDT.connect(user1).approve(USDFEarn.address, hre.ethers.constants.MaxUint256);
            const USDTBalanceBefore = await USDT.balanceOf(user1.address);
            const USDFBalanceBefore = await USDF.balanceOf(user1.address);
            await USDFEarn.connect(user1).deposit(amount);
            const USDTBalanceAfter = await USDT.balanceOf(user1.address);
            const USDFBalanceAfter = await USDF.balanceOf(user1.address);
            expect(USDTBalanceBefore.sub(USDTBalanceAfter).toBigInt())
                .to.be.equal(amount.toBigInt());
            expect(USDFBalanceAfter.sub(USDFBalanceBefore).toBigInt())
                .to.be.equal(amount.sub(amount.mul(mintCommissionRate).div(BigNumber.from('10000'))).toBigInt());
        }
        {
            await USDT.connect(user2).approve(USDFEarn.address, hre.ethers.constants.MaxUint256);
            const USDTBalanceBefore = await USDT.balanceOf(user2.address);
            const USDFBalanceBefore = await USDF.balanceOf(user2.address);
            await USDFEarn.connect(user2).deposit(amount);
            const USDTBalanceAfter = await USDT.balanceOf(user2.address);
            const USDFBalanceAfter = await USDF.balanceOf(user2.address);
            expect(USDTBalanceBefore.sub(USDTBalanceAfter).toBigInt())
                .to.be.equal(amount.toBigInt());
            expect(USDFBalanceAfter.sub(USDFBalanceBefore).toBigInt())
                .to.be.equal(amount.sub(amount.mul(mintCommissionRate).div(BigNumber.from('10000'))).toBigInt());
        }
        {
            await USDT.connect(emergencyUser).approve(USDFEarn.address, hre.ethers.constants.MaxUint256);
            const USDTBalanceBefore = await USDT.balanceOf(emergencyUser.address);
            const USDFBalanceBefore = await USDF.balanceOf(emergencyUser.address);
            await USDFEarn.connect(emergencyUser).deposit(amount);
            const USDTBalanceAfter = await USDT.balanceOf(emergencyUser.address);
            const USDFBalanceAfter = await USDF.balanceOf(emergencyUser.address);
            expect(USDTBalanceBefore.sub(USDTBalanceAfter).toBigInt())
                .to.be.equal(amount.toBigInt());
            expect(USDFBalanceAfter.sub(USDFBalanceBefore).toBigInt())
                .to.be.equal(amount.sub(amount.mul(mintCommissionRate).div(BigNumber.from('10000'))).toBigInt());
        }
    })

    it('Deposit USDF->asUSDF', async() => {
        const amount = ethers.utils.parseEther('1000');
        //default exchangePrice is 1e18
        const oldExchangePrice = await asUSDFEarn.exchangePrice();
        expect(oldExchangePrice.toBigInt()).to.be.equal(POW18)
        {
            await USDF.connect(user1).approve(asUSDFEarn.address, ethers.constants.MaxUint256)
            const USDFBalanceBefore = await USDF.balanceOf(user1.address);
            const asUSDFBalanceBefore = await asUSDF.balanceOf(user1.address);
            await asUSDFEarn.connect(user1).deposit(amount);
            const USDFBalanceAfter = await USDF.balanceOf(user1.address);
            const asUSDFBalanceAfter = await asUSDF.balanceOf(user1.address);
            expect(USDFBalanceBefore.sub(USDFBalanceAfter).toBigInt())
                .to.be.equal(amount.toBigInt())
            expect(asUSDFBalanceAfter.sub(asUSDFBalanceBefore).toBigInt())
                .to.be.equal(amount.mul(oldExchangePrice).div(POW18).toBigInt());
            //no additional rewards, so exchangePrice will not change
            expect((await asUSDFEarn.exchangePrice()).toBigInt()).to.be.equal(oldExchangePrice.toBigInt());
            expect((await USDF.balanceOf(asUSDFEarn.address)).div(await asUSDF.totalSupply()).mul(POW18).toBigInt())
                .to.be.equal(oldExchangePrice.toBigInt())
        }
        {
            await USDF.connect(user2).approve(asUSDFEarn.address, ethers.constants.MaxUint256)
            const USDFBalanceBefore = await USDF.balanceOf(user2.address);
            const asUSDFBalanceBefore = await asUSDF.balanceOf(user2.address);
            await asUSDFEarn.connect(user2).deposit(amount);
            const USDFBalanceAfter = await USDF.balanceOf(user2.address);
            const asUSDFBalanceAfter = await asUSDF.balanceOf(user2.address);
            expect(USDFBalanceBefore.sub(USDFBalanceAfter).toBigInt())
                .to.be.equal(amount.toBigInt())
            expect(asUSDFBalanceAfter.sub(asUSDFBalanceBefore).toBigInt())
                .to.be.equal(amount.mul(oldExchangePrice).div(POW18).toBigInt());
            //no additional rewards, so exchangePrice will not change
            expect((await asUSDFEarn.exchangePrice()).toBigInt()).to.be.equal(oldExchangePrice.toBigInt());
            expect((await USDF.balanceOf(asUSDFEarn.address)).div(await asUSDF.totalSupply()).mul(POW18).toBigInt())
                .to.be.equal(oldExchangePrice.toBigInt())
        }
        {
            await USDF.connect(emergencyUser).approve(asUSDFEarn.address, ethers.constants.MaxUint256)
            const USDFBalanceBefore = await USDF.balanceOf(emergencyUser.address);
            const asUSDFBalanceBefore = await asUSDF.balanceOf(emergencyUser.address);
            await asUSDFEarn.connect(emergencyUser).deposit(amount);
            const USDFBalanceAfter = await USDF.balanceOf(emergencyUser.address);
            const asUSDFBalanceAfter = await asUSDF.balanceOf(emergencyUser.address);
            expect(USDFBalanceBefore.sub(USDFBalanceAfter).toBigInt())
                .to.be.equal(amount.toBigInt())
            expect(asUSDFBalanceAfter.sub(asUSDFBalanceBefore).toBigInt())
                .to.be.equal(amount.mul(oldExchangePrice).div(POW18).toBigInt());
            //no additional rewards, so exchangePrice will not change
            expect((await asUSDFEarn.exchangePrice()).toBigInt()).to.be.equal(oldExchangePrice.toBigInt());
            expect((await USDF.balanceOf(asUSDFEarn.address)).div(await asUSDF.totalSupply()).mul(POW18).toBigInt())
                .to.be.equal(oldExchangePrice.toBigInt())
        }
    })

    it('transferToCeffu', async() => {
        const USDTBalance = await USDT.balanceOf(USDFEarn.address);
        const USDTBalanceBefore = await USDT.balanceOf(ceffu.address);
        await USDFEarn.connect(bot).transferToCeffu();
        const USDTBalanceAfter = await USDT.balanceOf(ceffu.address);
        expect(USDTBalanceAfter.sub(USDTBalanceBefore).toBigInt()).to.be.equal(USDTBalance.toBigInt())
    })

    it('Dispatch Reward', async() => {
        //mint USDT to ceffu for Simulated profit
        rewardAmount = ethers.utils.parseEther('1000');
        await USDT.mint(ceffu.address, rewardAmount);
        //back server will do this
        await USDT.connect(ceffu).transfer(RewardDispatcher.address, rewardAmount);
        const oldUSDFBalance = await USDF.balanceOf(asUSDFEarn.address);
        const oldUSDFTotalSupply = await USDF.totalSupply();
        {
            const USDTBalanceBefore = await USDT.balanceOf(RewardDispatcher.address);
            const USDFBalanceBefore = await USDF.balanceOf(RewardDispatcher.address);
            await RewardDispatcher.connect(bot).mintReward(rewardAmount);
            const USDTBalanceAfter = await USDT.balanceOf(RewardDispatcher.address);
            const USDFBalanceAfter = await USDF.balanceOf(RewardDispatcher.address);
            expect(USDTBalanceBefore.sub(USDTBalanceAfter).toBigInt()).to.be.equal(rewardAmount.toBigInt());
            const mintCommissionRate = await USDFEarn.commissionRate();
            expect((USDFBalanceAfter.sub(USDFBalanceBefore)).toBigInt())
                .to.be.equal(rewardAmount.sub(rewardAmount.mul(mintCommissionRate).div(BigNumber.from('10000'))).toBigInt());
        }
        dispatchAmount = ethers.utils.parseEther('500');
        {
            const RewardUSDFBalanceBefore = await USDF.balanceOf(RewardDispatcher.address);
            const EarnUSDFBalanceBefore = await USDF.balanceOf(asUSDFEarn.address);
            await RewardDispatcher.connect(bot).dispatchReward(dispatchAmount);
            const RewardUSDFBalanceAfter = await USDF.balanceOf(RewardDispatcher.address);
            const EarnUSDFBalanceAfter = await USDF.balanceOf(asUSDFEarn.address);
            expect(RewardUSDFBalanceBefore.sub(RewardUSDFBalanceAfter).toBigInt()).to.be.equal(dispatchAmount.toBigInt());
            expect(EarnUSDFBalanceAfter.sub(EarnUSDFBalanceBefore).toBigInt()).to.be.equal(dispatchAmount.toBigInt());
            dipsatchStartTime = (await hre.ethers.provider.getBlock('latest')).timestamp;
        }
        //the dispatch reward will released by liner
        //at the begining the exchangePrice will not change
        expect((await asUSDFEarn.exchangePrice()).toBigInt()).to.be.equal(POW18);
        const VESTING_PERIOD = await asUSDFEarn.VESTING_PERIOD();
        //after 60s should release 60 / VESTING_PERIOD of the dispatchAmount
        await hre.ethers.provider.send("evm_mine", [dipsatchStartTime + 60])
        expect(((await asUSDFEarn.exchangePrice()).toBigInt()))
            .to.be.equal(oldUSDFBalance.add(dispatchAmount.mul(60).div(VESTING_PERIOD)).mul(POW18).div(oldUSDFTotalSupply).toBigInt())
        //so is after 120s
        await hre.ethers.provider.send("evm_mine", [dipsatchStartTime + 120])
        expect(((await asUSDFEarn.exchangePrice()).toBigInt()))
            .to.be.equal(oldUSDFBalance.add(dispatchAmount.mul(120).div(VESTING_PERIOD)).mul(POW18).div(oldUSDFTotalSupply).toBigInt())
        //and can't dispatchReward again
        {
            const RewardUSDFBalanceBefore = await USDF.balanceOf(RewardDispatcher.address);
            const EarnUSDFBalanceBefore = await USDF.balanceOf(asUSDFEarn.address);
            await RewardDispatcher.connect(bot).dispatchReward(dispatchAmount);
            const RewardUSDFBalanceAfter = await USDF.balanceOf(RewardDispatcher.address);
            const EarnUSDFBalanceAfter = await USDF.balanceOf(asUSDFEarn.address);
            expect(RewardUSDFBalanceBefore.sub(RewardUSDFBalanceAfter).toBigInt()).to.be.equal(ethers.constants.Zero.toBigInt());
            expect(EarnUSDFBalanceAfter.sub(EarnUSDFBalanceBefore).toBigInt()).to.be.equal(ethers.constants.Zero.toBigInt());
        }
        //after VESTING_PERIOD all dispatch reward should be released
        await hre.ethers.provider.send("evm_mine", [dipsatchStartTime + VESTING_PERIOD.toNumber()])
        expect(((await asUSDFEarn.exchangePrice()).toBigInt()))
            .to.be.equal(oldUSDFBalance.add(dispatchAmount).mul(POW18).div(oldUSDFTotalSupply).toBigInt())
        //and can dispatchReward again
        {
            const RewardUSDFBalanceBefore = await USDF.balanceOf(RewardDispatcher.address);
            const EarnUSDFBalanceBefore = await USDF.balanceOf(asUSDFEarn.address);
            await RewardDispatcher.connect(bot).dispatchReward(dispatchAmount);
            const RewardUSDFBalanceAfter = await USDF.balanceOf(RewardDispatcher.address);
            const EarnUSDFBalanceAfter = await USDF.balanceOf(asUSDFEarn.address);
            expect(RewardUSDFBalanceBefore.sub(RewardUSDFBalanceAfter).toBigInt()).to.be.equal(dispatchAmount.toBigInt());
            expect(EarnUSDFBalanceAfter.sub(EarnUSDFBalanceBefore).toBigInt()).to.be.equal(dispatchAmount.toBigInt());
            dipsatchStartTime = (await hre.ethers.provider.getBlock('latest')).timestamp;
        }
    })

    it("Withdraw asUSDF->USDF", async() => {
        //user1 withdraw after 60s
        {
            await asUSDF.connect(user1).approve(asUSDFEarn.address, ethers.constants.MaxUint256);
            const withdrawAmount = await asUSDF.balanceOf(user1.address)
            await hre.network.provider.send("evm_setAutomine", [false]);
            await asUSDFEarn.connect(user1).requestWithdraw(withdrawAmount);
            await hre.ethers.provider.send("evm_mine", [dipsatchStartTime + 60])
            await hre.network.provider.send("evm_setAutomine", [true]);
            const exchangePrice = await asUSDFEarn.exchangePrice();
            const requestWithdrawNo = await asUSDFEarn.requestWithdrawMaxNo();
            const requestWithdraw = await asUSDFEarn.requestWithdraws(requestWithdrawNo);
            expect(requestWithdraw.withdrawToken).to.be.equal(asUSDF.address);
            expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
            expect(requestWithdraw.claimable).to.be.equal(false);
            expect(requestWithdraw.receiveAmount.toBigInt()).to.be.equal(withdrawAmount.mul(exchangePrice).div(POW18).toBigInt())
            expect(requestWithdraw.receipt).to.be.equal(user1.address);
            expect(requestWithdraw.emergency).to.be.equal(false);
        }
        //user2 withdraw after 120s
        {
            await asUSDF.connect(user2).approve(asUSDFEarn.address, ethers.constants.MaxUint256);
            const withdrawAmount = await asUSDF.balanceOf(user2.address)
            await hre.network.provider.send("evm_setAutomine", [false]);
            await asUSDFEarn.connect(user2).requestWithdraw(withdrawAmount);
            await hre.ethers.provider.send("evm_mine", [dipsatchStartTime + 120])
            await hre.network.provider.send("evm_setAutomine", [true]);
            const exchangePrice = await asUSDFEarn.exchangePrice();
            const requestWithdrawNo = await asUSDFEarn.requestWithdrawMaxNo();
            const requestWithdraw = await asUSDFEarn.requestWithdraws(requestWithdrawNo);
            expect(requestWithdraw.withdrawToken).to.be.equal(asUSDF.address);
            expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
            expect(requestWithdraw.claimable).to.be.equal(false);
            expect(requestWithdraw.receiveAmount.toBigInt()).to.be.equal(withdrawAmount.mul(exchangePrice).div(POW18).toBigInt())
            expect(requestWithdraw.receipt).to.be.equal(user2.address);
            expect(requestWithdraw.emergency).to.be.equal(false);
        }
        //emergency User Withdraw by emergencyWithdraw and after VESTING_PERIOD
        {
            await asUSDFEarn.connect(multisig).addEmergencyWithdrawWhitelist([emergencyUser.address]);
            await asUSDF.connect(emergencyUser).approve(asUSDFEarn.address, ethers.constants.MaxUint256);
            const withdrawAmount = await asUSDF.balanceOf(emergencyUser.address)
            await hre.network.provider.send("evm_setAutomine", [false]);
            await asUSDFEarn.connect(emergencyUser).requestEmergencyWithdraw(withdrawAmount);
            const VESTING_PERIOD = await asUSDFEarn.VESTING_PERIOD();
            await hre.ethers.provider.send("evm_mine", [dipsatchStartTime + VESTING_PERIOD.toNumber()])
            await hre.network.provider.send("evm_setAutomine", [true]);
            const exchangePrice = await asUSDFEarn.exchangePrice();
            //all the reward claimed, so the exchangePrice should be POW18 again
            expect(exchangePrice.toBigInt()).to.be.equal(POW18)
            const requestWithdrawNo = await asUSDFEarn.requestWithdrawMaxNo();
            const requestWithdraw = await asUSDFEarn.requestWithdraws(requestWithdrawNo);
            expect(requestWithdraw.withdrawToken).to.be.equal(asUSDF.address);
            expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
            expect(requestWithdraw.claimable).to.be.equal(false);
            expect(requestWithdraw.receipt).to.be.equal(emergencyUser.address);
            expect(requestWithdraw.emergency).to.be.equal(true);
        }
        {
            await asUSDFEarn.connect(bot).distributeWithdraw([
                {requestWithdrawNo: 1, receipt: user1.address, withdrawToken: asUSDF.address},
                {requestWithdrawNo: 2, receipt: user2.address, withdrawToken: asUSDF.address},
                {requestWithdrawNo: 3, receipt: emergencyUser.address, withdrawToken: asUSDF.address},
            ])
            expect((await asUSDFEarn.requestWithdraws(1)).claimable).to.be.equal(true);
            expect((await asUSDFEarn.requestWithdraws(2)).claimable).to.be.equal(true);
            expect((await asUSDFEarn.requestWithdraws(3)).claimable).to.be.equal(true);
        }
        {
            const receiveAmount = (await asUSDFEarn.requestWithdraws(1)).receiveAmount;
            const USDFBalanceBefore = await USDF.balanceOf(user1.address);
            await asUSDFEarn.connect(user1).claimWithdraw([1]);
            const USDFBalanceAfter = await USDF.balanceOf(user1.address);
            expect(USDFBalanceAfter.sub(USDFBalanceBefore).toBigInt()).to.be.equal(receiveAmount.toBigInt());
            expect((await asUSDFEarn.requestWithdraws(1)).claimable).to.be.equal(false);
            expect((await asUSDFEarn.requestWithdraws(1)).receipt).to.be.equal(ethers.constants.AddressZero);
        }
        {
            const receiveAmount = (await asUSDFEarn.requestWithdraws(2)).receiveAmount;
            const USDFBalanceBefore = await USDF.balanceOf(user2.address);
            await asUSDFEarn.connect(user2).claimWithdraw([2]);
            const USDFBalanceAfter = await USDF.balanceOf(user2.address);
            expect(USDFBalanceAfter.sub(USDFBalanceBefore).toBigInt()).to.be.equal(receiveAmount.toBigInt());
            expect((await asUSDFEarn.requestWithdraws(2)).claimable).to.be.equal(false);
            expect((await asUSDFEarn.requestWithdraws(2)).receipt).to.be.equal(ethers.constants.AddressZero);
        }
        {
            const receiveAmount = (await asUSDFEarn.requestWithdraws(3)).receiveAmount;
            const USDFBalanceBefore = await USDF.balanceOf(emergencyUser.address);
            await asUSDFEarn.connect(emergencyUser).claimWithdraw([3]);
            const USDFBalanceAfter = await USDF.balanceOf(emergencyUser.address);
            expect(USDFBalanceAfter.sub(USDFBalanceBefore).toBigInt()).to.be.equal(receiveAmount.toBigInt());
            expect((await asUSDFEarn.requestWithdraws(3)).claimable).to.be.equal(false);
            expect((await asUSDFEarn.requestWithdraws(3)).receipt).to.be.equal(ethers.constants.AddressZero);
        }
        //all user withdraw all asset, and all reward released, so balanceOf and totalSupply shoud be zero
        expect((await USDF.balanceOf(asUSDF.address)).toBigInt()).to.be.equal(ethers.constants.Zero.toBigInt());
        expect((await asUSDF.totalSupply()).toBigInt()).to.be.equal(ethers.constants.Zero.toBigInt());
    })

    it('Withdraw USDF->USDT', async() => {
        const burnCommissionRate = await USDFEarn.burnCommissionRate();
        let totalWithdrawAmount = ethers.constants.Zero;
        {
            await USDF.connect(user1).approve(USDFEarn.address, ethers.constants.MaxUint256);
            const withdrawAmount = await USDF.balanceOf(user1.address)
            await USDFEarn.connect(user1).requestWithdraw(withdrawAmount);
            const requestWithdrawNo = await USDFEarn.requestWithdrawMaxNo();
            const requestWithdraw = await USDFEarn.requestWithdraws(requestWithdrawNo);
            expect(requestWithdraw.withdrawToken).to.be.equal(USDF.address);
            expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
            expect(requestWithdraw.claimable).to.be.equal(false);
            expect(requestWithdraw.receiveAmount.toBigInt()).to.be.equal(withdrawAmount.sub(withdrawAmount.mul(burnCommissionRate).div('10000')).toBigInt());
            expect(requestWithdraw.receipt).to.be.equal(user1.address);
            expect(requestWithdraw.emergency).to.be.equal(false);
            totalWithdrawAmount = totalWithdrawAmount.add(requestWithdraw.receiveAmount);
        }
        {
            await USDF.connect(user2).approve(USDFEarn.address, ethers.constants.MaxUint256);
            const withdrawAmount = await USDF.balanceOf(user2.address)
            await USDFEarn.connect(user2).requestWithdraw(withdrawAmount);
            const requestWithdrawNo = await USDFEarn.requestWithdrawMaxNo();
            const requestWithdraw = await USDFEarn.requestWithdraws(requestWithdrawNo);
            expect(requestWithdraw.withdrawToken).to.be.equal(USDF.address);
            expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
            expect(requestWithdraw.claimable).to.be.equal(false);
            expect(requestWithdraw.receiveAmount.toBigInt()).to.be.equal(withdrawAmount.sub(withdrawAmount.mul(burnCommissionRate).div('10000')).toBigInt());
            expect(requestWithdraw.receipt).to.be.equal(user2.address);
            expect(requestWithdraw.emergency).to.be.equal(false);
            totalWithdrawAmount = totalWithdrawAmount.add(requestWithdraw.receiveAmount);
        }
        {
            await USDFEarn.connect(multisig).addEmergencyWithdrawWhitelist([emergencyUser.address]);
            await USDF.connect(emergencyUser).approve(USDFEarn.address, ethers.constants.MaxUint256);
            const withdrawAmount = await USDF.balanceOf(emergencyUser.address)
            await USDFEarn.connect(emergencyUser).requestEmergencyWithdraw(withdrawAmount);
            const requestWithdrawNo = await USDFEarn.requestWithdrawMaxNo();
            const requestWithdraw = await USDFEarn.requestWithdraws(requestWithdrawNo);
            expect(requestWithdraw.withdrawToken).to.be.equal(USDF.address);
            expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
            expect(requestWithdraw.claimable).to.be.equal(false);
            expect(requestWithdraw.receiveAmount.toBigInt()).to.be.equal(withdrawAmount.sub(withdrawAmount.mul(burnCommissionRate).div('10000')).toBigInt());
            expect(requestWithdraw.receipt).to.be.equal(emergencyUser.address);
            expect(requestWithdraw.emergency).to.be.equal(true);
            totalWithdrawAmount = totalWithdrawAmount.add(requestWithdraw.receiveAmount);
        }
        {
            await USDFEarn.connect(bot).distributeWithdraw([
                {requestWithdrawNo: 1, receipt: user1.address, withdrawToken: USDF.address},
                {requestWithdrawNo: 2, receipt: user2.address, withdrawToken: USDF.address},
                {requestWithdrawNo: 3, receipt: emergencyUser.address, withdrawToken: USDF.address},
            ])
            expect((await USDFEarn.requestWithdraws(1)).claimable).to.be.equal(true);
            expect((await USDFEarn.requestWithdraws(2)).claimable).to.be.equal(true);
            expect((await USDFEarn.requestWithdraws(3)).claimable).to.be.equal(true);
        }
        await USDFEarn.connect(bot).transferToCeffu();
        //this will be done by back server
        await USDT.connect(ceffu).transfer(WithdrawVault.address, totalWithdrawAmount);
        {
            const receiveAmount = (await USDFEarn.requestWithdraws(1)).receiveAmount;
            const USDTBalanceBefore = await USDT.balanceOf(user1.address);
            await USDFEarn.connect(user1).claimWithdraw([1]);
            const USDTBalanceAfter = await USDT.balanceOf(user1.address);
            expect(USDTBalanceAfter.sub(USDTBalanceBefore).toBigInt()).to.be.equal(receiveAmount.toBigInt());
            expect((await USDFEarn.requestWithdraws(1)).claimable).to.be.equal(false);
            expect((await USDFEarn.requestWithdraws(1)).receipt).to.be.equal(ethers.constants.AddressZero);
        }
        {
            const receiveAmount = (await USDFEarn.requestWithdraws(2)).receiveAmount;
            const USDTBalanceBefore = await USDT.balanceOf(user2.address);
            await USDFEarn.connect(user2).claimWithdraw([2]);
            const USDTBalanceAfter = await USDT.balanceOf(user2.address);
            expect(USDTBalanceAfter.sub(USDTBalanceBefore).toBigInt()).to.be.equal(receiveAmount.toBigInt());
            expect((await USDFEarn.requestWithdraws(2)).claimable).to.be.equal(false);
            expect((await USDFEarn.requestWithdraws(2)).receipt).to.be.equal(ethers.constants.AddressZero);
        }
        {
            const receiveAmount = (await USDFEarn.requestWithdraws(3)).receiveAmount;
            const USDTBalanceBefore = await USDT.balanceOf(emergencyUser.address);
            await USDFEarn.connect(emergencyUser).claimWithdraw([3]);
            const USDTBalanceAfter = await USDT.balanceOf(emergencyUser.address);
            expect(USDTBalanceAfter.sub(USDTBalanceBefore).toBigInt()).to.be.equal(receiveAmount.toBigInt());
            expect((await USDFEarn.requestWithdraws(3)).claimable).to.be.equal(false);
            expect((await USDFEarn.requestWithdraws(3)).receipt).to.be.equal(ethers.constants.AddressZero);
        }
        expect((await USDF.totalSupply()).toBigInt()).to.be.equal(ethers.constants.Zero.toBigInt());
        expect((await USDT.balanceOf(WithdrawVault.address)).toBigInt()).to.be.equal(ethers.constants.Zero.toBigInt());
    })

    it('Deposit Again', async() => {
        //no deposit agin in asUSDF, so if we dispatch reward, the reward will remain in contract
        rewardAmount = ethers.utils.parseEther('500');
        await USDT.mint(ceffu.address, rewardAmount);
        await USDT.connect(ceffu).transfer(RewardDispatcher.address, rewardAmount);
        await RewardDispatcher.connect(bot).mintReward(rewardAmount);

        dispatchAmount = ethers.utils.parseEther('500');
        await RewardDispatcher.connect(bot).dispatchReward(dispatchAmount);
        dipsatchStartTime = (await hre.ethers.provider.getBlock('latest')).timestamp;

        const VESTING_PERIOD = await asUSDFEarn.VESTING_PERIOD();
        await hre.ethers.provider.send("evm_mine", [dipsatchStartTime + VESTING_PERIOD.toNumber()])

        expect((await asUSDFEarn.exchangePrice()).toBigInt()).to.be.equal(POW18);
        //then user deposit USDT->USDF->asUSDF
        const amount = hre.ethers.utils.parseEther('1000');
        await USDFEarn.connect(user1).mintAsUSDF(amount)
        // await USDFEarn.connect(user1).deposit(amount);
        // await asUSDFEarn.connect(user1).deposit(amount);
        expect((await asUSDF.balanceOf(user1.address)).toBigInt()).to.be.equal(amount.toBigInt());
        //but he will get all the dispatch reward
        const exchangePrice = await asUSDFEarn.exchangePrice();
        expect(exchangePrice.toBigInt()).to.be.equal(amount.add(dispatchAmount).mul(POW18).div(amount).toBigInt());
        await asUSDFEarn.connect(user1).requestWithdraw(amount);
        const requestWithdrawNo = await asUSDFEarn.requestWithdrawMaxNo();
        const requestWithdraw = await asUSDFEarn.requestWithdraws(requestWithdrawNo);
        expect(requestWithdraw.receiveAmount.toBigInt()).to.be.equal(amount.add(dispatchAmount).toBigInt());
        await asUSDFEarn.connect(bot).distributeWithdraw([{requestWithdrawNo: requestWithdrawNo, receipt: user1.address, withdrawToken: asUSDF.address}])
        await asUSDFEarn.connect(user1).claimWithdraw([requestWithdrawNo]);
        expect((await USDF.balanceOf(user1.address)).toBigInt()).to.be.equal(amount.add(dispatchAmount).toBigInt());
        
        await USDFEarn.connect(user1).requestWithdraw(amount.add(dispatchAmount));
        await USDFEarn.connect(bot).distributeWithdraw([{requestWithdrawNo: requestWithdrawNo, receipt: user1.address, withdrawToken: USDF.address}])
        await USDFEarn.connect(bot).transferToCeffu();
        await USDT.connect(ceffu).transfer(WithdrawVault.address, amount.add(dispatchAmount));
        const USDTBalanceBefore = await USDT.balanceOf(user1.address);
        await USDFEarn.connect(user1).claimWithdraw([requestWithdrawNo]);
        const USDTBalanceAfter = await USDT.balanceOf(user1.address);
        const burnCommissionRate = await USDFEarn.burnCommissionRate();
        expect(USDTBalanceAfter.sub(USDTBalanceBefore).toBigInt())
            .to.be.equal(amount.add(dispatchAmount).sub(amount.add(dispatchAmount).mul(burnCommissionRate).div('10000')).toBigInt())
    })
})