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

import {
    Initialized,
    RegistryUpdate,
} from "../../generated/APWineProtocol/Registry"
import { RegisteredContract } from "../../generated/schema"
import { handleInitialized, handleRegistryUpdate } from "../mappings/registry"
import { REGISTERED_CONTRACT_ENTITY, REGISTRY_ENTITY } from "./utils/entities"
import {
    FIRST_CONTRACT_NAME,
    SECOND_CONTRACT_NAME,
    NEW_ADDRESS_MOCK,
    OLD_ADDRESS_MOCK,
} from "./mocks/Registry"

describe("handleInitialized()", () => {
    test("Should create new Registry entity", () => {
        let newInitializedEvent = changetype<Initialized>(newMockEvent())

        handleInitialized(newInitializedEvent)

        assert.entityCount(REGISTRY_ENTITY, 1)
        assert.fieldEquals(REGISTRY_ENTITY, "1", "contracts", "[]")
    })
})

describe("handleRegistryUpdate()", () => {
    beforeEach(() => {
        // first event
        let firstRegistryUpdateEvent = changetype<RegistryUpdate>(
            newMockEvent()
        )

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

        firstRegistryUpdateEvent.parameters = [
            firstNameParam,
            oldAddressParam,
            newAddressParam,
        ]
        handleRegistryUpdate(firstRegistryUpdateEvent)

        // // second event
        let secondRegistryUpdateEvent = changetype<RegistryUpdate>(
            newMockEvent()
        )

        secondRegistryUpdateEvent.parameters = new Array()

        let secondNameParam = new ethereum.EventParam(
            "_contractName",
            ethereum.Value.fromString(SECOND_CONTRACT_NAME)
        )

        secondRegistryUpdateEvent.parameters = [
            secondNameParam,
            oldAddressParam,
            newAddressParam,
        ]
        handleRegistryUpdate(secondRegistryUpdateEvent)
        handleRegistryUpdate(secondRegistryUpdateEvent)
    })
    afterEach(() => {
        clearStore()
    })

    test("Should create new RegisteredContract entity for every different contract name", () => {
        assert.entityCount(REGISTERED_CONTRACT_ENTITY, 2)
    })
    test("Should should save new address and add the old one to the history", () => {
        // third event
        let thirdRegistryUpdateEvent = changetype<RegistryUpdate>(
            newMockEvent()
        )

        let nameParam = new ethereum.EventParam(
            "_contractName",
            ethereum.Value.fromString(SECOND_CONTRACT_NAME)
        )

        let newAddressParam = new ethereum.EventParam(
            "_new",
            ethereum.Value.fromAddress(NEW_ADDRESS_MOCK)
        )

        let thirdEventOldAddress = ethereum.Value.fromAddress(
            Address.fromString("0x0000000000000000000000000000000000000005")
        )

        let oldAddressParam = new ethereum.EventParam(
            "_old",
            thirdEventOldAddress
        )

        thirdRegistryUpdateEvent.parameters = [
            nameParam,
            oldAddressParam,
            newAddressParam,
        ]
        handleRegistryUpdate(thirdRegistryUpdateEvent)

        let firstContract = RegisteredContract.load(FIRST_CONTRACT_NAME)!

        assert.fieldEquals(
            REGISTERED_CONTRACT_ENTITY,
            FIRST_CONTRACT_NAME,
            "address",
            NEW_ADDRESS_MOCK.toHexString()
        )
        assert.equals(
            ethereum.Value.fromBytes(firstContract.addressesHistory[0]),
            ethereum.Value.fromAddress(OLD_ADDRESS_MOCK)
        )

        let secondContract = RegisteredContract.load(SECOND_CONTRACT_NAME)!

        assert.equals(
            ethereum.Value.fromBytes(secondContract.addressesHistory[2]),
            thirdEventOldAddress
        )
    })
})
