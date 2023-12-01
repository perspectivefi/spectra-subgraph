import { FactoryUpdated } from "../../generated/Registry/Registry"
import { Factory } from "../../generated/schema"
import { createFactory } from "../entities/Factory"
import { setNetwork } from "../entities/Network"

export function handleFactoryUpdated(event: FactoryUpdated): void {
    setNetwork()

    let contractAddress = event.params._new
    let factory = Factory.load(contractAddress.toHex())

    if (!factory) {
        factory = createFactory(
            event.address,
            contractAddress,
            event.block.timestamp
        )
    }

    let oldAddress = event.params._old
    let oldfactory = Factory.load(oldAddress.toHex())

    if (!oldfactory) {
        oldfactory = createFactory(
            event.address,
            oldAddress,
            event.block.timestamp
        )
        oldfactory.save()
    }

    factory.oldFactory = oldfactory.address

    factory.save()
}
