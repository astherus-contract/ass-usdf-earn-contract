import {run} from "hardhat";

import {type DeployFunction} from 'hardhat-deploy/types'

const tag = 'USDFVerify'

const name = 'Astherus USDF'
const symbol = 'USDF'

const deploy: DeployFunction = async (hre) => {
    const {getNamedAccounts, deployments, ethers} = hre

    const {deployer} = await getNamedAccounts()

    const USDF = await ethers.getContract('USDF');

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')
    console.log(`EndpointV2: ${endpointV2Deployment.address}`)

    const timelock = await ethers.getContract('Timelock');

    await run(
        "verify:verify",
        {
            contract:"contracts/oft/USDF.sol:USDF",
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

