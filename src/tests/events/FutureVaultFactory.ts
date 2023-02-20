import { ethereum } from "@graphprotocol/graph-ts/index"
import { newMockEvent } from "matchstick-as/assembly/index"

import { PrincipalTokenFactoryUpdated } from "../../../generated/Registry/Registry"
import { handlePrincipalTokenFactoryUpdated } from "../../mappings/registry"
import { FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK } from "../mocks/FutureVaultFactory"
import { FIRST_CONTRACT_NAME, OLD_ADDRESS_MOCK } from "../mocks/Registry"

export const emitPrincipalTokenFactoryUpdated = (): void => {
    let registryUpdateEvent = changetype<PrincipalTokenFactoryUpdated>(
        newMockEvent()
    )

    let newAddressParam = new ethereum.EventParam(
        "_new",
        ethereum.Value.fromAddress(FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK)
    )

    let oldAddressParam = new ethereum.EventParam(
        "_old",
        ethereum.Value.fromAddress(OLD_ADDRESS_MOCK)
    )

    registryUpdateEvent.parameters = [oldAddressParam, newAddressParam]
    handlePrincipalTokenFactoryUpdated(registryUpdateEvent)
}
