import { ethereum } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    newMockEvent,
    clearStore,
    assert,
    beforeEach,
    logStore,
    beforeAll,
} from "matchstick-as/assembly/index"

import {
    AddLiquidity,
    RemoveLiquidity,
    RemoveLiquidityOne,
    TokenExchange,
} from "../../generated/AMM/CurvePool"
import {
    handleAddLiquidity,
    handleRemoveLiquidity,
    handleRemoveLiquidityOne,
    handleTokenExchange,
} from "../mappings/amm"
import { generateAssetAmountId, generateAccountAssetId } from "../utils"
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
} from "./mocks/CurvePool"
import {
    POOL_DEPLOY_TRANSACTION_HASH,
    FIRST_POOL_ADDRESS_MOCK,
    mockMetaPoolFactoryFunctions,
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "./mocks/CurvePoolFactory"
import { mockERC20Functions } from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import { FIRST_USER_MOCK, mockFutureVaultFunctions } from "./mocks/FutureVault"
import {
    ASSET_AMOUNT_ENTITY,
    POOL_ENTITY,
    TRANSACTION_ENTITY,
    ACCOUNT_ASSET_ENTITY,
    ACCOUNT_ENTITY,
} from "./utils/entities"

const LP_TOTAL_SUPPLY = 50

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
            ethereum.Value.fromI32Array([15, 15])
        )

        let feeParam = new ethereum.EventParam("fee", ethereum.Value.fromI32(2))

        let tokenSupplyParam = new ethereum.EventParam(
            "token_supply",
            ethereum.Value.fromI32(LP_TOTAL_SUPPLY)
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
            "15"
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "15"
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
            "15"
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_ADD_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "15"
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
            ACCOUNT_ENTITY,
            FIRST_USER_MOCK.toHex(),
            "portfolio",
            `[${accountIBTId}, ${accountPTId}, ${accountLPId}]`
        )

        assert.fieldEquals(ACCOUNT_ASSET_ENTITY, accountIBTId, "balance", "-15")
        assert.fieldEquals(ACCOUNT_ASSET_ENTITY, accountPTId, "balance", "-15")
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            accountLPId,
            "balance",
            LP_TOTAL_SUPPLY.toString()
        )
    })

    test("Creates new LP position", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "liquidityPositions",
            `[${generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
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
            ethereum.Value.fromI32Array([5, 10])
        )

        let tokenSupplyParam = new ethereum.EventParam(
            "token_supply",
            ethereum.Value.fromI32(LP_TOTAL_SUPPLY - 30)
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
            "10"
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_DEPLOY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "5"
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
            "5"
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "10"
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "30"
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

        assert.fieldEquals(ACCOUNT_ASSET_ENTITY, accountIBTId, "balance", "-10")
        assert.fieldEquals(ACCOUNT_ASSET_ENTITY, accountPTId, "balance", "-5")
        assert.fieldEquals(ACCOUNT_ASSET_ENTITY, accountLPId, "balance", "20")
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
            ethereum.Value.fromI32(5)
        )

        let boughtIdParam = new ethereum.EventParam(
            "bought_id",
            ethereum.Value.fromI32(0)
        )

        let tokensBoughtParam = new ethereum.EventParam(
            "tokens_bought",
            ethereum.Value.fromI32(10)
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
            "10"
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
            "10"
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                POOL_EXCHANGE_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "5"
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

        assert.fieldEquals(ACCOUNT_ASSET_ENTITY, accountIBTId, "balance", "0")
        assert.fieldEquals(ACCOUNT_ASSET_ENTITY, accountPTId, "balance", "-10")
        assert.fieldEquals(ACCOUNT_ASSET_ENTITY, accountLPId, "balance", "20")
    })

    test("Should assign account and pool relation to the transaction", () => {
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
                "providerParam",
                ethereum.Value.fromAddress(FIRST_USER_MOCK)
            )

            let tokenAmountParam = new ethereum.EventParam(
                "token_amount",
                ethereum.Value.fromI32(5)
            )

            let coinIndexParam = new ethereum.EventParam(
                "coin_index",
                ethereum.Value.fromI32(1)
            )

            let coinAmountParam = new ethereum.EventParam(
                "coin_amount",
                ethereum.Value.fromI32(50)
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
                "-40"
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
                "50"
            )
            assert.fieldEquals(
                ASSET_AMOUNT_ENTITY,
                generateAssetAmountId(
                    POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH.toHex(),
                    POOL_LP_ADDRESS_MOCK.toHex()
                ),
                "amount",
                "5"
            )
        })

        test("Should reflect the liquidity transaction in the account portfolio", () => {
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
                "40"
            )
            assert.fieldEquals(
                ACCOUNT_ASSET_ENTITY,
                accountLPId,
                "balance",
                "15"
            )
        })
    })
})
