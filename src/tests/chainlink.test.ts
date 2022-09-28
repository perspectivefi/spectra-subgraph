import { ethereum } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    newMockEvent,
    afterEach,
    clearStore,
    assert,
} from "matchstick-as/assembly/index"

import { AnswerUpdated } from "../../generated/ChainlinkAggregatorDataSource/ChainlinkAggregatorProxyContract"
import { handleAnswerUpdated } from "../../src/mappings/chainlinkAggregator"
import { ASSET_ENTITY } from "./utils/entities"
import { ETH_ADDRESS_MOCK, mockERC20Functions } from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"

describe("handleAnswerUpdated()", () => {
    afterEach(() => {
        clearStore()
    })

    test("Should create a new Asset Entity with AssetPrice relation", () => {
        let newAnswerUpdatedEvent = changetype<AnswerUpdated>(newMockEvent())
        newAnswerUpdatedEvent.parameters = new Array()

        let currentParam = new ethereum.EventParam(
            "current",
            ethereum.Value.fromI32(15)
        )
        let roundIdParam = new ethereum.EventParam(
            "roundId",
            ethereum.Value.fromI32(1)
        )
        let updatedAtParam = new ethereum.EventParam(
            "updatedAt",
            ethereum.Value.fromI32(99)
        )

        mockERC20Functions()
        mockFeedRegistryInterfaceFunctions()

        newAnswerUpdatedEvent.parameters.push(currentParam)
        newAnswerUpdatedEvent.parameters.push(roundIdParam)
        newAnswerUpdatedEvent.parameters.push(updatedAtParam)

        handleAnswerUpdated(newAnswerUpdatedEvent)

        assert.entityCount(ASSET_ENTITY, 1)
        assert.fieldEquals(
            ASSET_ENTITY,
            ETH_ADDRESS_MOCK,
            "price",
            `${ETH_ADDRESS_MOCK}-${newAnswerUpdatedEvent.block.timestamp}`
        )
    })
})
