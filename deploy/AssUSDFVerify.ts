import {run} from "hardhat";

import {type DeployFunction} from 'hardhat-deploy/types'

const tag = 'AssUSDFVerify'

const name = 'Astherus AssUSDF'
const symbol = 'AssUSDF'

const deploy: DeployFunction = async (hre) => {
    const {getNamedAccounts, deployments, ethers} = hre

    const {deployer} = await getNamedAccounts()

    const AssUSDF = await ethers.getContract('AssUSDF');

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')
    console.log(`EndpointV2: ${endpointV2Deployment.address}`)

    const timelock = await ethers.getContract('Timelock');

    await run(
        "verify:verify",
        {
            address: AssUSDF.address,
            constructorArguments: [
                name, // name
                symbol, // symbol
                [], //_transferLimitConfigs
                endpointV2Deployment.address, // LayerZero's EndpointV2 address
                deployer, // _defaultAdmin
                timelock.address //timelock
            ]
        }
    );
}

deploy.tags = [tag]

export default deploy

