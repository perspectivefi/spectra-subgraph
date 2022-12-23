import { ethereum } from "@graphprotocol/graph-ts/index"
import { newMockEvent } from "matchstick-as/assembly/index"

import { RegistryUpdate } from "../../../generated/Registry/Registry"
import { handleRegistryUpdate } from "../../mappings/registry"
import { FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK } from "../mocks/FutureVaultFactory"
import { FIRST_CONTRACT_NAME, OLD_ADDRESS_MOCK } from "../mocks/Registry"

export const emitRegistryUpdate = (name: string): void => {
    let registryUpdateEvent = changetype<RegistryUpdate>(newMockEvent())

    let nameParam = new ethereum.EventParam(
        "_contractName",
        ethereum.Value.fromString(name)
    )

    let newAddressParam = new ethereum.EventParam(
        "_new",
        ethereum.Value.fromAddress(FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK)
    )

    let oldAddressParam = new ethereum.EventParam(
        "_old",
        ethereum.Value.fromAddress(OLD_ADDRESS_MOCK)
    )

    registryUpdateEvent.parameters = [
        nameParam,
        oldAddressParam,
        newAddressParam,
    ]
    handleRegistryUpdate(registryUpdateEvent)
}
