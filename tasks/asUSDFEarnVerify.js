const {run} = require("hardhat");

module.exports = async function ({
    ethers, 
    getNamedAccounts, 
    deployments, 
    getChainId, 
    getUnnamedAccounts
}) {
    const {deploy} = deployments;
    const EarnImplementation = await ethers.getContract('asUSDFEarn_Implementation');
    const Timelock = await ethers.getContract('Timelock');
    const USDF = await ethers.getContract('USDF');
    const asUSDF = await ethers.getContract('asUSDF');

    await run(
        "verify:verify", 
        {
            address: EarnImplementation.address,
            constructorArguments: [Timelock.address, USDF.address, asUSDF.address]
        }
    );
};

module.exports.tags = ['asUSDFEarnVerify'];
module.exports.dependencies = ['asUSDFEarn_Implementation'];
