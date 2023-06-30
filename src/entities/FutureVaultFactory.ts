import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { PrincipalTokenFactory } from "../../generated/PrincipalTokenFactory/PrincipalTokenFactory"
import { FutureVaultFactory } from "../../generated/schema"
import { ZERO_ADDRESS } from "../constants"
import { getPoolFactory } from "./PoolFactory"

export function createFutureVaultFactory(
    address: Address,
    timestamp: BigInt
): FutureVaultFactory {
    let futureVaultFactory = new FutureVaultFactory(address.toHex())
    futureVaultFactory.address = address
    futureVaultFactory.createdAtTimestamp = timestamp

    const poolFactoryAddress = getPoolFactoryForPrincipalTokenFactory(address)

    futureVaultFactory.poolFactory = getPoolFactory(
        poolFactoryAddress,
        address,
        timestamp
    ).id

    return futureVaultFactory
}

export function getPoolFactoryForPrincipalTokenFactory(
    principalTokenFactoryAddress: Address
): Address {
    const principalTokenFactoryContract = PrincipalTokenFactory.bind(
        principalTokenFactoryAddress
    )

    let poolFactoryCall =
        principalTokenFactoryContract.try_getCurveFactoryAddress()

    if (!poolFactoryCall.reverted) {
        return poolFactoryCall.value
    }

    log.warning("getCurveFactoryAddress() call reverted for {}", [
        principalTokenFactoryAddress.toHex(),
    ])

    return ZERO_ADDRESS
}

export function getPool(
    principalTokenFactoryAddress: Address,
    principalTokenAddress: Address,
    poolIndex: BigInt
): Address {
    const principalTokenFactoryContract = PrincipalTokenFactory.bind(
        principalTokenFactoryAddress
    )

    let poolCall = principalTokenFactoryContract.try_getPool(
        principalTokenAddress,
        poolIndex
    )

    if (!poolCall.reverted) {
        return poolCall.value.pool
    }

    log.warning("getPool() call reverted for {}", [
        principalTokenFactoryAddress.toHex(),
    ])

    return ZERO_ADDRESS
}
