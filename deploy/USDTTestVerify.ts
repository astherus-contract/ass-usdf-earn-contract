import {run} from "hardhat";

import {type DeployFunction} from 'hardhat-deploy/types'

const tag = 'USDTTestVerify'

const name = 'Astherus USDT'
const symbol = 'USDT'

const deploy: DeployFunction = async (hre) => {
    const {getNamedAccounts, deployments, ethers} = hre

    const {deployer} = await getNamedAccounts()

    const USDTTest = await ethers.getContract('USDTTest');

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')
    console.log(`EndpointV2: ${endpointV2Deployment.address}`)

    const timelock = await ethers.getContract('Timelock');

    await run(
        "verify:verify",
        {
            address: USDTTest.address,
            constructorArguments: [
            ]
        }
    );
}

deploy.tags = [tag]

export default deploy

