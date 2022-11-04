import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { FutureVault } from "../../generated/FutureVault/FutureVault"
import { FutureVaultFactory } from "../../generated/schema"
import { ZERO_ADDRESS } from "../constants"
import { logWarning } from "../utils"

export function createFutureVaultFactory(
    address: Address,
    name: string,
    timestamp: BigInt
): FutureVaultFactory {
    let newContract = new FutureVaultFactory(address.toHex())
    newContract.name = name
    newContract.address = address
    newContract.createdAtTimestamp = timestamp

    return newContract
}

// TODO on the protocol side
export function getCurveFactory(address: Address): Address {
    const futureVaultFactoryContract = FutureVaultFactory.bind(address)

    let curveFactoryCall = futureVaultFactoryContract.try_curveFactory()

    if (!curveFactoryCall.reverted) {
        return curveFactoryCall.value
    }

    log.warning("curveFactory() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}
