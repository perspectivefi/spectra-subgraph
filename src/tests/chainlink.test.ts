import { ethereum } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    newMockEvent,
    afterEach,
    clearStore,
    assert,
    beforeAll,
} from "matchstick-as/assembly/index"

import { AnswerUpdated } from "../../generated/ChainlinkAggregatorDataSource/ChainlinkAggregatorProxyContract"
import { handleAnswerUpdated } from "../mappings/chainlinkAggregator"
import { generateAssetPriceId } from "../utils"
import { ETH_ADDRESS_MOCK, mockERC20Functions } from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import { ASSET_ENTITY } from "./utils/entities"

describe("handleAnswerUpdated()", () => {
    beforeAll(() => {
        clearStore()
        mockERC20Functions()
        mockFeedRegistryInterfaceFunctions()
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

        newAnswerUpdatedEvent.parameters.push(currentParam)
        newAnswerUpdatedEvent.parameters.push(roundIdParam)
        newAnswerUpdatedEvent.parameters.push(updatedAtParam)

        handleAnswerUpdated(newAnswerUpdatedEvent)

        assert.entityCount(ASSET_ENTITY, 1)
        assert.fieldEquals(
            ASSET_ENTITY,
            ETH_ADDRESS_MOCK,
            "price",
            generateAssetPriceId(
                ETH_ADDRESS_MOCK,
                newAnswerUpdatedEvent.block.timestamp.toString()
            )
        )
    })
})
