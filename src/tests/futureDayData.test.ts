import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"
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
import {
    ETH_ADDRESS_MOCK,
    mockERC20Balances,
    mockERC20Functions,
} from "./mocks/ERC20"
import {
    createAssetCallMock,
    createConvertToAssetsCallMock,
} from "./mocks/ERC4626"
import { mockFactoryFunctions } from "./mocks/Factory"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
    mockFutureVaultIBTRate,
} from "./mocks/FutureVault"
import { assertAlmostEquals } from "./utils/asserts"
import { FUTURE_DAILY_STATS_ENTITY } from "./utils/entities"

const RATE_DAY_0 = BigInt.fromU64(1000000000000000000)
const RATE_DAY_7 = BigInt.fromU64(1009651000000000000)
const RATE_DAY_30 = BigInt.fromU64(1041666666666666752)
const RATE_DAY_90 = BigInt.fromU64(1125000000000000000)

function setupFutureStatsStack(): void {
    clearStore()
    mockFactoryFunctions()
    mockERC20Functions()
    mockERC20Balances()
    mockFutureVaultFunctions()
    mockCurvePoolFunctions()
    createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
    createAssetCallMock(IBT_ADDRESS_MOCK, Address.fromString(ETH_ADDRESS_MOCK))
    emitFactoryUpdated()
    emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
    emiCurveFactoryChange()
    emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)
}

describe("APY Computations on futureDailyStats", () => {
    beforeAll(() => {
        setupFutureStatsStack()
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, RATE_DAY_0)
        emitMint()
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, RATE_DAY_7)
        emitMint(7 * SECONDS_PER_DAY)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, RATE_DAY_30)
        emitMint(30 * SECONDS_PER_DAY)
        mockFutureVaultIBTRate(FIRST_FUTURE_VAULT_ADDRESS_MOCK, RATE_DAY_90)
        emitMint(90 * SECONDS_PER_DAY)
    })

    test("Should create one stat point for each rate observation", () => {
        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 4)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "0"
            ),
            "ibtRateMA",
            RATE_DAY_0.toString()
        )
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "7"
            ),
            "ibtRateMA",
            RATE_DAY_7.toString()
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
        const futureDailyStats30Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "30"
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats30Id,
            "ibtRateMA",
            RATE_DAY_30.toString()
        )

        let loadFutureDailyStats = FutureDailyStats.load(futureDailyStats30Id)
        assertAlmostEquals(
            loadFutureDailyStats!.realizedAPR30D,
            BigDecimal.fromString("0.5")
        )
    })

    test("Should compute correctly the 90D APR", () => {
        const futureDailyStats90Id = generateFutureDailyStatsId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "90"
        )
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            futureDailyStats90Id,
            "ibtRateMA",
            RATE_DAY_90.toString()
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
        setupFutureStatsStack()
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
        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 1)
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
