module.exports = async function ({
    ethers, 
    getNamedAccounts, 
    deployments, 
    getChainId, 
    getUnnamedAccounts
}) {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const Timelock = await ethers.getContract('Timelock');
    const USDP = await ethers.getContract('USDP');


    const deployment = await deploy('USDPEarn_Implementation', {
        contract: "USDPEarn",
        from: deployer,
        args: [Timelock.address, '0xB9EF9C975EBB606498d14B105a1619E89255c972', USDP.address],
        log: true, 
        skipIfAlreadyDeployed: false,
    });
};

module.exports.tags = ['USDPEarn_Implementation'];
module.exports.dependencies = [];
