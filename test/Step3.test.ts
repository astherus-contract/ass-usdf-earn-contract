import * as hre from 'hardhat'
import { AsUSDF, AsUSDFEarn, MockERC20, RewardDispatcher, Timelock, USDF, USDFEarn, WithdrawVault } from '../typechain-types';
import { BaseContract, Signer } from 'ethers';
import { ethers } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

describe('Step3', async() => {
    let Timelock: Timelock;
    let USDT: MockERC20;
    let USDF: USDF;
    let asUSDF: AsUSDF;
    let USDFEarn: USDFEarn;
    let asUSDFEarn: AsUSDFEarn;
    let WithdrawVault: WithdrawVault;
    let RewardDispatcher: RewardDispatcher;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let emergencyUser: SignerWithAddress;
    let bot: SignerWithAddress;
    let ceffu: SignerWithAddress;

    before(async() => {
        await hre.deployments.fixture('Step3');
        Timelock = await hre.ethers.getContract<Timelock>('Timelock');
        USDF = await hre.ethers.getContract<USDF>('USDF');
        asUSDF = await hre.ethers.getContract<AsUSDF>('asUSDF');
        USDFEarn = await hre.ethers.getContract<USDFEarn>('USDFEarn');
        asUSDFEarn = await hre.ethers.getContract<AsUSDFEarn>('asUSDFEarn');
        WithdrawVault = await hre.ethers.getContract<WithdrawVault>('WithdrawVault');
        RewardDispatcher = await hre.ethers.getContract<RewardDispatcher>('RewardDispatcher');
        USDT = await hre.ethers.getContractAt('MockERC20', await USDFEarn.USDT()) as BaseContract as MockERC20;
        [, , , bot, ceffu, user1, user2, emergencyUser] = (await hre.ethers.getSigners());

        await USDT.mint(user1.address, hre.ethers.utils.parseEther('1000000'));
        await USDT.mint(user2.address, hre.ethers.utils.parseEther('1000000'));
        await USDT.mint(emergencyUser.address, hre.ethers.utils.parseEther('1000000'));

    })
    beforeEach(async() => {

    })

    it('Deposit USDT->USDF', async() => {
        const amount = hre.ethers.utils.parseEther('1000');
        await USDT.connect(user1).approve(USDFEarn.address, hre.ethers.constants.MaxUint256);
        const USDTBalanceBefore = await USDT.balanceOf(user1.address);
        const USDFBalanceBefore = await USDF.balanceOf(user1.address);
        await USDFEarn.connect(user1).deposit(amount);
        const USDTBalanceAfter = await USDT.balanceOf(user1.address);
        const USDFBalanceAfter = await USDF.balanceOf(user1.address);
        expect(USDTBalanceBefore.sub(USDTBalanceAfter).toBigInt()).to.be.equal(amount.toBigInt());
        expect(USDFBalanceAfter.sub(USDFBalanceBefore).toBigInt()).to.be.equal(amount.toBigInt());

        await USDT.connect(user2).approve(USDFEarn.address, hre.ethers.constants.MaxUint256);
        await USDFEarn.connect(user2).deposit(amount);

        await USDT.connect(emergencyUser).approve(USDFEarn.address, hre.ethers.constants.MaxUint256);
        await USDFEarn.connect(emergencyUser).deposit(amount);
    })

    it('Deposit USDF->asUSDF', async() => {
        const amount = ethers.utils.parseEther('1000');
        await USDF.connect(user1).approve(asUSDFEarn.address, ethers.constants.MaxUint256)
        const USDFBalanceBefore = await USDF.balanceOf(user1.address);
        const asUSDFBalanceBefore = await asUSDF.balanceOf(user1.address);
        await asUSDFEarn.connect(user1).deposit(amount);
        const USDFBalanceAfter = await USDF.balanceOf(user1.address);
        const asUSDFBalanceAfter = await asUSDF.balanceOf(user1.address);
        expect(USDFBalanceBefore.sub(USDFBalanceAfter).toBigInt()).to.be.equal(amount.toBigInt())
        expect(asUSDFBalanceAfter.sub(asUSDFBalanceBefore).toBigInt()).to.be.equal(amount.toBigInt());

        await USDF.connect(user2).approve(asUSDFEarn.address, ethers.constants.MaxUint256)
        await asUSDFEarn.connect(user2).deposit(amount);

        await USDF.connect(emergencyUser).approve(asUSDFEarn.address, ethers.constants.MaxUint256)
        await asUSDFEarn.connect(emergencyUser).deposit(amount);
    })

    it('transferToCeffu', async() => {
        const USDTBalance = await USDT.balanceOf(USDFEarn.address);
        const { multisig } = await hre.ethers.getNamedSigners();
        await USDFEarn.connect(multisig).updateTransferToCeffuEnabled(true);
        await USDFEarn.connect(multisig).updateCeffuAddress(ceffu.address);
        const minDelay = await Timelock.getMinDelay();
        await Timelock.connect(multisig).scheduleTask(
            USDFEarn.address,
            'grantRole(bytes32,address)',
            '0x' + USDFEarn.interface.encodeFunctionData('grantRole', [ethers.utils.id('BOT_ROLE'), bot.address]).substring(10)
        )
        await hre.ethers.provider.send("evm_mine", [(await hre.ethers.provider.getBlock('latest')).timestamp + minDelay.toNumber() + 1])
        await Timelock.connect(multisig).executeTask(
            USDFEarn.address,
            'grantRole(bytes32,address)',
            '0x' + USDFEarn.interface.encodeFunctionData('grantRole', [ethers.utils.id('BOT_ROLE'), bot.address]).substring(10)
        )
        const USDTBalanceBefore = await USDT.balanceOf(ceffu.address);
        await USDFEarn.connect(bot).transferToCeffu();
        const USDTBalanceAfter = await USDT.balanceOf(ceffu.address);
        expect(USDTBalanceAfter.sub(USDTBalanceBefore).toBigInt()).to.be.equal(USDTBalance.toBigInt())
    })

    it('Dispatch Reward', async() => {
        const rewardAmount = ethers.utils.parseEther('1000');
        await USDT.mint(ceffu.address, rewardAmount);

        await USDT.connect(ceffu).transfer(RewardDispatcher.address, rewardAmount);
        expect((await USDT.balanceOf(RewardDispatcher.address)).toBigInt()).to.be.equal(rewardAmount.toBigInt());

        const { bot } = await hre.ethers.getNamedSigners();
        await RewardDispatcher.connect(bot).mintReward(rewardAmount);
        expect((await USDF.balanceOf(RewardDispatcher.address)).toBigInt()).to.be.equal(rewardAmount.toBigInt());

        const dispatchAmount = ethers.utils.parseEther('500');
        const USDFBalanceBefore = await USDF.balanceOf(asUSDFEarn.address);
        await RewardDispatcher.connect(bot).dispatchReward(dispatchAmount);
        const USDFBalanceAfter = await USDF.balanceOf(asUSDFEarn.address);
        expect((await USDF.balanceOf(RewardDispatcher.address)).toBigInt()).to.be.equal(rewardAmount.sub(dispatchAmount).toBigInt());
        expect(USDFBalanceAfter.sub(USDFBalanceBefore).toBigInt()).to.be.equal(dispatchAmount.toBigInt())
    })

    it("User1 Withdraw asUSDF->USDF", async() => {
        await hre.network.provider.send("evm_setAutomine", [false]);
        const withdrawAmount = await asUSDF.balanceOf(user1.address)
        await asUSDF.connect(user1).approve(asUSDFEarn.address, ethers.constants.MaxUint256);
        await asUSDFEarn.connect(user1).requestWithdraw(withdrawAmount);
        await hre.ethers.provider.send("evm_mine", [(await hre.ethers.provider.getBlock('latest')).timestamp + 60])
        const requestWithdraw = await asUSDFEarn.requestWithdraws(1);
        expect(requestWithdraw.withdrawToken).to.be.equal(asUSDF.address);
        expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
        expect(requestWithdraw.claimable).to.be.equal(false);
        expect(requestWithdraw.receipt).to.be.equal(user1.address);
        await hre.network.provider.send("evm_setAutomine", [true]);
        await asUSDFEarn.connect(bot).distributeWithdraw([{requestWithdrawNo: 1, receipt: user1.address, withdrawToken: asUSDF.address}])
        // console.log(await asUSDFEarn.requestWithdraws(1))
        await asUSDFEarn.connect(user1).claimWithdraw([1]);
    })

    it("User2 Withdraw asUSDF->USDF", async() => {
        await hre.network.provider.send("evm_setAutomine", [false]);
        const withdrawAmount = await asUSDF.balanceOf(user2.address)
        await asUSDF.connect(user2).approve(asUSDFEarn.address, ethers.constants.MaxUint256);
        await asUSDFEarn.connect(user2).requestWithdraw(withdrawAmount);
        await hre.ethers.provider.send("evm_mine", [(await hre.ethers.provider.getBlock('latest')).timestamp + 60])
        const requestWithdraw = await asUSDFEarn.requestWithdraws(2);
        expect(requestWithdraw.withdrawToken).to.be.equal(asUSDF.address);
        expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
        expect(requestWithdraw.claimable).to.be.equal(false);
        expect(requestWithdraw.receipt).to.be.equal(user2.address);
        await hre.network.provider.send("evm_setAutomine", [true]);
        await asUSDFEarn.connect(bot).distributeWithdraw([{requestWithdrawNo: 2, receipt: user2.address, withdrawToken: asUSDF.address}])
        // console.log(await asUSDFEarn.requestWithdraws(2))
        await asUSDFEarn.connect(user2).claimWithdraw([2]);
    })

    it('User1 Withdraw USDF->USDT', async() => {
        const withdrawAmount = await USDF.balanceOf(user1.address)
        await USDF.connect(user1).approve(USDFEarn.address, ethers.constants.MaxUint256);
        await USDFEarn.connect(user1).requestWithdraw(withdrawAmount);
        const requestWithdraw = await USDFEarn.requestWithdraws(1);
        expect(requestWithdraw.withdrawToken).to.be.equal(USDF.address);
        expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
        expect(requestWithdraw.claimable).to.be.equal(false);
        expect(requestWithdraw.receipt).to.be.equal(user1.address);
        await USDT.connect(ceffu).transfer(WithdrawVault.address, requestWithdraw.receiveAmount);
        await USDFEarn.connect(bot).distributeWithdraw([{requestWithdrawNo: 1, receipt: user1.address, withdrawToken: USDF.address}])
        // console.log(await USDFEarn.requestWithdraws(1))
        await USDFEarn.connect(user1).claimWithdraw([1]);
    })

    it('User2 Withdraw USDF->USDT', async() => {
        const withdrawAmount = await USDF.balanceOf(user2.address)
        await USDF.connect(user2).approve(USDFEarn.address, ethers.constants.MaxUint256);
        await USDFEarn.connect(user2).requestWithdraw(withdrawAmount);
        const requestWithdraw = await USDFEarn.requestWithdraws(2);
        expect(requestWithdraw.withdrawToken).to.be.equal(USDF.address);
        expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
        expect(requestWithdraw.claimable).to.be.equal(false);
        expect(requestWithdraw.receipt).to.be.equal(user2.address);
        await USDT.connect(ceffu).transfer(WithdrawVault.address, requestWithdraw.receiveAmount);
        await USDFEarn.connect(bot).distributeWithdraw([{requestWithdrawNo: 2, receipt: user2.address, withdrawToken: USDF.address}])
        // console.log(await USDFEarn.requestWithdraws(2))
        await USDFEarn.connect(user2).claimWithdraw([2]);
    })

    it('Emergency Withdraw asUSDF->USDF', async() => {
        const { multisig } = await hre.ethers.getNamedSigners();
        await asUSDFEarn.connect(multisig).addEmergencyWithdrawWhitelist([emergencyUser.address]);
        // await hre.network.provider.send("evm_setAutomine", [false]);
        const withdrawAmount = await asUSDF.balanceOf(emergencyUser.address)
        await asUSDF.connect(emergencyUser).approve(asUSDFEarn.address, ethers.constants.MaxUint256);
        await asUSDFEarn.connect(emergencyUser).requestEmergencyWithdraw(withdrawAmount);
        // await hre.ethers.provider.send("evm_mine", [(await hre.ethers.provider.getBlock('latest')).timestamp + 60])
        const requestWithdraw = await asUSDFEarn.requestWithdraws(3);
        // console.log(requestWithdraw)
        expect(requestWithdraw.withdrawToken).to.be.equal(asUSDF.address);
        expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
        expect(requestWithdraw.claimable).to.be.equal(false);
        expect(requestWithdraw.receipt).to.be.equal(emergencyUser.address);
        // await hre.network.provider.send("evm_setAutomine", [true]);
        await asUSDFEarn.connect(bot).distributeWithdraw([{requestWithdrawNo: 3, receipt: emergencyUser.address, withdrawToken: asUSDF.address}])
        // console.log(await asUSDFEarn.requestWithdraws(3))
        await asUSDFEarn.connect(emergencyUser).claimWithdraw([3]);
    })

    it('Emergency Withdraw USDF->USDT', async() => {
        await USDFEarn.connect(bot).transferToCeffu();
        const withdrawAmount = await USDF.balanceOf(emergencyUser.address)
        await USDF.connect(emergencyUser).approve(USDFEarn.address, ethers.constants.MaxUint256);
        await USDFEarn.connect(emergencyUser).requestWithdraw(withdrawAmount);
        const requestWithdraw = await USDFEarn.requestWithdraws(3);
        expect(requestWithdraw.withdrawToken).to.be.equal(USDF.address);
        expect(requestWithdraw.withdrawAmount.toBigInt()).to.be.equal(withdrawAmount.toBigInt());
        expect(requestWithdraw.claimable).to.be.equal(false);
        expect(requestWithdraw.receipt).to.be.equal(emergencyUser.address);
        await USDT.connect(ceffu).transfer(WithdrawVault.address, requestWithdraw.receiveAmount);
        await USDFEarn.connect(bot).distributeWithdraw([{requestWithdrawNo: 3, receipt: emergencyUser.address, withdrawToken: USDF.address}])
        // console.log(await USDFEarn.requestWithdraws(3))
        await USDFEarn.connect(emergencyUser).claimWithdraw([3]);
    })
})