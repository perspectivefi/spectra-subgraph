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

import { RegistryUpdate } from "../../generated/Registry/Registry"
import { handleRegistryUpdate } from "../mappings/registry"
import {
    FIRST_CONTRACT_NAME,
    SECOND_CONTRACT_NAME,
    NEW_ADDRESS_MOCK,
    OLD_ADDRESS_MOCK,
    THIRD_EVENT_ADDRESS_MOCK,
} from "./mocks/Registry"
import { FUTURE_VAULT_FACTORY_ENTITY } from "./utils/entities"

describe("handleRegistryUpdate()", () => {
    beforeEach(() => {
        clearStore()

        // first event
        let registryUpdateEvent = changetype<RegistryUpdate>(newMockEvent())

        let firstNameParam = new ethereum.EventParam(
            "_contractName",
            ethereum.Value.fromString(FIRST_CONTRACT_NAME)
        )

        let newAddressParam = new ethereum.EventParam(
            "_new",
            ethereum.Value.fromAddress(NEW_ADDRESS_MOCK)
        )

        let oldAddressParam = new ethereum.EventParam(
            "_old",
            ethereum.Value.fromAddress(OLD_ADDRESS_MOCK)
        )

        registryUpdateEvent.parameters = [
            firstNameParam,
            oldAddressParam,
            newAddressParam,
        ]
        handleRegistryUpdate(registryUpdateEvent)

        // // second event
        let secondNameParam = new ethereum.EventParam(
            "_contractName",
            ethereum.Value.fromString(SECOND_CONTRACT_NAME)
        )

        registryUpdateEvent.parameters = [
            secondNameParam,
            oldAddressParam,
            newAddressParam,
        ]
        handleRegistryUpdate(registryUpdateEvent)
    })

    test("Should create new FutureVaultFactory entity for every registry update with unique address", () => {
        assert.entityCount(FUTURE_VAULT_FACTORY_ENTITY, 2)
    })

    test("Should should save new address and add the old one to the entity", () => {
        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            NEW_ADDRESS_MOCK.toHex(),
            "address",
            NEW_ADDRESS_MOCK.toHexString()
        )
        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            NEW_ADDRESS_MOCK.toHex(),
            "old",
            OLD_ADDRESS_MOCK.toHexString()
        )
    })

    test("Should create FutureVaultFactory entity with old address if the one has been updated but entity with the old address does not exist", () => {
        // third event
        let registryUpdateEvent = changetype<RegistryUpdate>(newMockEvent())

        let nameParam = new ethereum.EventParam(
            "_contractName",
            ethereum.Value.fromString(SECOND_CONTRACT_NAME)
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

        registryUpdateEvent.parameters = [
            nameParam,
            oldAddressParam,
            newAddressParam,
        ]
        handleRegistryUpdate(registryUpdateEvent)

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
})
