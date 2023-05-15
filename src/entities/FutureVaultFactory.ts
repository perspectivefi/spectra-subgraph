import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { PrincipalTokenFactory } from "../../generated/PrincipalTokenFactory/PrincipalTokenFactory"
import { FutureVaultFactory } from "../../generated/schema"
import { ZERO_ADDRESS } from "../constants"

export function createFutureVaultFactory(
    address: Address,
    timestamp: BigInt
): FutureVaultFactory {
    let futureVaultFactory = new FutureVaultFactory(address.toHex())
    futureVaultFactory.address = address
    futureVaultFactory.createdAtTimestamp = timestamp

    return futureVaultFactory
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
