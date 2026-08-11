import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeAll,
    clearStore,
    describe,
    newMockEvent,
    test,
} from "matchstick-as/assembly"

import { Pool } from "../../generated/schema"
import { SECONDS_PER_DAY, SECONDS_PER_HOUR } from "../constants"
import { PoolActionType, updatePoolStats } from "../entities/PoolStats"
import { generatePoolStatsId } from "../utils/idGenerators"
import { emitFactoryUpdated } from "./events/Factory"
import {
    emiCurveFactoryChange,
    emitCurvePoolDeployed,
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
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
    mockFutureVaultIBTRate,
} from "./mocks/FutureVault"

function recordAction(
    pool: Pool,
    timestamp: i32,
    blockNumber: i32,
    action: PoolActionType,
    value: i32,
    fee: i32,
    feeRatio: i32
): void {
    const event = newMockEvent()
    event.address = FIRST_POOL_ADDRESS_MOCK
    event.block.timestamp = BigInt.fromI32(timestamp)
    event.block.number = BigInt.fromI32(blockNumber)

    updatePoolStats(
        event,
        pool,
        SECONDS_PER_HOUR,
        action,
        BigInt.fromI32(value),
        BigInt.fromI32(fee),
        BigInt.fromI32(feeRatio)
    )
    updatePoolStats(
        event,
        pool,
        SECONDS_PER_DAY,
        action,
        BigInt.fromI32(value),
        BigInt.fromI32(fee),
        BigInt.fromI32(feeRatio)
    )
}

describe("PoolStats aggregation", () => {
    beforeAll(() => {
        clearStore()
        mockERC20Functions()
        mockERC20Balances()
        mockFactoryFunctions()
        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
        mockCurvePoolFunctions()
        mockFutureVaultIBTRate(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK,
            BigInt.fromI32(1)
        )
        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        createAssetCallMock(
            IBT_ADDRESS_MOCK,
            Address.fromString(ETH_ADDRESS_MOCK)
        )
        emitFactoryUpdated()
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emiCurveFactoryChange()
        emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)

        const pool = Pool.load(FIRST_POOL_ADDRESS_MOCK.toHex())!
        recordAction(pool, 10, 1, PoolActionType.ADD_LIQUIDITY, 100, 3, 1)
        recordAction(pool, 20, 2, PoolActionType.BUY_PT, 200, 5, 2)
        recordAction(pool, 3601, 3, PoolActionType.SELL_PT, 300, 7, 4)
    })

    test("aggregates actions and fees within the same hour", () => {
        const id = generatePoolStatsId(
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            SECONDS_PER_HOUR.toString(),
            "0"
        )
        assert.fieldEquals("PoolStats", id, "deposits", "1")
        assert.fieldEquals("PoolStats", id, "buys", "1")
        assert.fieldEquals("PoolStats", id, "sells", "0")
        assert.fieldEquals("PoolStats", id, "depositVolume", "100")
        assert.fieldEquals("PoolStats", id, "buyVolume", "200")
        assert.fieldEquals("PoolStats", id, "feeUnderlying", "8")
        assert.fieldEquals("PoolStats", id, "feeRatio", "3")
        assert.fieldEquals("PoolStats", id, "lastUpdatedAtTimestamp", "20")
        assert.fieldEquals("PoolStats", id, "lastUpdatedAtBlock", "2")
    })

    test("starts a clean hourly bucket after rollover", () => {
        const id = generatePoolStatsId(
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            SECONDS_PER_HOUR.toString(),
            "1"
        )
        assert.fieldEquals("PoolStats", id, "deposits", "0")
        assert.fieldEquals("PoolStats", id, "buys", "0")
        assert.fieldEquals("PoolStats", id, "sells", "1")
        assert.fieldEquals("PoolStats", id, "sellVolume", "300")
        assert.fieldEquals("PoolStats", id, "feeUnderlying", "7")
        assert.fieldEquals("PoolStats", id, "feeRatio", "4")
    })

    test("keeps all hourly actions in the daily aggregate", () => {
        const id = generatePoolStatsId(
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            SECONDS_PER_DAY.toString(),
            "0"
        )
        assert.fieldEquals("PoolStats", id, "deposits", "1")
        assert.fieldEquals("PoolStats", id, "buys", "1")
        assert.fieldEquals("PoolStats", id, "sells", "1")
        assert.fieldEquals("PoolStats", id, "depositVolume", "100")
        assert.fieldEquals("PoolStats", id, "buyVolume", "200")
        assert.fieldEquals("PoolStats", id, "sellVolume", "300")
        assert.fieldEquals("PoolStats", id, "feeUnderlying", "15")
        assert.fieldEquals("PoolStats", id, "feeRatio", "7")
    })
})
