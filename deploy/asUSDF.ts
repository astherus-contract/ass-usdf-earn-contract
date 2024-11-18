import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'asUSDF'

const name='Astherus asUSDF'
const symbol='asUSDF'

const deploy: DeployFunction = async (hre) => {
    const {getNamedAccounts, deployments,ethers} = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const timelock = await ethers.getContract('Timelock');
    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            name, // name
            symbol, // symbol
            deployer, // _defaultAdmin
            timelock.address //timelock
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${symbol}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [symbol]

export default deploy
