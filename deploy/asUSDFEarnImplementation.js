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
    const asUSDF = await ethers.getContract('asUSDF');


    const deployment = await deploy('asUSDFEarn_Implementation', {
        contract: "asUSDFEarn",
        from: deployer,
        args: [Timelock.address, USDF.address, asUSDF.address],
        log: true, 
        skipIfAlreadyDeployed: false,
    });
};

module.exports.tags = ['asUSDFEarn_Implementation'];
module.exports.dependencies = [];
