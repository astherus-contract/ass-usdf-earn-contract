const {run} = require("hardhat");

module.exports = async function ({
    ethers, 
    getNamedAccounts, 
    deployments, 
    getChainId, 
    getUnnamedAccounts
}) {
    const {deploy} = deployments;
    const EarnImplementation = await ethers.getContract('USDFEarn_Implementation');
    const Timelock = await ethers.getContract('Timelock');
    const USDF = await ethers.getContract('USDF');

    await run(
        "verify:verify", 
        {
            address: EarnImplementation.address,
            constructorArguments: [Timelock.address, '0x55d398326f99059fF775485246999027B3197955', USDF.address]
        }
    );
};

module.exports.tags = ['USDFEarnVerify'];
module.exports.dependencies = ['USDFEarn_Implementation'];
