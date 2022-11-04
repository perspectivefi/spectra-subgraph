import { Address, BigInt, ethereum, Value } from "@graphprotocol/graph-ts"
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

import { AddLiquidity, RemoveLiquidity } from "../../generated/AMM/CurvePool"
import { handleAddLiquidity, handleRemoveLiquidity } from "../mappings/amm"
import { generateAssetAmountId, generateUserAssetId } from "../utils"
import {
    emiCurveFactoryChanged,
    emitCurvePoolDeployed,
    emitFutureVaultDeployed,
} from "./events/FutureVault"
import { mockCurvePoolFunctions, POOL_LP_ADDRESS_MOCK } from "./mocks/CurvePool"
import {
    POOL_DEPLOY_TRANSACTION_HASH,
    FIRST_POOL_ADDRESS_MOCK,
    mockMetaPoolFactoryFunctions,
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "./mocks/CurvePoolFactory"
import { mockERC20Functions } from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    DEPOSIT_TRANSACTION_HASH,
    FIRST_USER_MOCK,
    mockFutureVaultFunctions,
    WITHDRAW_TRANSACTION_HASH,
} from "./mocks/FutureVault"
import {
    ASSET_AMOUNT_ENTITY,
    POOL_ENTITY,
    TRANSACTION_ENTITY,
    USER_ASSET_ENTITY,
    USER_ENTITY,
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
        addLiquidityEvent.transaction.hash = DEPOSIT_TRANSACTION_HASH

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
            DEPOSIT_TRANSACTION_HASH.toHex(),
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
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "amountsIn",
            `[${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            )}, ${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "amountsOut",
            `[${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should create new asset amount entities for all the in and out tokens of the transaction", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "15"
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "15"
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
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

        assert.fieldEquals(USER_ASSET_ENTITY, userIBTId, "balance", "-15")
        assert.fieldEquals(USER_ASSET_ENTITY, userPTId, "balance", "-15")
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
})

describe("handleRemoveLiquidity()", () => {
    beforeAll(() => {
        let removeLiquidityEvent = changetype<RemoveLiquidity>(newMockEvent())
        removeLiquidityEvent.address = FIRST_POOL_ADDRESS_MOCK
        removeLiquidityEvent.transaction.hash = WITHDRAW_TRANSACTION_HASH

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
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "type",
            "AMM_REMOVE_LIQUIDITY"
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
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "amountsIn",
            `[${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            )}]`
        )
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "amountsOut",
            `[${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            )}, ${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should create new asset amount entities for all the in and out tokens of the transaction", () => {
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                POOL_IBT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "5"
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "10"
        )
        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "amount",
            "30"
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

        assert.fieldEquals(USER_ASSET_ENTITY, userIBTId, "balance", "-10")
        assert.fieldEquals(USER_ASSET_ENTITY, userPTId, "balance", "-5")
        assert.fieldEquals(USER_ASSET_ENTITY, userLPId, "balance", "20")
    })
})
