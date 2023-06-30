import { Address, BigInt } from "@graphprotocol/graph-ts"

import { PoolFactory } from "../../generated/schema"
import { getAccount } from "./Account"
import {
    getPoolFactoryAdmin,
    getPoolFactoryFeeReceiver,
} from "./CurvePoolFactory"

export function createPoolFactory(
    poolFactoryAddress: Address,
    principalTokenFactoryAddress: Address,
    timestamp: BigInt
): PoolFactory {
    const poolFactory = new PoolFactory(poolFactoryAddress.toHex())

    poolFactory.createdAtTimestamp = timestamp
    poolFactory.address = Address.fromString(poolFactoryAddress.toHex())
    poolFactory.futureVaultFactory = principalTokenFactoryAddress.toHex()
    poolFactory.ammProvider = "CURVE" // only Curve supported for now
    poolFactory.admin = getPoolFactoryAdmin(poolFactoryAddress)

    let factoryFeeReceiver = getAccount(
        getPoolFactoryFeeReceiver(poolFactoryAddress).toHex(),
        timestamp
    )
    poolFactory.feeReceiver = factoryFeeReceiver.id

    poolFactory.save()

    return poolFactory
}

export function getPoolFactory(
    poolFactoryAddress: Address,
    principalTokenFactoryAddress: Address,
    timestamp: BigInt
): PoolFactory {
    let poolFactory = PoolFactory.load(poolFactoryAddress.toHex())

    if (poolFactory == null) {
        poolFactory = createPoolFactory(
            poolFactoryAddress,
            principalTokenFactoryAddress,
            timestamp
        )
    }

    return poolFactory
}
