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
            constructorArguments: [Timelock.address, '0xB9EF9C975EBB606498d14B105a1619E89255c972', USDF.address]
        }
    );
};

module.exports.tags = ['USDFEarnVerify'];
module.exports.dependencies = ['USDFEarn_Implementation'];
