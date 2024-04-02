import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    newMockEvent,
    clearStore,
    assert,
    beforeAll,
} from "matchstick-as/assembly"

import {
    AddLiquidity,
    ClaimAdminFee,
    CommitNewParameters,
    NewParameters,
    RemoveLiquidity,
    RemoveLiquidityOne,
    TokenExchange,
} from "../../generated/CurvePool/CurvePool"
import { Account, Pool } from "../../generated/schema"
import { DAY_ID_0, ZERO_BI } from "../constants"
import {
    handleAddLiquidity,
    handleClaimAdminFee,
    handleCommitNewParameters,
    handleNewParameters,
    handleRemoveLiquidity,
    handleRemoveLiquidityOne,
    handleTokenExchange,
} from "../mappings/amm"
import {
    generateAssetAmountId,
    generateAccountAssetId,
    generateFeeClaimId,
    generateFutureDailyStatsId,
} from "../utils"
import { generateTransactionId } from "../utils/idGenerators"
import { RAYS_PRECISION, toPrecision } from "../utils/toPrecision"
import { emitFactoryUpdated } from "./events/Factory"
import {
    emiCurveFactoryChange,
    emitCurvePoolDeployed,
    emitFutureVaultDeployed,
} from "./events/FutureVault"
import {
    mockCurvePoolFunctions,
    POOL_ADD_LIQUIDITY_TRANSACTION_HASH,
    POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH,
    POOL_EXCHANGE_TRANSACTION_HASH,
    POOL_LP_ADDRESS_MOCK,
    POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH,
    POOL_SECOND_EXCHANGE_TRANSACTION_HASH,
    FIRST_POOL_ADDRESS_MOCK,
    SECOND_POOL_ADDRESS_MOCK,
} from "./mocks/CurvePool"
import {
    STANDARD_DECIMALS_MOCK,
    mockERC20Functions,
    mockERC20Balances,
    POOL_IBT_BALANCE_MOCK,
    POOL_PT_BALANCE_MOCK,
    POOL_LP_BALANCE_MOCK,
    LP_TOTAL_SUPPLY,
} from "./mocks/ERC20"
import {
    createConvertToAssetsCallMock,
    createConvertToSharesCallMock,
} from "./mocks/ERC4626"
import {
    POOL_DEPLOY_TRANSACTION_HASH,
    mockFactoryFunctions,
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "./mocks/Factory"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FEE_COLLECTOR_ADDRESS_MOCK,
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
} from "./mocks/FutureVault"
import {
    ASSET_AMOUNT_ENTITY,
    FEE_CLAIM_ENTITY,
    POOL_ENTITY,
    TRANSACTION_ENTITY,
    ACCOUNT_ASSET_ENTITY,
    ACCOUNT_ENTITY,
    FUTURE_DAILY_STATS_ENTITY,
    APR_IN_TIME_ENTITY,
} from "./utils/entities"

const ADD_LIQUIDITY_LOG_INDEX = BigInt.fromI32(1)
const REMOVE_LIQUIDITY_LOG_INDEX = BigInt.fromI32(2)
const REMOVE_ONE_LIQUIDITY_LOG_INDEX = BigInt.fromI32(3)
const EXCHANGE_LOG_INDEX = BigInt.fromI32(4)
const SECOND_EXCHANGE_LOG_INDEX = BigInt.fromI32(5)

const addLiquidityTransactionId = generateTransactionId(
    POOL_ADD_LIQUIDITY_TRANSACTION_HASH,
    ADD_LIQUIDITY_LOG_INDEX.toString()
)
const removeLiquidityTransactionId = generateTransactionId(
    POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH,
    REMOVE_LIQUIDITY_LOG_INDEX.toString()
)

const removeOneLiquidityTransactionId = generateTransactionId(
    POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH,
    REMOVE_ONE_LIQUIDITY_LOG_INDEX.toString()
)

const exchangeTransactionId = generateTransactionId(
    POOL_EXCHANGE_TRANSACTION_HASH,
    EXCHANGE_LOG_INDEX.toString()
)

const ADD_LIQUIDITY_TOKEN_AMOUNTS = [
    toPrecision(BigInt.fromI32(150), 1, STANDARD_DECIMALS_MOCK),
    toPrecision(BigInt.fromI32(150), 1, STANDARD_DECIMALS_MOCK),
]

const REMOVE_LIQUIDITY_TOKEN_AMOUNTS = [
    toPrecision(BigInt.fromI32(50), 1, STANDARD_DECIMALS_MOCK),
    toPrecision(BigInt.fromI32(100), 1, STANDARD_DECIMALS_MOCK),
]

const FEE = toPrecision(BigInt.fromI32(40), 1, 8)
const ADMIN_FEE = toPrecision(BigInt.fromI32(50), 1, 10)
const FUTURE_ADMIN_FEE = toPrecision(BigInt.fromI32(60), 1, 10)
const COLLECTED_ADMIN_FEE = toPrecision(BigInt.fromI32(500), 1, 8)

describe("handleAddLiquidity()", () => {
    beforeAll(() => {
        clearStore()

        mockERC20Functions()
        mockERC20Balances()

        mockFactoryFunctions()

        mockFactoryFunctions()
        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
        mockCurvePoolFunctions()
        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        createConvertToSharesCallMock(
            IBT_ADDRESS_MOCK,
            toPrecision(BigInt.fromI32(10), 1, 18)
        )

        emitFactoryUpdated()
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emiCurveFactoryChange()
        emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)

        let addLiquidityEvent = changetype<AddLiquidity>(newMockEvent())
        addLiquidityEvent.address = FIRST_POOL_ADDRESS_MOCK
        addLiquidityEvent.transaction.hash = POOL_ADD_LIQUIDITY_TRANSACTION_HASH
        addLiquidityEvent.logIndex = ADD_LIQUIDITY_LOG_INDEX

        let providerParam = new ethereum.EventParam(
            "provider",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let tokenAmountsParam = new ethereum.EventParam(
            "token_amounts",
            ethereum.Value.fromSignedBigIntArray(ADD_LIQUIDITY_TOKEN_AMOUNTS)
        )

        let feeParam = new ethereum.EventParam(
            "fee",
            ethereum.Value.fromSignedBigInt(FEE)
        )

        let tokenSupplyParam = new ethereum.EventParam(
            "token_supply",
            ethereum.Value.fromSignedBigInt(LP_TOTAL_SUPPLY)
        )

        addLiquidityEvent.parameters = [
            providerParam,
            tokenAmountsParam,
            feeParam,
            tokenSupplyParam,
        ]

        handleAddLiquidity(addLiquidityEvent)
    })

    test("Should create new transaction entity with 'AMM_REMOVE_LIQUIDITY' as type", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            addLiquidityTransactionId,
            "type",
            "AMM_ADD_LIQUIDITY"
        )
    })

    test("Should reflect the liquidity adding transaction in the pool asset amounts", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            ADD_LIQUIDITY_TOKEN_AMOUNTS[0].toString()
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            ADD_LIQUIDITY_TOKEN_AMOUNTS[1].toString()
        )
    })

    test("Should create new transaction entity with properly assigned input and outputs", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            addLiquidityTransactionId,
            "amountsIn",
            `[${generateAssetAmountId(
                POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            )}, ${generateAssetAmountId(
                POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            addLiquidityTransactionId,
            "amountsOut",
            `[${generateAssetAmountId(
                POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should create new asset amount entities for all the in and out tokens of the transaction", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            ADD_LIQUIDITY_TOKEN_AMOUNTS[0].toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            ADD_LIQUIDITY_TOKEN_AMOUNTS[0].toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "amount",
            // as mock is the same for the supply before and after liquidity transaction so difference is 0
            "0"
        )
    })

    test("Should reflect the liquidity transaction in the account portfolio", () => {
        let accountIBTId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_IBT_ADDRESS_MOCK.toHex()
        )
        let accountPTId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_PT_ADDRESS_MOCK.toHex()
        )
        let accountLPId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        const accountEntity = Account.load(FIRST_USER_MOCK.toHex())!
        const portfolio = accountEntity.portfolio.load()

        assert.i32Equals(portfolio.length, 3)

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountIBTId,
            "balance",
            POOL_IBT_BALANCE_MOCK.toString()
        )
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountPTId,
            "balance",
            POOL_PT_BALANCE_MOCK.toString()
        )
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountLPId,
            "balance",
            POOL_LP_BALANCE_MOCK.toString()
        )
    })

    test("Creates new LP position", () => {
        let poolEntity = Pool.load(FIRST_POOL_ADDRESS_MOCK.toHex())!
        let liquidityPositions = poolEntity.liquidityPositions.load()

        assert.i32Equals(liquidityPositions.length, 1)

        // assert.fieldEquals(
        //     POOL_ENTITY,
        //     FIRST_POOL_ADDRESS_MOCK.toHex(),
        //     "liquidityPositions",
        //     `[${generateAccountAssetId(
        //         FIRST_USER_MOCK.toHex(),
        //         POOL_LP_ADDRESS_MOCK.toHex()
        //     )}]`
        // )
    })

    test("Should set correct transaction fee parameters", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            addLiquidityTransactionId,
            "fee",
            "40000000000000000"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            addLiquidityTransactionId,
            "adminFee",
            "20000000000000000"
        )
    })

    test("Should create/update FutureDailyStats with the correct details", () => {
        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 1)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "future",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "dailyAddLiquidity",
            "1"
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "date",
            DAY_ID_0
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "ibtRate",
            "1"
        )
    })
})

describe("handleRemoveLiquidity()", () => {
    beforeAll(() => {
        let removeLiquidityEvent = changetype<RemoveLiquidity>(newMockEvent())
        removeLiquidityEvent.address = FIRST_POOL_ADDRESS_MOCK
        removeLiquidityEvent.transaction.hash =
            POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH
        removeLiquidityEvent.logIndex = REMOVE_LIQUIDITY_LOG_INDEX

        let providerParam = new ethereum.EventParam(
            "provider",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let tokenAmountsParam = new ethereum.EventParam(
            "token_amounts",
            ethereum.Value.fromSignedBigIntArray(REMOVE_LIQUIDITY_TOKEN_AMOUNTS)
        )

        let tokenSupplyParam = new ethereum.EventParam(
            "token_supply",
            ethereum.Value.fromSignedBigInt(
                LP_TOTAL_SUPPLY.minus(
                    toPrecision(BigInt.fromI32(30), 0, STANDARD_DECIMALS_MOCK)
                )
            )
        )

        removeLiquidityEvent.parameters = [
            providerParam,
            tokenAmountsParam,
            tokenSupplyParam,
        ]
        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        handleRemoveLiquidity(removeLiquidityEvent)
    })

    test("Should create new transaction entity with 'AMM_REMOVE_LIQUIDITY' as type", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            removeLiquidityTransactionId,
            "type",
            "AMM_REMOVE_LIQUIDITY"
        )
    })

    test("Should reflect the liquidity removing transaction in the pool asset amounts", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(
                BigInt.fromI32(100),
                1,
                STANDARD_DECIMALS_MOCK
            ).toString()
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(
                BigInt.fromI32(50),
                1,
                STANDARD_DECIMALS_MOCK
            ).toString()
        )
    })

    test("Should create new transaction entity with properly assigned input and outputs", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            removeLiquidityTransactionId,
            "amountsIn",
            `[${generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            removeLiquidityTransactionId,
            "amountsOut",
            `[${generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            )}, ${generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should create new asset amount entities for all the in and out tokens of the transaction", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(
                BigInt.fromI32(50),
                1,
                STANDARD_DECIMALS_MOCK
            ).toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(
                BigInt.fromI32(100),
                1,
                STANDARD_DECIMALS_MOCK
            ).toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(
                BigInt.fromI32(300),
                1,
                STANDARD_DECIMALS_MOCK
            ).toString()
        )
    })

    test("Should reflect the liquidity transaction in the account portfolio", () => {
        let accountIBTId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_IBT_ADDRESS_MOCK.toHex()
        )
        let accountPTId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_PT_ADDRESS_MOCK.toHex()
        )
        let accountLPId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountIBTId,
            "balance",
            POOL_IBT_BALANCE_MOCK.toString()
        )
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountPTId,
            "balance",
            POOL_PT_BALANCE_MOCK.toString()
        )
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountLPId,
            "balance",
            POOL_LP_BALANCE_MOCK.toString()
        )
    })

    test("Should add fees to total balances", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "totalFees",
            "40000000000000000"
        )

        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "totalAdminFees",
            "20000000000000000"
        )
    })

    test("Should create/update FutureDailyStats with the correct details", () => {
        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 1)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "future",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "dailyRemoveLiquidity",
            "1"
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "date",
            DAY_ID_0
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "ibtRate",
            "1"
        )
    })
})

describe("handleTokenExchange()", () => {
    beforeAll(() => {
        let tokenExchangeEvent = changetype<TokenExchange>(newMockEvent())
        tokenExchangeEvent.address = FIRST_POOL_ADDRESS_MOCK
        tokenExchangeEvent.transaction.hash = POOL_EXCHANGE_TRANSACTION_HASH
        tokenExchangeEvent.logIndex = EXCHANGE_LOG_INDEX
        tokenExchangeEvent.block.timestamp = ZERO_BI

        let buyerParam = new ethereum.EventParam(
            "buyer",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let soldIdParam = new ethereum.EventParam(
            "sold_id",
            ethereum.Value.fromI32(1)
        )

        let tokensSoldParam = new ethereum.EventParam(
            "tokens_sold",
            ethereum.Value.fromSignedBigInt(
                toPrecision(BigInt.fromI32(50), 1, STANDARD_DECIMALS_MOCK)
            )
        )

        let boughtIdParam = new ethereum.EventParam(
            "bought_id",
            ethereum.Value.fromI32(0)
        )

        let tokensBoughtParam = new ethereum.EventParam(
            "tokens_bought",
            ethereum.Value.fromSignedBigInt(
                toPrecision(BigInt.fromI32(100), 1, STANDARD_DECIMALS_MOCK)
            )
        )

        tokenExchangeEvent.parameters = [
            buyerParam,
            soldIdParam,
            tokensSoldParam,
            boughtIdParam,
            tokensBoughtParam,
        ]

        handleTokenExchange(tokenExchangeEvent)
    })

    test("Should create new transaction entity with 'AMM_EXCHANGE' as type", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            exchangeTransactionId,
            "type",
            "AMM_EXCHANGE"
        )
    })

    test("Should reflect the exchange transaction in the pool asset amounts", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "0"
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(
                BigInt.fromI32(10),
                0,
                STANDARD_DECIMALS_MOCK
            ).toString()
        )
    })

    test("Should create new asset amount entities for all the in and out tokens of the transaction", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(
                BigInt.fromI32(10),
                0,
                STANDARD_DECIMALS_MOCK
            ).toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(BigInt.fromI32(5), 0, STANDARD_DECIMALS_MOCK).toString()
        )
    })

    test("Should create new transaction entity with properly assigned input and outputs", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            exchangeTransactionId,
            "amountsIn",
            `[${generateAssetAmountId(
                POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            exchangeTransactionId,
            "amountsOut",
            `[${generateAssetAmountId(
                POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should reflect the exchange transaction in the account portfolio", () => {
        let accountIBTId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_IBT_ADDRESS_MOCK.toHex()
        )
        let accountPTId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_PT_ADDRESS_MOCK.toHex()
        )
        let accountLPId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountIBTId,
            "balance",
            POOL_IBT_BALANCE_MOCK.toString()
        )
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountPTId,
            "balance",
            POOL_PT_BALANCE_MOCK.toString()
        )
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountLPId,
            "balance",
            POOL_LP_BALANCE_MOCK.toString()
        )
    })

    test("Should assign account and pool relation to the transaction", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            exchangeTransactionId,
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            exchangeTransactionId,
            "poolInTransaction",
            FIRST_POOL_ADDRESS_MOCK.toHex()
        )
    })

    test("Should set correct transaction fee parameters", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            exchangeTransactionId,
            "fee",
            "8006405124099279"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            exchangeTransactionId,
            "adminFee",
            "4003202562049639"
        )
    })

    test("Should add fees to total balances", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "totalFees",
            "48006405124099279"
        )

        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "totalAdminFees",
            "24003202562049639"
        )
    })

    test("Should create/update FutureDailyStats with the correct details", () => {
        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 1)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "future",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "dailySwaps",
            "1"
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "date",
            DAY_ID_0
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "ibtRate",
            "1"
        )
    })

    test("Recalculate pool APR", () => {
        assert.fieldEquals(
            APR_IN_TIME_ENTITY,
            `${FIRST_POOL_ADDRESS_MOCK.toHex()}-0`,
            "apr",
            "63113852000"
        )
    })

    test("Recalculate pool APR with negative value", () => {
        emitCurvePoolDeployed(SECOND_POOL_ADDRESS_MOCK)

        let tokenExchangeEvent = changetype<TokenExchange>(newMockEvent())
        tokenExchangeEvent.address = SECOND_POOL_ADDRESS_MOCK
        tokenExchangeEvent.transaction.hash =
            POOL_SECOND_EXCHANGE_TRANSACTION_HASH
        tokenExchangeEvent.logIndex = SECOND_EXCHANGE_LOG_INDEX
        tokenExchangeEvent.block.timestamp = ZERO_BI

        let buyerParam = new ethereum.EventParam(
            "buyer",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let soldIdParam = new ethereum.EventParam(
            "sold_id",
            ethereum.Value.fromI32(1)
        )

        let tokensSoldParam = new ethereum.EventParam(
            "tokens_sold",
            ethereum.Value.fromSignedBigInt(
                toPrecision(BigInt.fromI32(50), 1, STANDARD_DECIMALS_MOCK)
            )
        )

        let boughtIdParam = new ethereum.EventParam(
            "bought_id",
            ethereum.Value.fromI32(0)
        )

        let tokensBoughtParam = new ethereum.EventParam(
            "tokens_bought",
            ethereum.Value.fromSignedBigInt(
                toPrecision(BigInt.fromI32(100), 1, STANDARD_DECIMALS_MOCK)
            )
        )

        tokenExchangeEvent.parameters = [
            buyerParam,
            soldIdParam,
            tokensSoldParam,
            boughtIdParam,
            tokensBoughtParam,
        ]

        handleTokenExchange(tokenExchangeEvent)

        assert.fieldEquals(
            APR_IN_TIME_ENTITY,
            `${SECOND_POOL_ADDRESS_MOCK.toHex()}-0`,
            "apr",
            "-2366769450"
        )
    })
})

describe("handleRemoveLiquidityOne()", () => {
    beforeAll(() => {
        let removeLiquidityOneEvent = changetype<RemoveLiquidityOne>(
            newMockEvent()
        )
        removeLiquidityOneEvent.address = FIRST_POOL_ADDRESS_MOCK
        removeLiquidityOneEvent.transaction.hash =
            POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH
        removeLiquidityOneEvent.transaction.from = FIRST_USER_MOCK
        removeLiquidityOneEvent.logIndex = REMOVE_ONE_LIQUIDITY_LOG_INDEX
        removeLiquidityOneEvent.block.timestamp = ZERO_BI

        let providerParam = new ethereum.EventParam(
            "provider",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let tokenAmountParam = new ethereum.EventParam(
            "token_amount",
            ethereum.Value.fromSignedBigInt(
                toPrecision(BigInt.fromI32(5), 0, STANDARD_DECIMALS_MOCK)
            )
        )

        let coinIndexParam = new ethereum.EventParam(
            "coin_index",
            ethereum.Value.fromI32(1)
        )

        let coinAmountParam = new ethereum.EventParam(
            "coin_amount",
            ethereum.Value.fromSignedBigInt(
                toPrecision(BigInt.fromI32(50), 0, STANDARD_DECIMALS_MOCK)
            )
        )

        removeLiquidityOneEvent.parameters = [
            providerParam,
            tokenAmountParam,
            coinIndexParam,
            coinAmountParam,
        ]

        handleRemoveLiquidityOne(removeLiquidityOneEvent)
    })

    test("Should create new transaction entity with 'AMM_REMOVE_LIQUIDITY_ONE' as type", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            removeOneLiquidityTransactionId,
            "type",
            "AMM_REMOVE_LIQUIDITY_ONE"
        )
    })

    test("Should reflect the liquidity removing transaction in the pool asset amounts", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(BigInt.fromI32(35), 0, STANDARD_DECIMALS_MOCK)
                .neg()
                .toString()
        )
    })

    test("Should create new transaction entity with properly assigned input and outputs", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            removeOneLiquidityTransactionId,
            "amountsIn",
            `[${generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            removeOneLiquidityTransactionId,
            "amountsOut",
            `[${generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should create new asset amount entities for all the in and out tokens of the transaction", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(
                BigInt.fromI32(50),
                0,
                STANDARD_DECIMALS_MOCK
            ).toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "amount",
            toPrecision(BigInt.fromI32(5), 0, STANDARD_DECIMALS_MOCK).toString()
        )
    })

    test("Should reflect the liquidity transaction in the user portfolio", () => {
        let accountPTId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_PT_ADDRESS_MOCK.toHex()
        )
        let accountLPId = generateAccountAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountPTId,
            "balance",
            POOL_PT_BALANCE_MOCK.toString()
        )
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountLPId,
            "balance",
            POOL_LP_BALANCE_MOCK.toString()
        )
    })

    test("Should set correct transaction fee parameters", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            removeOneLiquidityTransactionId,
            "fee",
            "40032025620496397"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            removeOneLiquidityTransactionId,
            "adminFee",
            "20016012810248198"
        )
    })

    test("Should add fees to total balances", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "totalFees",
            "88038430744595676"
        )

        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "totalAdminFees",
            "44019215372297837"
        )
    })

    test("Should create/update FutureDailyStats with the correct details", () => {
        assert.entityCount(FUTURE_DAILY_STATS_ENTITY, 1)
        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "future",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "dailyRemoveLiquidity",
            "2"
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "date",
            DAY_ID_0
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "ibtRate",
            "1"
        )
    })

    test("Recalculate pool APR", () => {
        const aprInTimeId = `${FIRST_POOL_ADDRESS_MOCK.toHex()}-1`

        assert.fieldEquals(
            APR_IN_TIME_ENTITY,
            aprInTimeId,
            "spotPrice",
            "9000000000000000000"
        )

        assert.fieldEquals(
            APR_IN_TIME_ENTITY,
            aprInTimeId,
            "ibtRate",
            "200000000000000000"
        )

        assert.fieldEquals(
            APR_IN_TIME_ENTITY,
            aprInTimeId,
            "underlyingToPT",
            "9000000000000000000"
        )

        assert.fieldEquals(
            APR_IN_TIME_ENTITY,
            aprInTimeId,
            "apr",
            "126227704000"
        )
    })
})

describe("handleCommitNewParameters", () => {
    beforeAll(() => {
        let commitNewParametersEvent = changetype<CommitNewParameters>(
            newMockEvent()
        )
        commitNewParametersEvent.address = FIRST_POOL_ADDRESS_MOCK

        let deadlineParam = new ethereum.EventParam(
            "deadline",
            ethereum.Value.fromI32(2)
        )

        let adminFeeParam = new ethereum.EventParam(
            "admin_fee",
            ethereum.Value.fromSignedBigInt(FUTURE_ADMIN_FEE)
        )

        commitNewParametersEvent.parameters = [deadlineParam, adminFeeParam]

        handleCommitNewParameters(commitNewParametersEvent)
    })

    test("Should set future admin fee", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "futureAdminFeeRate",
            FUTURE_ADMIN_FEE.toString()
        )
    })

    test("Should set future admin fee", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "futureAdminFeeDeadline",
            "2"
        )
    })
})

describe("handleNewParameter", () => {
    beforeAll(() => {
        let newParametersEvent = changetype<NewParameters>(newMockEvent())
        newParametersEvent.address = FIRST_POOL_ADDRESS_MOCK

        let adminFeeParam = new ethereum.EventParam(
            "admin_fee",
            ethereum.Value.fromSignedBigInt(ADMIN_FEE)
        )

        newParametersEvent.parameters = [adminFeeParam]

        handleNewParameters(newParametersEvent)
    })

    test("Should set future admin fee", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "adminFeeRate",
            ADMIN_FEE.toString()
        )
    })
})

describe("handleClaimAdminFee", () => {
    beforeAll(() => {
        let claimAdminFeeEvent = changetype<ClaimAdminFee>(newMockEvent())
        claimAdminFeeEvent.address = FIRST_POOL_ADDRESS_MOCK
        claimAdminFeeEvent.block.timestamp = BigInt.fromI32(1)

        let adminParam = new ethereum.EventParam(
            "admin",
            ethereum.Value.fromAddress(FEE_COLLECTOR_ADDRESS_MOCK)
        )

        let tokensParam = new ethereum.EventParam(
            "tokens",
            ethereum.Value.fromSignedBigInt(COLLECTED_ADMIN_FEE)
        )

        claimAdminFeeEvent.parameters = [adminParam, tokensParam]

        handleClaimAdminFee(claimAdminFeeEvent)
    })

    test("Should create new FeeClaim entity", () => {
        assert.fieldEquals(
            FEE_CLAIM_ENTITY,
            generateFeeClaimId(FEE_COLLECTOR_ADDRESS_MOCK.toHex(), "1"),
            "amount",
            COLLECTED_ADMIN_FEE.toString()
        )
    })

    test("Should properly assign pool relation to the claimed fees", () => {
        assert.fieldEquals(
            FEE_CLAIM_ENTITY,
            generateFeeClaimId(FEE_COLLECTOR_ADDRESS_MOCK.toHex(), "1"),
            "pool",
            FIRST_POOL_ADDRESS_MOCK.toHex()
        )

        let poolEntity = Pool.load(FIRST_POOL_ADDRESS_MOCK.toHex())!

        let feeClaims = poolEntity.feeClaims.load()!

        assert.stringEquals(
            feeClaims[0].id,
            generateFeeClaimId(FEE_COLLECTOR_ADDRESS_MOCK.toHex(), "1")
        )
    })

    test("Should add collected fees to its total amount", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "totalClaimedAdminFees",
            COLLECTED_ADMIN_FEE.toString()
        )
    })
})
