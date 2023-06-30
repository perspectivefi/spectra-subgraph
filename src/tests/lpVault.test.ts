import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import { assert, clearStore, describe, newMockEvent, test } from "matchstick-as"
import { beforeAll } from "matchstick-as"

import {
    Deposit,
    FeeUpdated,
    Paused,
    PoolIndexUpdated,
    Unpaused,
    Withdraw,
} from "../../generated/templates/LPVault/LPVault"
import {
    handleDeposit,
    handleWithdraw,
    handlePaused,
    handleUnpaused,
    handleFeeUpdated,
    handlePoolIndexUpdated,
} from "../mappings/lpVaults"
import { generateAccountAssetId, generateAssetAmountId } from "../utils"
import AssetType from "../utils/AssetType"
import transactionType from "../utils/TransactionType"
import { generateTransactionId } from "../utils/idGenerators"
import {
    emiCurveFactoryChanged,
    emitCurvePoolDeployed,
    emitFutureVaultDeployed,
} from "./events/FutureVault"
import { emitPrincipalTokenFactoryUpdated } from "./events/FutureVaultFactory"
import { emitLPVaultDeployed } from "./events/LPVault"
import { emitLPVaultRegistryUpdate } from "./events/LPVaultFactory"
import {
    FIRST_POOL_ADDRESS_MOCK,
    mockCurvePoolFunctions,
} from "./mocks/CurvePool"
import { mockCurvePoolFactoryFunctions } from "./mocks/CurvePoolFactory"
import {
    LP_VAULT_SHARES_BALANCE_MOCK,
    LP_VAULT_UNDERLYING_BALANCE_MOCK,
    mockERC20Balances,
    mockERC20Functions,
} from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    mockFutureVaultFunctions,
} from "./mocks/FutureVault"
import { mockFutureVaultFactoryFunctions } from "./mocks/FutureVaultFactory"
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
    LP_VAULT_FACTORY_ADDRESS_MOCK,
    OLD_LP_VAULT_REGISTRY_ADDRESS_MOCK,
} from "./mocks/LPVaultFactory"
import {
    ACCOUNT_ASSET_ENTITY,
    ACCOUNT_ENTITY,
    ASSET_AMOUNT_ENTITY,
    ASSET_ENTITY,
    LP_VAULT_ENTITY,
    LP_VAULT_FACTORY_ENTITY,
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

describe("handleRegistryUpdated()", () => {
    beforeAll(() => {
        clearStore()

        emitLPVaultRegistryUpdate()
    })

    test("Should create new LPVaultFactory entity for both - old and new factories", () => {
        assert.entityCount(LP_VAULT_FACTORY_ENTITY, 1)
    })

    test("Should should save new address and add the old one to the entity", () => {
        assert.fieldEquals(
            LP_VAULT_FACTORY_ENTITY,
            LP_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "address",
            LP_VAULT_FACTORY_ADDRESS_MOCK.toHexString()
        )

        assert.fieldEquals(
            LP_VAULT_FACTORY_ENTITY,
            LP_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "oldRegistry",
            OLD_LP_VAULT_REGISTRY_ADDRESS_MOCK.toHexString()
        )
    })
})

describe("handleLPVaultDeployed()", () => {
    beforeAll(() => {
        mockFeedRegistryInterfaceFunctions()
        mockERC20Functions()

        mockCurvePoolFactoryFunctions()
        mockCurvePoolFunctions()

        mockFutureVaultFunctions()
        mockFutureVaultFactoryFunctions()

        mockLPVaultFunctions()

        emitPrincipalTokenFactoryUpdated()
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emitFutureVaultDeployed(PRINCIPAL_TOKEN_ADDRESS_MOCK)

        emitLPVaultDeployed()
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
            "lpVaultFactory",
            LP_VAULT_FACTORY_ADDRESS_MOCK.toHexString()
        )
    })

    test("Should create new Asset entities if necessary and assign this entity as LPVault underlying and ibt fields", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            LP_VAULT_ASSET_ADDRESS_MOCK.toHex(),
            "address",
            LP_VAULT_ASSET_ADDRESS_MOCK.toHexString()
        )

        assert.fieldEquals(
            ASSET_ENTITY,
            LP_VAULT_ASSET_ADDRESS_MOCK.toHex(),
            "type",
            AssetType.UNDERLYING
        )

        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "underlying",
            LP_VAULT_ASSET_ADDRESS_MOCK.toHexString()
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
        assert.fieldEquals(
            ACCOUNT_ENTITY,
            FIRST_USER_MOCK.toHex(),
            "portfolio",
            `[${generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                LP_VAULT_ASSET_ADDRESS_MOCK.toHex()
            )}, ${generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            )}]`
        )
    })

    test("Should add relation between LPVault and transaction sender by AccountAsset entity", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "positions",
            `[${generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                LP_VAULT_ADDRESS_MOCK.toHex()
            )}]`
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

describe("handleFeeUpdated()", () => {
    beforeAll(() => {
        let feeUpdatedEvent = changetype<FeeUpdated>(newMockEvent())
        feeUpdatedEvent.address = LP_VAULT_ADDRESS_MOCK

        let feesParam = new ethereum.EventParam(
            "fees",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(15))
        )

        feeUpdatedEvent.parameters = [feesParam]
        handleFeeUpdated(feeUpdatedEvent)
    })

    test("Should change LPVault fees", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "fee",
            BigInt.fromI32(15).toString()
        )
    })
})

describe("handlePoolIndexUpdated()", () => {
    beforeAll(() => {
        mockCurvePoolFactoryFunctions()
        mockCurvePoolFunctions()

        emiCurveFactoryChanged()
        emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)

        let poolIndexUpdatedEvent = changetype<PoolIndexUpdated>(newMockEvent())
        poolIndexUpdatedEvent.address = LP_VAULT_ADDRESS_MOCK

        let newIndexParam = new ethereum.EventParam(
            "_newIndex",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(2))
        )

        poolIndexUpdatedEvent.parameters = [newIndexParam]
        handlePoolIndexUpdated(poolIndexUpdatedEvent)
    })

    test("Should assign new pool index", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "poolIndex",
            BigInt.fromI32(2).toString()
        )
    })

    test("Should assign relation between LPVault and Pool", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "pool",
            FIRST_POOL_ADDRESS_MOCK.toHex()
        )
    })
})
