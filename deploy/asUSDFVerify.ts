import {run} from "hardhat";

import {type DeployFunction} from 'hardhat-deploy/types'

const tag = 'asUSDFVerify'

const name = 'Astherus asUSDF'
const symbol = 'asUSDF'

const deploy: DeployFunction = async (hre) => {
    const {getNamedAccounts, deployments, ethers} = hre

    const {deployer} = await getNamedAccounts()

    const asUSDF = await ethers.getContract('asUSDF');


    const timelock = await ethers.getContract('Timelock');

    await run(
        "verify:verify",
        {
            contract:"contracts/oft/asUSDF.sol:asUSDF",
            address: asUSDF.address,
            constructorArguments: [
                name, // name
                symbol, // symbol
                deployer, // _defaultAdmin
                timelock.address //timelock
            ]
        }
    );
}

deploy.tags = [tag]

export default deploy

