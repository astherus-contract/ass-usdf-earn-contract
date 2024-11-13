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
    const USDF = await ethers.getContract('USDF');


    const deployment = await deploy('USDFEarn_Implementation', {
        contract: "USDFEarn",
        from: deployer,
        args: [Timelock.address, '0xB9EF9C975EBB606498d14B105a1619E89255c972', USDF.address],
        log: true, 
        skipIfAlreadyDeployed: false,
    });
};

module.exports.tags = ['USDFEarn_Implementation'];
module.exports.dependencies = [];
