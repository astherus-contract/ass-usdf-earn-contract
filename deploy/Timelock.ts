import TimeLockConfig from '../config/timelock.config';
import {type DeployFunction} from 'hardhat-deploy/types'

export const deploy: DeployFunction = async({
    getNamedAccounts, 
    deployments, 
}) => {
    const { deploy } = deployments;
    const { deployer, multisig} = await getNamedAccounts();
    await deploy('Timelock', {
        contract: "Timelock",
        from: deployer, 
        args: [
            TimeLockConfig.minDelay,
            TimeLockConfig.maxDelay,
            [multisig],
            [multisig],
        ], 
        log: true, 
        skipIfAlreadyDeployed: true,
    });
}

deploy.tags = ['Timelock']
deploy.dependencies = [];
export default deploy;
