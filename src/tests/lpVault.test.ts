import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import { assert, clearStore, describe, newMockEvent, test } from "matchstick-as"
import { beforeAll } from "matchstick-as"

import { Account, LPVault } from "../../generated/schema"
import {
    Deposit,
    Paused,
    CurvePoolUpdated,
    Unpaused,
    Withdraw,
} from "../../generated/templates/LPVault/LPVault"
import {
    handleDeposit,
    handleWithdraw,
    handlePaused,
    handleUnpaused,
    handleCurvePoolUpdated,
} from "../mappings/lpVaults"
import { generateAccountAssetId, generateAssetAmountId } from "../utils"
import AssetType from "../utils/AssetType"
import transactionType from "../utils/TransactionType"
import { generateTransactionId } from "../utils/idGenerators"
import { emitFactoryUpdated } from "./events/Factory"
import {
    emiCurveFactoryChanged,
    emitCurvePoolDeployed,
    emitFutureVaultDeployed,
} from "./events/FutureVault"
import { emitLPVDeployed } from "./events/LPVault"
import {
    FIRST_POOL_ADDRESS_MOCK,
    mockCurvePoolFunctions,
    SECOND_POOL_ADDRESS_MOCK,
} from "./mocks/CurvePool"
import {
    ETH_ADDRESS_MOCK,
    LP_VAULT_SHARES_BALANCE_MOCK,
    LP_VAULT_UNDERLYING_BALANCE_MOCK,
    mockERC20Balances,
    mockERC20Functions,
} from "./mocks/ERC20"
import {
    mockFactoryFunctions,
    FACTORY_ADDRESS_MOCK,
    CURVE_FACTORY_ADDRESS_MOCK,
} from "./mocks/Factory"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    mockFutureVaultFunctions,
} from "./mocks/FutureVault"
import {
    LP_VAULT_ASSET_ADDRESS_MOCK,
    LP_VAULT_ADDRESS_MOCK,
    mockLPVaultFunctions,
    PRINCIPAL_TOKEN_ADDRESS_MOCK,
    DEPOSIT_TRANSACTION_HASH,
    WITHDRAW_TRANSACTION_HASH,
    LP_VAULT_TOTAL_SUPPLY_MOCK,
    LP_VAULT_TOTAL_ASSETS_MOCK,
} from "./mocks/LPVault"
import {
    ACCOUNT_ASSET_ENTITY,
    ASSET_AMOUNT_ENTITY,
    ASSET_ENTITY,
    LP_VAULT_ENTITY,
    POOL_ENTITY,
    TRANSACTION_ENTITY,
} from "./utils/entities"

const DEPOSIT_LOG_INDEX = BigInt.fromI32(1)
const WITHDRAW_LOG_INDEX = BigInt.fromI32(2)

const depositTransactionId = generateTransactionId(
    DEPOSIT_TRANSACTION_HASH,
    DEPOSIT_LOG_INDEX.toString()
)

const withdrawTransactionId = generateTransactionId(
    WITHDRAW_TRANSACTION_HASH,
    WITHDRAW_LOG_INDEX.toString()
)

describe("handleLPVDeployed()", () => {
    beforeAll(() => {
        mockFeedRegistryInterfaceFunctions()
        mockERC20Functions()

        mockFactoryFunctions()
        mockCurvePoolFunctions()

        mockFutureVaultFunctions()
        mockFactoryFunctions()

        mockLPVaultFunctions()

        emitFactoryUpdated()
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emitFutureVaultDeployed(PRINCIPAL_TOKEN_ADDRESS_MOCK)

        emitLPVDeployed()
    })

    test("Should create new LPVaultFactory entity for both - old and new factories", () => {
        assert.entityCount(LP_VAULT_ENTITY, 1)
    })

    test("Should assign Future and LPVaultFactory relations to the deployed LPVault", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "future",
            PRINCIPAL_TOKEN_ADDRESS_MOCK.toHexString()
        )

        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "factory",
            FACTORY_ADDRESS_MOCK.toHexString()
        )
    })

    test("Should create new Asset entities if necessary and assign this entity as LPVault underlying and ibt fields", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            ETH_ADDRESS_MOCK,
            "address",
            ETH_ADDRESS_MOCK
        )

        assert.fieldEquals(
            ASSET_ENTITY,
            ETH_ADDRESS_MOCK,
            "type",
            AssetType.UNDERLYING
        )

        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "underlying",
            ETH_ADDRESS_MOCK
        )
    })

    test("Should assign correct state to the deployed LPVault", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "state",
            "ACTIVE"
        )
    })

    test("Should add name, symbol and chainId fields to the LPVault", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "name",
            "LP Vault Name"
        )

        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "symbol",
            "LP Vault Symbol"
        )

        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "chainId",
            "1"
        )
    })

    test("Should create new pool entity", () => {
        assert.entityCount(POOL_ENTITY, 1)
    })

    test("Should assign pool relation to the deployed LPVault", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "pool",
            FIRST_POOL_ADDRESS_MOCK.toHex()
        )
    })
})

describe("handlePaused()", () => {
    beforeAll(() => {
        let pausedEvent = changetype<Paused>(newMockEvent())
        pausedEvent.address = LP_VAULT_ADDRESS_MOCK

        let accountParam = new ethereum.EventParam(
            "account",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        pausedEvent.parameters = [accountParam]
        handlePaused(pausedEvent)
    })

    test("Should change LPVault state", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "state",
            "PAUSED"
        )
    })
})

describe("handleUnpaused()", () => {
    beforeAll(() => {
        let unpausedEvent = changetype<Unpaused>(newMockEvent())
        unpausedEvent.address = LP_VAULT_ADDRESS_MOCK

        let accountParam = new ethereum.EventParam(
            "account",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        unpausedEvent.parameters = [accountParam]
        handleUnpaused(unpausedEvent)
    })

    test("Should change LPVault state", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "state",
            "ACTIVE"
        )
    })
})

describe("handleDeposit()", () => {
    beforeAll(() => {
        mockERC20Balances()

        let depositEvent = changetype<Deposit>(newMockEvent())
        depositEvent.address = LP_VAULT_ADDRESS_MOCK
        depositEvent.transaction.hash = DEPOSIT_TRANSACTION_HASH
        depositEvent.logIndex = DEPOSIT_LOG_INDEX

        let senderParam = new ethereum.EventParam(
            "sender",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let ownerParam = new ethereum.EventParam(
            "owner",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let assetsParam = new ethereum.EventParam(
            "assets",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromString("50"))
        )

        let sharesParam = new ethereum.EventParam(
            "shares",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromString("150"))
        )

        depositEvent.parameters = [
            senderParam,
            ownerParam,
            assetsParam,
            sharesParam,
        ]
        handleDeposit(depositEvent)
    })

    test("Should update `totalSupply`", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "totalSupply",
            LP_VAULT_TOTAL_SUPPLY_MOCK.toString()
        )
    })

    test("Should update `totalAmount`", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "totalAssets",
            LP_VAULT_TOTAL_ASSETS_MOCK.toString()
        )
    })

    test("Should create a new Transaction entity with properly assigned LPVault as well as account entity", () => {
        assert.entityCount(TRANSACTION_ENTITY, 1)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "type",
            transactionType.LP_VAULT_IBT_DEPOSIT
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "lpVaultInTransaction",
            LP_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )
    })
    test("Should create Asset entities for all the tokens in the transaction", () => {
        // Underlying
        assert.fieldEquals(
            ASSET_ENTITY,
            LP_VAULT_ASSET_ADDRESS_MOCK.toHex(),
            "address",
            LP_VAULT_ASSET_ADDRESS_MOCK.toHex()
        )

        // LPVault shares
        assert.fieldEquals(
            ASSET_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "address",
            LP_VAULT_ADDRESS_MOCK.toHex()
        )
    })
    test("Should create four new AssetAmount entities with properly assigned transaction relations and correct transaction values", () => {
        assert.entityCount(ASSET_AMOUNT_ENTITY, 4)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "amountsIn",
            `[${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                LP_VAULT_ASSET_ADDRESS_MOCK.toHex()
            )}]`
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                LP_VAULT_ASSET_ADDRESS_MOCK.toHex()
            ),
            "amount",
            BigInt.fromString("50").toString()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "amountsOut",
            `[${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            )}]`
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            BigInt.fromString("150").toString()
        )
    })

    test("Should create Transaction entity with full of information about gas, gas price, block number, sender and receiver", () => {
        assert.fieldEquals(TRANSACTION_ENTITY, depositTransactionId, "gas", "1")

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "gasPrice",
            "1"
        )
    })

    test("Should create two AccountAsset entities and fetch Underlying token balance", () => {
        assert.entityCount(ACCOUNT_ASSET_ENTITY, 2)

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                LP_VAULT_ASSET_ADDRESS_MOCK.toHex()
            ),
            "balance",
            LP_VAULT_UNDERLYING_BALANCE_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            LP_VAULT_SHARES_BALANCE_MOCK.toString()
        )
    })

    test("Should assign all AccountAsset entities to the sender Account in the transaction", () => {
        let accountEntity = Account.load(FIRST_USER_MOCK.toHex())!
        let portfolio = accountEntity.portfolio.load()

        assert.i32Equals(portfolio.length, 2)
    })

    test("Should add relation between LPVault and transaction sender by AccountAsset entity", () => {
        let lpVaultEntity = LPVault.load(LP_VAULT_ADDRESS_MOCK.toHex())!
        let positions = lpVaultEntity.positions.load()

        assert.i32Equals(positions.length, 1)
        assert.stringEquals(
            positions[0].id,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            )
        )
    })
})

describe("handleWithdraw()", () => {
    beforeAll(() => {
        let withdrawEvent = changetype<Withdraw>(newMockEvent())
        withdrawEvent.address = LP_VAULT_ADDRESS_MOCK
        withdrawEvent.transaction.hash = WITHDRAW_TRANSACTION_HASH
        withdrawEvent.logIndex = WITHDRAW_LOG_INDEX

        let senderParam = new ethereum.EventParam(
            "sender",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let receiverParam = new ethereum.EventParam(
            "receiver",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let ownerParam = new ethereum.EventParam(
            "owner",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let assetsParam = new ethereum.EventParam(
            "assets",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromString("130"))
        )

        let sharesParam = new ethereum.EventParam(
            "shares",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromString("30"))
        )

        withdrawEvent.parameters = [
            senderParam,
            receiverParam,
            ownerParam,
            assetsParam,
            sharesParam,
        ]
        handleWithdraw(withdrawEvent)
    })

    test("Should create a new Transaction entity with properly assigned LPVault as well as account entity", () => {
        assert.entityCount(TRANSACTION_ENTITY, 2)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "type",
            transactionType.LP_VAULT_WITHDRAW
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "lpVaultInTransaction",
            LP_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )
    })

    test("Should create two new AssetAmount entities with properly assigned transaction relations and correct transaction values", () => {
        assert.entityCount(ASSET_AMOUNT_ENTITY, 6)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "amountsIn",
            `[${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            )}]`
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            ),
            "amount",
            BigInt.fromString("30").toString()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "amountsOut",
            `[${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                LP_VAULT_ASSET_ADDRESS_MOCK.toHex()
            )}]`
        )

        assert.fieldEquals(
            ASSET_AMOUNT_ENTITY,
            generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                LP_VAULT_ASSET_ADDRESS_MOCK.toHex()
            ),
            "amount",
            BigInt.fromString("130").toString()
        )
    })

    test("Should create Transaction entity with full of information about gas, gas price, block number, sender and receiver", () => {
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "gas",
            "1"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "gasPrice",
            "1"
        )
    })

    test("Should update AccountAsset entities used in the previous deposit event", () => {
        assert.entityCount(ACCOUNT_ASSET_ENTITY, 2)

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                LP_VAULT_ASSET_ADDRESS_MOCK.toHex()
            ),
            "balance",
            LP_VAULT_UNDERLYING_BALANCE_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            LP_VAULT_SHARES_BALANCE_MOCK.toString()
        )
    })
})

describe("handleCurvePoolUpdated()", () => {
    beforeAll(() => {
        mockFactoryFunctions()
        mockCurvePoolFunctions()

        emiCurveFactoryChanged()
        emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)

        let curvePoolUpdatedEvent = changetype<CurvePoolUpdated>(newMockEvent())
        curvePoolUpdatedEvent.address = LP_VAULT_ADDRESS_MOCK

        let oldCurvePoolParam = new ethereum.EventParam(
            "_oldCurvePool",
            ethereum.Value.fromAddress(FIRST_POOL_ADDRESS_MOCK)
        )

        let newCurvePoolParam = new ethereum.EventParam(
            "_newCurvePool",
            ethereum.Value.fromAddress(SECOND_POOL_ADDRESS_MOCK)
        )

        curvePoolUpdatedEvent.parameters = [
            oldCurvePoolParam,
            newCurvePoolParam,
        ]
        handleCurvePoolUpdated(curvePoolUpdatedEvent)
    })

    test("Should assign new pool address", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "pool",
            SECOND_POOL_ADDRESS_MOCK.toHex()
        )
    })

    test("Should create Pool if does not exist", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            SECOND_POOL_ADDRESS_MOCK.toHex(),
            "id",
            SECOND_POOL_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            POOL_ENTITY,
            SECOND_POOL_ADDRESS_MOCK.toHex(),
            "factory",
            CURVE_FACTORY_ADDRESS_MOCK.toHex()
        )
    })
})
