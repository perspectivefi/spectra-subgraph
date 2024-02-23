import { ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as"

import { FactoryChange } from "../../../generated/Registry/Registry"
import { handleFactoryChange } from "../../mappings/registry"
import { FACTORY_ADDRESS_MOCK } from "../mocks/Factory"
import { OLD_ADDRESS_MOCK } from "../mocks/Registry"

export const emitFactoryUpdated = (): void => {
    let registryUpdateEvent = changetype<FactoryChange>(newMockEvent())

    let newAddressParam = new ethereum.EventParam(
        "_new",
        ethereum.Value.fromAddress(FACTORY_ADDRESS_MOCK)
    )

    let oldAddressParam = new ethereum.EventParam(
        "_old",
        ethereum.Value.fromAddress(OLD_ADDRESS_MOCK)
    )

    registryUpdateEvent.parameters = [oldAddressParam, newAddressParam]
    handleFactoryChange(registryUpdateEvent)
}
