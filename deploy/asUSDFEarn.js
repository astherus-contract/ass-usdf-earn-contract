module.exports = async function ({
    ethers, 
    getNamedAccounts, 
    deployments, 
    getChainId, 
    getUnnamedAccounts
}) {
    const {deploy} = deployments;
    const {deployer, multisig} = await getNamedAccounts();

    const Timelock = await ethers.getContract('Timelock');
    const asUSDF = await ethers.getContract('asUSDF');
    const USDF = await ethers.getContract('USDF');

    await deploy('asUSDFEarn', {
            from: deployer,
        args: [Timelock.address, USDF.address, asUSDF.address],
            log: true, 
            skipIfAlreadyDeployed: false,
            proxy: {
                proxyContract: 'UUPS',
                execute: {
                    init: {
                        methodName: 'initialize', 
                        args: [
                            deployer
                        ],
                    },
                },
                upgradeFunction: {
                    methodName: 'upgradeToAndCall', 
                    upgradeArgs: [
                        '{implementation}', 
                        '0x'
                    ]
                }
            }
        }
    );
};

module.exports.tags = ['asUSDFEarn'];
module.exports.dependencies = [];
