import { FactoryChange } from "../../generated/Registry/Registry"
import { Factory } from "../../generated/schema"
import { createFactory } from "../entities/Factory"
import { setNetwork } from "../entities/Network"

export function handleFactoryChange(event: FactoryChange): void {
    setNetwork()

    let contractAddress = event.params.newFactory
    let factory = Factory.load(contractAddress.toHex())

    if (!factory) {
        factory = createFactory(
            event.address,
            contractAddress,
            event.block.timestamp
        )
    }

    let oldAddress = event.params.previousFactory
    let oldFactory = Factory.load(oldAddress.toHex())

    if (!oldFactory) {
        oldFactory = createFactory(
            event.address,
            oldAddress,
            event.block.timestamp
        )
        oldFactory.save()
    }

    factory.oldFactory = oldFactory.address

    factory.save()
}
