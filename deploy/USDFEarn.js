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
    const USDF = await ethers.getContract('USDF');

    await deploy('USDFEarn', {
            from: deployer,
        args: [Timelock.address, '0x55d398326f99059fF775485246999027B3197955', USDF.address],
            log: true, 
            skipIfAlreadyDeployed: false,
            proxy: {
                proxyContract: 'UUPS',
                execute: {
                    init: {
                        methodName: 'initialize', 
                        args: [
                            multisig
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

module.exports.tags = ['USDFEarn'];
module.exports.dependencies = [];