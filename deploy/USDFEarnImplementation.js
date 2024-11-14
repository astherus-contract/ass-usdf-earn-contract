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
        args: [Timelock.address, '0x55d398326f99059fF775485246999027B3197955', USDF.address],
        log: true, 
        skipIfAlreadyDeployed: false,
    });
};

module.exports.tags = ['USDFEarn_Implementation'];
module.exports.dependencies = [];
