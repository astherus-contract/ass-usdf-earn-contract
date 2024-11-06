import {run} from "hardhat";

import {type DeployFunction} from 'hardhat-deploy/types'

const tag = 'USDPVerify'

const name = 'Astherus USDP'
const symbol = 'USDP'

const deploy: DeployFunction = async (hre) => {
    const {getNamedAccounts, deployments, ethers} = hre

    const {deployer} = await getNamedAccounts()

    const USDF = await ethers.getContract('USDP');

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')
    console.log(`EndpointV2: ${endpointV2Deployment.address}`)

    const timelock = await ethers.getContract('Timelock');

    await run(
        "verify:verify",
        {
            address: USDF.address,
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

