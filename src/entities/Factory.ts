import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { Factory } from "../../generated/schema"
import { Factory as FactoryTemplate } from "../../generated/templates"
import { Factory as FactoryContract } from "../../generated/templates/Factory/Factory"
import { ZERO_ADDRESS } from "../constants"

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

    FactoryTemplate.create(address)

    return factory
}

export function getCurveFactory(factoryAddress: Address): Address {
    const factoryContract = FactoryContract.bind(factoryAddress)

    let curveFactoryCall = factoryContract.try_getCurveFactory()

    if (!curveFactoryCall.reverted) {
        return curveFactoryCall.value
    }

    log.warning("getCurveFactory() call reverted for {}", [
        factoryAddress.toHex(),
    ])

    return ZERO_ADDRESS
}
