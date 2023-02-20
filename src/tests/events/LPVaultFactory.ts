import { ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as"

import { RegistryUpdated } from "../../../generated/LPVaultFactory/LPVaultFactory"
import { handleRegistryUpdated } from "../../mappings/lpVaults"
import {
    NEW_LP_VAULT_FACTORY_ADDRESS_MOCK,
    OLD_LP_VAULT_FACTORY_ADDRESS_MOCK,
} from "../mocks/LPVaultFactory"

export const emitLPVaultFactoryUpdate = (): void => {
    let factoryUpdateEvent = changetype<RegistryUpdated>(newMockEvent())

    let oldAddressParam = new ethereum.EventParam(
        "oldRegistry",
        ethereum.Value.fromAddress(OLD_LP_VAULT_FACTORY_ADDRESS_MOCK)
    )

    let newAddressParam = new ethereum.EventParam(
        "newRegistry",
        ethereum.Value.fromAddress(NEW_LP_VAULT_FACTORY_ADDRESS_MOCK)
    )

    factoryUpdateEvent.parameters = [oldAddressParam, newAddressParam]
    handleRegistryUpdated(factoryUpdateEvent)
}
