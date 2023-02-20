import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { assert, clearStore, describe, newMockEvent, test } from "matchstick-as"
import { beforeAll } from "matchstick-as"

import {
    Deposit,
    FeeUpdated,
    Paused,
    Unpaused,
    Withdraw,
} from "../../generated/LPVault/LPVault"
import {
    handleDeposit,
    handleWithdraw,
    handlePaused,
    handleUnpaused,
    handleFeeUpdated,
} from "../mappings/lpVaults"
import { generateAccountAssetId, generateAssetAmountId } from "../utils"
import AssetType from "../utils/AssetType"
import { emitFutureVaultDeployed } from "./events/FutureVault"
import { emitLPVaultDeployed } from "./events/LPVault"
import { emitLPVaultFactoryUpdate } from "./events/LPVaultFactory"
import { POOL_ADD_LIQUIDITY_TRANSACTION_HASH } from "./mocks/CurvePool"
import { POOL_PT_ADDRESS_MOCK } from "./mocks/CurvePoolFactory"
import {
    mockERC20Functions,
    POOL_IBT_BALANCE_MOCK,
    POOL_PT_BALANCE_MOCK,
    YT_BALANCE_MOCK,
} from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import { FIRST_USER_MOCK, mockFutureVaultFunctions } from "./mocks/FutureVault"
import {
    LP_VAULT_ASSET_ADDRESS_MOCK,
    LP_VAULT_ADDRESS_MOCK,
    mockLPVaultFunctions,
    PRINCIPAL_TOKEN_ADDRESS_MOCK,
    IMPLEMENTATION_ADDRESS_MOCK,
    DEPOSIT_TRANSACTION_HASH,
    WITHDRAW_TRANSACTION_HASH,
} from "./mocks/LPVault"
import {
    NEW_LP_VAULT_FACTORY_ADDRESS_MOCK,
    OLD_LP_VAULT_FACTORY_ADDRESS_MOCK,
} from "./mocks/LPVaultFactory"
import {
    ACCOUNT_ASSET_ENTITY,
    ACCOUNT_ENTITY,
    ASSET_AMOUNT_ENTITY,
    ASSET_ENTITY,
    LP_VAULT_ENTITY,
    LP_VAULT_FACTORY_ENTITY,
    TRANSACTION_ENTITY,
} from "./utils/entities"

describe("handleRegistryUpdated()", () => {
    beforeAll(() => {
        clearStore()

        emitLPVaultFactoryUpdate()
    })

    test("Should create new LPVaultFactory entity for both - old and new factories", () => {
        assert.entityCount(LP_VAULT_FACTORY_ENTITY, 2)
    })

    test("Should should save new address and add the old one to the entity", () => {
        assert.fieldEquals(
            LP_VAULT_FACTORY_ENTITY,
            NEW_LP_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "address",
            NEW_LP_VAULT_FACTORY_ADDRESS_MOCK.toHexString()
        )

        assert.fieldEquals(
            LP_VAULT_FACTORY_ENTITY,
            NEW_LP_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "oldFactory",
            OLD_LP_VAULT_FACTORY_ADDRESS_MOCK.toHexString()
        )
    })
})

describe("handleLPVaultDeployed()", () => {
    beforeAll(() => {
        mockFeedRegistryInterfaceFunctions()
        mockERC20Functions()
        mockFutureVaultFunctions()
        mockLPVaultFunctions()

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
            NEW_LP_VAULT_FACTORY_ADDRESS_MOCK.toHexString()
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
        let depositEvent = changetype<Deposit>(newMockEvent())
        depositEvent.address = LP_VAULT_ADDRESS_MOCK
        depositEvent.transaction.hash = DEPOSIT_TRANSACTION_HASH

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

    test("Should update `totalAmount`", () => {
        assert.fieldEquals(
            LP_VAULT_ENTITY,
            LP_VAULT_ADDRESS_MOCK.toHex(),
            "totalAssets",
            BigInt.fromI32(111).toString()
        )
    })

    test("Should create a new Transaction entity with properly assigned LPVault as well as account entity", () => {
        assert.entityCount(TRANSACTION_ENTITY, 1)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "lpVaultInTransaction",
            LP_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
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
    test("Should create three new AssetAmount entities with properly assigned transaction relations and correct transaction values", () => {
        assert.entityCount(ASSET_AMOUNT_ENTITY, 2)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
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
            DEPOSIT_TRANSACTION_HASH.toHex(),
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
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "gas",
            "1"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "gasPrice",
            "1"
        )
    })
})

describe("handleWithdraw()", () => {
    beforeAll(() => {
        let withdrawEvent = changetype<Withdraw>(newMockEvent())
        withdrawEvent.address = LP_VAULT_ADDRESS_MOCK
        withdrawEvent.transaction.hash = WITHDRAW_TRANSACTION_HASH

        let senderParam = new ethereum.EventParam(
            "sender",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let receiverParam = new ethereum.EventParam(
            "receiver",
            ethereum.Value.fromAddress(LP_VAULT_ADDRESS_MOCK)
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
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "lpVaultInTransaction",
            LP_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )
    })

    test("Should create three new AssetAmount entities with properly assigned transaction relations and correct transaction values", () => {
        assert.entityCount(ASSET_AMOUNT_ENTITY, 4)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            WITHDRAW_TRANSACTION_HASH.toHex(),
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
            WITHDRAW_TRANSACTION_HASH.toHex(),
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
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "gas",
            "1"
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "gasPrice",
            "1"
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
