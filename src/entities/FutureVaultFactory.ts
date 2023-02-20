import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { FutureVaultFactory } from "../../generated/schema"
import { ZERO_ADDRESS } from "../constants"

export function createFutureVaultFactory(
    address: Address,
    timestamp: BigInt
): FutureVaultFactory {
    let newContract = new FutureVaultFactory(address.toHex())
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
