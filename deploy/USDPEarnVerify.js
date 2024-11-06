const {run} = require("hardhat");

module.exports = async function ({
    ethers, 
    getNamedAccounts, 
    deployments, 
    getChainId, 
    getUnnamedAccounts
}) {
    const {deploy} = deployments;
    const EarnImplementation = await ethers.getContract('USDPEarn_Implementation');
    const Timelock = await ethers.getContract('Timelock');
    const USDP = await ethers.getContract('USDP');

    await run(
        "verify:verify", 
        {
            address: EarnImplementation.address,
            constructorArguments: [Timelock.address, '0xB9EF9C975EBB606498d14B105a1619E89255c972', USDP.address]
        }
    );
};

module.exports.tags = ['USDPEarnVerify'];
module.exports.dependencies = ['EarnImplementation'];
