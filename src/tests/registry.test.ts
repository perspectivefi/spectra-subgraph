import { Address, ethereum } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    newMockEvent,
    afterEach,
    clearStore,
    assert,
    beforeEach,
} from "matchstick-as/assembly/index"

import { PrincipalTokenFactoryUpdated } from "../../generated/Registry/Registry"
import { handlePrincipalTokenFactoryUpdated } from "../mappings/registry"
import { emitPrincipalTokenFactoryUpdated } from "./events/FutureVaultFactory"
import { FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK } from "./mocks/FutureVaultFactory"
import {
    NEW_ADDRESS_MOCK,
    OLD_ADDRESS_MOCK,
    THIRD_EVENT_ADDRESS_MOCK,
} from "./mocks/Registry"
import { FUTURE_VAULT_FACTORY_ENTITY, NETWORK_ENTITY } from "./utils/entities"

describe("handlePrincipalTokenFactoryUpdated()", () => {
    beforeEach(() => {
        clearStore()

        emitPrincipalTokenFactoryUpdated()
        emitPrincipalTokenFactoryUpdated()
    })

    test("Should create new FutureVaultFactory entity for every registry update with unique address", () => {
        assert.entityCount(FUTURE_VAULT_FACTORY_ENTITY, 2)
    })

    test("Should should save new address and add the old one to the entity", () => {
        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "address",
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHexString()
        )
        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "old",
            OLD_ADDRESS_MOCK.toHexString()
        )
    })

    test("Should create FutureVaultFactory entity with old address if the one has been updated but entity with the old address does not exist", () => {
        // third event
        let registryUpdateEvent = changetype<PrincipalTokenFactoryUpdated>(
            newMockEvent()
        )

        let newAddressParam = new ethereum.EventParam(
            "_new",
            ethereum.Value.fromAddress(NEW_ADDRESS_MOCK)
        )

        let thirdEventOldAddress = ethereum.Value.fromAddress(
            Address.fromString(THIRD_EVENT_ADDRESS_MOCK)
        )

        let oldAddressParam = new ethereum.EventParam(
            "_old",
            thirdEventOldAddress
        )

        registryUpdateEvent.parameters = [oldAddressParam, newAddressParam]
        handlePrincipalTokenFactoryUpdated(registryUpdateEvent)

        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            NEW_ADDRESS_MOCK.toHex(),
            "address",
            NEW_ADDRESS_MOCK.toHex()
        )
        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            NEW_ADDRESS_MOCK.toHex(),
            "old",
            THIRD_EVENT_ADDRESS_MOCK
        )
        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            THIRD_EVENT_ADDRESS_MOCK,
            "address",
            THIRD_EVENT_ADDRESS_MOCK
        )
    })

    test("Should create Network entity ", () => {
        assert.fieldEquals(NETWORK_ENTITY, "1", "name", "mainnet")

        assert.fieldEquals(NETWORK_ENTITY, "1", "chainId", "1")
    })
})
