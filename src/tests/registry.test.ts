import { Address, ethereum } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    newMockEvent,
    clearStore,
    assert,
    beforeEach,
} from "matchstick-as/assembly"

import { FactoryChange } from "../../generated/Registry/Registry"
import { handleFactoryChange } from "../mappings/registry"
import { emitFactoryUpdated } from "./events/Factory"
import { mockCurvePoolFunctions } from "./mocks/CurvePool"
import {
    mockFactoryFunctions,
    FACTORY_ADDRESS_MOCK,
    CURVE_FACTORY_ADDRESS_MOCK,
} from "./mocks/Factory"
import {
    NEW_ADDRESS_MOCK,
    OLD_ADDRESS_MOCK,
    THIRD_EVENT_ADDRESS_MOCK,
} from "./mocks/Registry"
import { FACTORY_ENTITY, NETWORK_ENTITY } from "./utils/entities"

describe("handleFactoryChange()", () => {
    beforeEach(() => {
        clearStore()

        mockFactoryFunctions()
        mockCurvePoolFunctions()

        emitFactoryUpdated()
        emitFactoryUpdated()
    })

    test("Should create new factory entity for every registry update with unique address", () => {
        assert.entityCount(FACTORY_ENTITY, 2)
    })

    test("Should should save new address and add the old one to the entity", () => {
        assert.fieldEquals(
            FACTORY_ENTITY,
            FACTORY_ADDRESS_MOCK.toHex(),
            "address",
            FACTORY_ADDRESS_MOCK.toHexString()
        )
        assert.fieldEquals(
            FACTORY_ENTITY,
            FACTORY_ADDRESS_MOCK.toHex(),
            "oldFactory",
            OLD_ADDRESS_MOCK.toHexString()
        )
    })

    test("Should create factory entity with old address if the one has been updated but entity with the old address does not exist", () => {
        // third event
        let registryUpdateEvent = changetype<FactoryChange>(newMockEvent())

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
        handleFactoryChange(registryUpdateEvent)

        assert.fieldEquals(
            FACTORY_ENTITY,
            NEW_ADDRESS_MOCK.toHex(),
            "address",
            NEW_ADDRESS_MOCK.toHex()
        )
        assert.fieldEquals(
            FACTORY_ENTITY,
            NEW_ADDRESS_MOCK.toHex(),
            "oldFactory",
            THIRD_EVENT_ADDRESS_MOCK
        )
        assert.fieldEquals(
            FACTORY_ENTITY,
            THIRD_EVENT_ADDRESS_MOCK,
            "address",
            THIRD_EVENT_ADDRESS_MOCK
        )
    })

    test("Should create Network entity", () => {
        assert.fieldEquals(NETWORK_ENTITY, "1", "name", "mainnet")

        assert.fieldEquals(NETWORK_ENTITY, "1", "chainId", "1")
    })

    test("Should assign Curve Factory to the Principal Token factory ", () => {
        assert.fieldEquals(
            FACTORY_ENTITY,
            FACTORY_ADDRESS_MOCK.toHex(),
            "curveFactory",
            CURVE_FACTORY_ADDRESS_MOCK.toHex()
        )
    })
})
