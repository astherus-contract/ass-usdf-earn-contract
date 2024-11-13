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
        args: [Timelock.address, '0xB9EF9C975EBB606498d14B105a1619E89255c972', USDF.address],
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