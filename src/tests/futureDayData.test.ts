import { BigDecimal, BigInt } from "@graphprotocol/graph-ts"
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
    mockFutureVaultIBTRate,
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
        let rate0D = BigInt.fromU64(1000000000000000000)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, rate0D)
        emitMint() // make a first deposit at timestamp 0
        let rate7D = BigInt.fromU64(1009651000000000000)
        // Mock a change of rate of the interest bearing token (1 IBT = 1.00961 underlying <=> 50% anualized APR)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, rate7D)
        emitMint(7 * SECONDS_PER_DAY) // make a second deposit at timestamp 7 days

        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 2)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "0"
            ),
            "ibtRateMA",
            rate0D.toString()
        )
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "7"
            ),
            "ibtRateMA",
            rate7D.toString()
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
        let rate30D = BigInt.fromU64(1041666666666666752)
        const futureDailyStats30Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "30"
        )

        // Mock a change of rate of the interest bearing token (1 IBT = 1.04167 underlying <=> 50% anualized APR)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, rate30D)
        emitMint(30 * SECONDS_PER_DAY) // make a third deposit at timestamp 30 days

        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 3)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats30Id,
            "ibtRateMA",
            rate30D.toString()
        )

        let loadFutureDailyStats = FutureDailyStats.load(futureDailyStats30Id)
        assertAlmostEquals(
            loadFutureDailyStats!.realizedAPR30D,
            BigDecimal.fromString("0.5")
        )
    })

    test("Should compute correctly the 90D APR", () => {
        let rate90D = BigInt.fromU64(1125000000000000000)
        const futureDailyStats90Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "90"
        )
        // Mock a change of rate of the interest bearing token (1 IBT = 1.125 underlying <=> 50% anualized APR)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, rate90D)
        emitMint(90 * SECONDS_PER_DAY) // make a third deposit at timestamp 90 days

        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 4)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats90Id,
            "ibtRateMA",
            rate90D.toString()
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
        let rate120D = BigInt.fromU64(1000000000000000000)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, rate120D)
        emitMint(120 * SECONDS_PER_DAY) // make a deposit on day 120
        rate120D = BigInt.fromU64(2000000000000000000)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, rate120D)
        emitMint(120 * SECONDS_PER_DAY) // make a deposit on day 120
        rate120D = BigInt.fromU64(3000000000000000000)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, rate120D)
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

    test("The FutureDayDaya updated corretly the ibtRateMA using the incremental average formula", () => {
        const futureDailyStats120Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "120"
        )
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats120Id,
            "ibtRateMA",
            "2000000000000000000"
        )
    })
})
