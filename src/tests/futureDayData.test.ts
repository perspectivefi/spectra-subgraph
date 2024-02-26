import { BigDecimal } from "@graphprotocol/graph-ts"
import { assert, beforeAll, clearStore, describe, test } from "matchstick-as"

import { FutureDailyStats } from "../../generated/schema"
import { SECONDS_PER_DAY } from "../constants"
import { generateFutureDailyStatsId } from "../utils"
import { emitFactoryUpdated } from "./events/Factory"
import {
    emiCurveFactoryChange,
    emitCurvePoolDeployed,
    emitMint,
    emitFutureVaultDeployed,
} from "./events/FutureVault"
import {
    FIRST_POOL_ADDRESS_MOCK,
    mockCurvePoolFunctions,
} from "./mocks/CurvePool"
import { mockERC20Balances, mockERC20Functions } from "./mocks/ERC20"
import { createConvertToAssetsCallMockFromString } from "./mocks/ERC4626"
import { mockFactoryFunctions } from "./mocks/Factory"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
} from "./mocks/FutureVault"
import { assertAlmostEquals } from "./utils/asserts"
import { FUTURE_DAILY_STATS_ENTITY } from "./utils/entities"

describe("APY Computations on futureDailyStats", () => {
    beforeAll(() => {
        // Mock the deployment of the whole stack
        clearStore()
        mockFactoryFunctions()
        mockERC20Functions()
        mockERC20Balances()
        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
        mockFactoryFunctions()
        mockCurvePoolFunctions()

        emitFactoryUpdated()
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emiCurveFactoryChange()
        emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)
    })

    test("Should create 2 FutureDailyStats entities with a 1 week interval", () => {
        // Mock the rate of the interest bearing token (1 IBT = 1 underlying)
        let rate0D = "1000000000000000000"
        const expectedRate0D = BigDecimal.fromString(rate0D)
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate0D)
        emitMint() // make a first deposit at timestamp 0
        let rate7D = "1009651000000000000"
        const expectedRate7D = BigDecimal.fromString(rate7D)
        // Mock a change of rate of the interest bearing token (1 IBT = 1.00961 underlying <=> 50% anualized APR)
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate7D)
        emitMint(7 * SECONDS_PER_DAY) // make a second deposit at timestamp 7 days

        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 2)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "0"
            ),
            "ibtRate",
            expectedRate0D.toString()
        )
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "7"
            ),
            "ibtRate",
            expectedRate7D.toString()
        )
    })

    test("Should compute correctly the 7D APR", () => {
        let loadFutureDailyStats = FutureDailyStats.load(
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "7"
            )
        )
        assertAlmostEquals(
            loadFutureDailyStats!.realizedAPR7D,
            BigDecimal.fromString("0.5")
        )
    })

    test("Should compute correctly the 30D APR", () => {
        let rate30D = "1041666666666666752"
        const expectedRate30D = BigDecimal.fromString(rate30D)
        const futureDailyStats30Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "30"
        )

        // Mock a change of rate of the interest bearing token (1 IBT = 1.04167 underlying <=> 50% anualized APR)
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate30D)
        emitMint(30 * SECONDS_PER_DAY) // make a third deposit at timestamp 30 days

        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 3)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats30Id,
            "ibtRate",
            expectedRate30D.toString()
        )

        let loadFutureDailyStats = FutureDailyStats.load(futureDailyStats30Id)
        assertAlmostEquals(
            loadFutureDailyStats!.realizedAPR30D,
            BigDecimal.fromString("0.5")
        )
    })

    test("Should compute correctly the 90D APR", () => {
        let rate90D = "1125000000000000000"
        const expectedRate90D = BigDecimal.fromString(rate90D)
        const futureDailyStats90Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "90"
        )
        // Mock a change of rate of the interest bearing token (1 IBT = 1.125 underlying <=> 50% anualized APR)
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate90D)
        emitMint(90 * SECONDS_PER_DAY) // make a third deposit at timestamp 90 days

        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 4)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats90Id,
            "ibtRate",
            expectedRate90D.toString()
        )

        let loadFutureDailyStats = FutureDailyStats.load(futureDailyStats90Id)
        assertAlmostEquals(
            loadFutureDailyStats!.realizedAPR90D,
            BigDecimal.fromString("0.5")
        )
    })
})

describe("IBT Rate Average computation in FutureDailyStats", () => {
    beforeAll(() => {
        let rate120D = "1000000000000000000"
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate120D)
        emitMint(120 * SECONDS_PER_DAY) // make a deposit on day 120
        rate120D = "2000000000000000000"
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate120D)
        emitMint(120 * SECONDS_PER_DAY) // make a deposit on day 120
        rate120D = "3000000000000000000"
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate120D)
        emitMint(120 * SECONDS_PER_DAY) // make a deposit on day 120
    })

    test("Should create a single FutureDailyStats entities for the day 120", () => {
        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 5)
    })

    test("The FutureDayDaya updated a correct number of updates", () => {
        const futureDailyStats120Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "120"
        )
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats120Id,
            "dailyUpdates",
            "3"
        )
    })

    test("The FutureDayDaya updated corretly the ibtRate using the incremental average formula", () => {
        const futureDailyStats120Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "120"
        )
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats120Id,
            "ibtRate",
            "2000000000000000000"
        )
    })
})
