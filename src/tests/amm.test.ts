import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    newMockEvent,
    clearStore,
    assert,
    logStore,
    beforeAll,
} from "matchstick-as/assembly/index"

import {
    AddLiquidity,
    ClaimAdminFee,
    CommitNewParameters,
    NewParameters,
    RemoveLiquidity,
    RemoveLiquidityOne,
    TokenExchange,
} from "../../generated/AMM/CurvePool"
import {
    handleAddLiquidity,
    handleClaimAdminFee,
    handleCommitNewParameters,
    handleNewParameters,
    handleRemoveLiquidity,
    handleRemoveLiquidityOne,
    handleTokenExchange,
} from "../mappings/amm"
import { generateAssetAmountId, generateUserAssetId } from "../utils"
import { generateFeeClaimId } from "../utils/idGenerators"
import {
    emiCurveFactoryChanged,
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
    POOL_ADMIN_FEE_MOCK,
} from "./mocks/CurvePool"
import {
    POOL_DEPLOY_TRANSACTION_HASH,
    FIRST_POOL_ADDRESS_MOCK,
    mockMetaPoolFactoryFunctions,
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "./mocks/CurvePoolFactory"
import { DECIMALS_MOCK, mockERC20Functions } from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FEE_COLLECTOR_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    mockFutureVaultFunctions,
} from "./mocks/FutureVault"
import {
    ASSET_AMOUNT_ENTITY,
    FEE_CLAIM_ENTITY,
    POOL_ENTITY,
    TRANSACTION_ENTITY,
    USER_ASSET_ENTITY,
    USER_ENTITY,
} from "./utils/entities"

const LP_TOTAL_SUPPLY = BigInt.fromI32(50).times(
    BigInt.fromI32(10).pow(DECIMALS_MOCK)
)

const ADD_LIQUIDITY_TOKEN_AMOUNTS = [
    BigInt.fromString("15").times(BigInt.fromI32(10).pow(DECIMALS_MOCK)),
    BigInt.fromString("15").times(BigInt.fromI32(10).pow(DECIMALS_MOCK)),
]

const REMOVE_LIQUIDITY_TOKEN_AMOUNTS = [
    BigInt.fromString("5").times(BigInt.fromI32(10).pow(DECIMALS_MOCK)),
    BigInt.fromString("10").times(BigInt.fromI32(10).pow(DECIMALS_MOCK)),
]

const FEE = BigInt.fromI32(4).times(BigInt.fromI32(10).pow(8))
const ADMIN_FEE = BigInt.fromI32(5).times(BigInt.fromI32(10).pow(10))
const FUTURE_ADMIN_FEE = BigInt.fromI32(5).times(BigInt.fromI32(10).pow(10))
const COLLECTED_ADMIN_FEE = BigInt.fromI32(50).times(BigInt.fromI32(10).pow(8))

describe("handleAddLiquidity()", () => {
    beforeAll(() => {
        clearStore()

        mockERC20Functions()
        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
        mockMetaPoolFactoryFunctions()
        mockCurvePoolFunctions()

        emitFutureVaultDeployed()
        emiCurveFactoryChanged()
        emitCurvePoolDeployed()

        let addLiquidityEvent = changetype<AddLiquidity>(newMockEvent())
        addLiquidityEvent.address = FIRST_POOL_ADDRESS_MOCK
        addLiquidityEvent.transaction.hash = POOL_ADD_LIQUIDITY_TRANSACTION_HASH

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
            POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
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
            POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
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
            POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
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
            LP_TOTAL_SUPPLY.toString()
        )
    })

    test("Should reflect the liquidity transaction in the user portfolio", () => {
        let userIBTId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_IBT_ADDRESS_MOCK.toHex()
        )
        let userPTId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_PT_ADDRESS_MOCK.toHex()
        )
        let userLPId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            USER_ENTITY,
            FIRST_USER_MOCK.toHex(),
            "portfolio",
            `[${userIBTId}, ${userPTId}, ${userLPId}]`
        )

        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userIBTId,
            "balance",
            ADD_LIQUIDITY_TOKEN_AMOUNTS[0].neg().toString()
        )
        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userPTId,
            "balance",
            ADD_LIQUIDITY_TOKEN_AMOUNTS[1].neg().toString()
        )
        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userLPId,
            "balance",
            LP_TOTAL_SUPPLY.toString()
        )
    })

    test("Creates new LP position", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "liquidityPositions",
            `[${generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should set correct transaction fee parameters", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
            "fee",
            "40000000000000000"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
            "adminFee",
            "20000000000000000"
        )
    })
})

describe("handleRemoveLiquidity()", () => {
    beforeAll(() => {
        let removeLiquidityEvent = changetype<RemoveLiquidity>(newMockEvent())
        removeLiquidityEvent.address = FIRST_POOL_ADDRESS_MOCK
        removeLiquidityEvent.transaction.hash =
            POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH

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
                    BigInt.fromI32(30).times(
                        BigInt.fromI32(10).pow(DECIMALS_MOCK)
                    )
                )
            )
        )

        removeLiquidityEvent.parameters = [
            providerParam,
            tokenAmountsParam,
            tokenSupplyParam,
        ]

        handleRemoveLiquidity(removeLiquidityEvent)
    })

    test("Should create new transaction entity with 'AMM_REMOVE_LIQUIDITY' as type", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
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
            // instead of .times(BigInt.fromI32(20)).pow...
            BigInt.fromI32(10)
                .pow(DECIMALS_MOCK + 1)
                .toString()
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            BigInt.fromI32(5)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
    })

    test("Should create new transaction entity with properly assigned input and outputs", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
            "amountsIn",
            `[${generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
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
            BigInt.fromI32(5)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            // instead of .times(BigInt.fromI32(20)).pow...
            BigInt.fromI32(10)
                .pow(DECIMALS_MOCK + 1)
                .toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "amount",
            BigInt.fromI32(30)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
    })

    test("Should reflect the liquidity transaction in the user portfolio", () => {
        let userIBTId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_IBT_ADDRESS_MOCK.toHex()
        )
        let userPTId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_PT_ADDRESS_MOCK.toHex()
        )
        let userLPId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userIBTId,
            "balance",
            BigInt.fromI32(10)
                .pow(DECIMALS_MOCK + 1)
                .neg()
                .toString()
        )
        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userPTId,
            "balance",
            BigInt.fromI32(5)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .neg()
                .toString()
        )
        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userLPId,
            "balance",
            BigInt.fromI32(20)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
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
})

describe("handleTokenExchange()", () => {
    beforeAll(() => {
        let tokenExchangeEvent = changetype<TokenExchange>(newMockEvent())
        tokenExchangeEvent.address = FIRST_POOL_ADDRESS_MOCK
        tokenExchangeEvent.transaction.hash = POOL_EXCHANGE_TRANSACTION_HASH

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
                BigInt.fromI32(5).times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
            )
        )

        let boughtIdParam = new ethereum.EventParam(
            "bought_id",
            ethereum.Value.fromI32(0)
        )

        let tokensBoughtParam = new ethereum.EventParam(
            "tokens_bought",
            ethereum.Value.fromSignedBigInt(
                BigInt.fromI32(10).times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
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
            POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
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
            BigInt.fromI32(10)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
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
            BigInt.fromI32(10)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            BigInt.fromI32(5)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
    })

    test("Should create new transaction entity with properly assigned input and outputs", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
            "amountsIn",
            `[${generateAssetAmountId(
                POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
            "amountsOut",
            `[${generateAssetAmountId(
                POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should reflect the exchange transaction in the user portfolio", () => {
        let userIBTId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_IBT_ADDRESS_MOCK.toHex()
        )
        let userPTId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_PT_ADDRESS_MOCK.toHex()
        )
        let userLPId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(USER_ASSET_ENTITY, userIBTId, "balance", "0")
        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userPTId,
            "balance",
            BigInt.fromI32(10)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .neg()
                .toString()
        )
        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userLPId,
            "balance",
            BigInt.fromI32(20)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
    })

    test("Should assign user and pool relation to the transaction", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
            "poolInTransaction",
            FIRST_POOL_ADDRESS_MOCK.toHex()
        )
    })

    test("Should set correct transaction fee parameters", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
            "fee",
            "8006405124099279"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
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

        let providerParam = new ethereum.EventParam(
            "provider",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let tokenAmountParam = new ethereum.EventParam(
            "token_amount",
            ethereum.Value.fromSignedBigInt(
                BigInt.fromI32(5).times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
            )
        )

        let coinIndexParam = new ethereum.EventParam(
            "coin_index",
            ethereum.Value.fromI32(1)
        )

        let coinAmountParam = new ethereum.EventParam(
            "coin_amount",
            ethereum.Value.fromSignedBigInt(
                BigInt.fromI32(50).times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
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
            POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
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
            BigInt.fromI32(40)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .neg()
                .toString()
        )
    })

    test("Should create new transaction entity with properly assigned input and outputs", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
            "amountsIn",
            `[${generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
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
            BigInt.fromI32(50)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "amount",
            BigInt.fromI32(5)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
    })

    test("Should reflect the liquidity transaction in the user portfolio", () => {
        let userPTId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_PT_ADDRESS_MOCK.toHex()
        )
        let userLPId = generateUserAssetId(
            FIRST_USER_MOCK.toHex(),
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userPTId,
            "balance",
            BigInt.fromI32(40)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
        assert.fieldEquals(
            USER_ASSET_ENTITY,
            userLPId,
            "balance",
            BigInt.fromI32(15)
                .times(BigInt.fromI32(10).pow(DECIMALS_MOCK))
                .toString()
        )
    })

    test("Should set correct transaction fee parameters", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
            "fee",
            "40032025620496397"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
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

        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "feeClaims",
            `[${generateFeeClaimId(FEE_COLLECTOR_ADDRESS_MOCK.toHex(), "1")}]`
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
