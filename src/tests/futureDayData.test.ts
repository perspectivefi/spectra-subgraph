import { BigDecimal } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeAll,
    clearStore,
    describe,
    test
} from "matchstick-as/assembly/index"

import { FutureDayData } from "../../generated/schema"
import { SECONDS_PER_DAY } from "../constants"
import { generateFutureDayDataId } from "../utils"
import {
    emiCurveFactoryChanged,
    emitCurvePoolDeployed,
    emitDeposit,
    emitFutureVaultDeployed
} from "./events/FutureVault"
import { mockCurvePoolFunctions } from "./mocks/CurvePool"
import { mockMetaPoolFactoryFunctions } from "./mocks/CurvePoolFactory"
import { mockERC20Functions } from "./mocks/ERC20"
import { createConvertToAssetsCallMockFromString } from "./mocks/ERC4626"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions
} from "./mocks/FutureVault"
import { assertAlmostEquals } from "./utils/asserts"
import { FUTURE_DAY_DATA_ENTITY } from "./utils/entities"

describe("APY Computations on futureDayData", () => {
    beforeAll(() => {
        // Mock the deployment of the whole stack
        clearStore()
        mockERC20Functions()
        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
        mockMetaPoolFactoryFunctions()
        mockCurvePoolFunctions()
        emitFutureVaultDeployed()
        emiCurveFactoryChanged()
        emitCurvePoolDeployed()
    })

    test("Should create 2 FutureDayData entities with a 1 week interval", () => {
        // Mock the rate of the interest bearing token (1 IBT = 1 underlying)
        let rate0D = "1000000000000000000"
        const expectedRate0D = BigDecimal.fromString(rate0D)
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate0D)
        emitDeposit() // make a first deposit at timestamp 0
        let rate7D = "1009651000000000000"
        const expectedRate7D = BigDecimal.fromString(rate7D)
        // Mock a change of rate of the interest bearing token (1 IBT = 1.00961 underlying <=> 50% anualized APR)
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate7D)
        emitDeposit(7 * SECONDS_PER_DAY) // make a second deposit at timestamp 7 days

        assert.entityCount(FUTURE_DAY_DATA_ENTITY, 2)
        assert.fieldEquals(
            FUTURE_DAY_DATA_ENTITY,
            generateFutureDayDataId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "0"
            ),
            "ibtRate",
            expectedRate0D.toString()
        )
        assert.fieldEquals(
            FUTURE_DAY_DATA_ENTITY,
            generateFutureDayDataId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "7"
            ),
            "ibtRate",
            expectedRate7D.toString()
        )
    })

    test("Should compute correctly the 7D APR", () => {
        let loadFutureDayData = FutureDayData.load(
            generateFutureDayDataId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                "7"
            )
        )
        assertAlmostEquals(
            loadFutureDayData!.realizedAPR7D,
            BigDecimal.fromString("0.5")
        )
    })

    test("Should compute correctly the 30D APR", () => {
        let rate30D = "1041666666666666752"
        const expectedRate30D = BigDecimal.fromString(rate30D)
        const futureDayData30Id = generateFutureDayDataId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "30"
        )

        // Mock a change of rate of the interest bearing token (1 IBT = 1.04167 underlying <=> 50% anualized APR)
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate30D)
        emitDeposit(30 * SECONDS_PER_DAY) // make a third deposit at timestamp 30 days

        assert.entityCount(FUTURE_DAY_DATA_ENTITY, 3)
        assert.fieldEquals(
            FUTURE_DAY_DATA_ENTITY,
            futureDayData30Id,
            "ibtRate",
            expectedRate30D.toString()
        )

        let loadFutureDayData = FutureDayData.load(futureDayData30Id)
        assertAlmostEquals(
            loadFutureDayData!.realizedAPR30D,
            BigDecimal.fromString("0.5")
        )
    })

    test("Should compute correctly the 90D APR", () => {
        let rate90D = "1125000000000000000"
        const expectedRate90D = BigDecimal.fromString(rate90D)
        const futureDayData90Id = generateFutureDayDataId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "90"
        )
        // Mock a change of rate of the interest bearing token (1 IBT = 1.125 underlying <=> 50% anualized APR)
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate90D)
        emitDeposit(90 * SECONDS_PER_DAY) // make a third deposit at timestamp 90 days

        assert.entityCount(FUTURE_DAY_DATA_ENTITY, 4)
        assert.fieldEquals(
            FUTURE_DAY_DATA_ENTITY,
            futureDayData90Id,
            "ibtRate",
            expectedRate90D.toString()
        )

        let loadFutureDayData = FutureDayData.load(futureDayData90Id)
        assertAlmostEquals(
            loadFutureDayData!.realizedAPR90D,
            BigDecimal.fromString("0.5")
        )
    })
})

describe("IBT Rate Average computation in FutureDayData", () => {
    beforeAll(() => {
        let rate120D = "1000000000000000000"
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate120D)
        emitDeposit(120 * SECONDS_PER_DAY) // make a deposit on day 120
        rate120D = "2000000000000000000"
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate120D)
        emitDeposit(120 * SECONDS_PER_DAY) // make a deposit on day 120
        rate120D = "3000000000000000000"
        createConvertToAssetsCallMockFromString(IBT_ADDRESS_MOCK, rate120D)
        emitDeposit(120 * SECONDS_PER_DAY) // make a deposit on day 120
    })

    test("Should create a single FutureDayData entities for the day 120", () => {
        assert.entityCount(FUTURE_DAY_DATA_ENTITY, 5)
    })

    test("The FutureDayDaya updated a correct number of updates", () => {
        const futureDayData120Id = generateFutureDayDataId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "120"
        )
        assert.fieldEquals(
            FUTURE_DAY_DATA_ENTITY,
            futureDayData120Id,
            "dailyUpdates",
            "3"
        )
    })

    test("The FutureDayDaya updated corretly the ibtRate using the incremental average formula", () => {
        const futureDayData120Id = generateFutureDayDataId(
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "120"
        )
        assert.fieldEquals(
            FUTURE_DAY_DATA_ENTITY,
            futureDayData120Id,
            "ibtRate",
            "2000000000000000000"
        )
    })

})