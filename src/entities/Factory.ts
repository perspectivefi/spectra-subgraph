import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { Factory as FactoryContract } from "../../generated/Factory/Factory"
import { Factory } from "../../generated/schema"
import { ZERO_ADDRESS } from "../constants"
import { logDebug } from "../utils"

export function createFactory(
    registry: Address,
    address: Address,
    timestamp: BigInt
): Factory {
    let factory = new Factory(address.toHex())
    factory.address = address
    factory.createdAtTimestamp = timestamp

    factory.registry = registry

    let curveFactory = getCurveFactory(address)

    factory.curveFactory = curveFactory

    return factory
}

export function getCurveFactory(factoryAddress: Address): Address {
    const factoryContract = FactoryContract.bind(factoryAddress)

    // Not possible to call getCurveFactory() from here - unknown error
    let curveFactoryCall = factoryContract.try_getCurveFactory()

    if (!curveFactoryCall.reverted) {
        return curveFactoryCall.value
    }

    log.warning("getCurveFactory() call reverted for {}", [
        factoryAddress.toHex(),
    ])

    return ZERO_ADDRESS
}
