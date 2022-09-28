import { ethereum } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeEach,
    describe,
    newMockEvent,
    test,
    beforeAll,
} from "matchstick-as/assembly/index"

import { FutureVaultDeployed } from "../../generated/Futures/TokenFactory"
import { handleFutureVaultDeployed } from "../mappings/futures"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
} from "./mocks/FutureVault"
import { FUTURE_ENTITY } from "./utils/entities"

describe("handleFutureVaultDeployed()", () => {
    beforeAll(() => {
        mockFutureVaultFunctions()
    })

    beforeEach(() => {
        let futureVaultDeployedEvent = changetype<FutureVaultDeployed>(
            newMockEvent()
        )

        let futureVaultParam = new ethereum.EventParam(
            "_futureVault",
            ethereum.Value.fromAddress(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        )
        futureVaultDeployedEvent.parameters = [futureVaultParam]
        handleFutureVaultDeployed(futureVaultDeployedEvent)

        futureVaultParam = new ethereum.EventParam(
            "_futureVault",
            ethereum.Value.fromAddress(SECOND_FUTURE_VAULT_ADDRESS_MOCK)
        )
        futureVaultDeployedEvent.parameters = [futureVaultParam]
        handleFutureVaultDeployed(futureVaultDeployedEvent)
    })

    test("Should create new Future on every deployment", () => {
        assert.entityCount(FUTURE_ENTITY, 2)
    })

    test("Should fetch and assign expiration date for a FutureVault entity", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "expirationAtTimestamp",
            "1"
        )
    })
})
