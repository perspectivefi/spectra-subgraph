import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeEach,
    describe,
    newMockEvent,
    test,
    beforeAll,
    logStore,
    clearStore,
} from "matchstick-as/assembly/index"

import {
    Deposit,
    FeeClaimed,
    Paused,
    Unpaused,
    Withdraw,
    YieldTransferred,
} from "../../generated/FutureVault/FutureVault"
import { FutureVaultDeployed } from "../../generated/FutureVaultFactory/FutureVaultFactory"
import { ZERO_BI } from "../constants"
import {
    handleDeposit,
    handleFeeClaimed,
    handleFutureVaultDeployed,
    handlePaused,
    handleUnpaused,
    handleWithdraw,
    handleYieldTransferred,
} from "../mappings/futures"
import {
    generateAssetAmountId,
    generateFeeClaimId,
    generateUserAssetId,
} from "../utils/idGenerators"
import { ETH_ADDRESS_MOCK, mockERC20Functions } from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FEE_COLLECTOR_ADDRESS_MOCK,
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
    DEPOSIT_TRANSACTION_HASH,
    YT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    WITHDRAW_TRANSACTION_HASH,
    FEE_MOCK,
} from "./mocks/FutureVault"
import {
    ASSET_ENTITY,
    FEE_CLAIM_ENTITY,
    FUTURE_ENTITY,
    TRANSACTION_ENTITY,
    USER_ENTITY,
    ASSET_AMOUNT_ENTITY,
    USER_ASSET_ENTITY,
} from "./utils/entities"

const IBT_DEPOSIT = 15
const SHARES_RETURN = 51
const COLLECTED_FEE = 50

describe("handleFutureVaultDeployed()", () => {
    beforeAll(() => {
        clearStore()
        mockERC20Functions()
        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
    })

    beforeEach(() => {
        let futureVaultDeployedEvent = changetype<FutureVaultDeployed>(
            newMockEvent()
        )

        let futureVaultParam = new ethereum.EventParam(
            "_futureVault",
            ethereum.Value.fromAddress(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        )
        futureVaultDeployedEvent.parameters = [futureVaultParam]
        handleFutureVaultDeployed(futureVaultDeployedEvent)

        futureVaultParam = new ethereum.EventParam(
            "_futureVault",
            ethereum.Value.fromAddress(SECOND_FUTURE_VAULT_ADDRESS_MOCK)
        )
        futureVaultDeployedEvent.parameters = [futureVaultParam]
        handleFutureVaultDeployed(futureVaultDeployedEvent)
    })

    test("Should create new Future on every deployment", () => {
        assert.entityCount(FUTURE_ENTITY, 2)
    })

    test("Should fetch and assign expiration date for the new FutureVault entity", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "expirationAtTimestamp",
            "1"
        )
    })

    test("Should fetch and assign fee details for the new FutureVault entity", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "totalCollectedFees",
            "0"
        )
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "daoFeeRate",
            "11"
        )
    })

    test("Should fetch and assign meta info for the new FutureVault entity", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "symbol",
            "FUTURE"
        )
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "name",
            "Test name"
        )
    })

    test("Should create Asset entities for FutureVault underlying and ibt", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            IBT_ADDRESS_MOCK.toHex(),
            "type",
            "IBT"
        )
        assert.fieldEquals(
            ASSET_ENTITY,
            IBT_ADDRESS_MOCK.toHex(),
            "underlying",
            ETH_ADDRESS_MOCK
        )
        assert.fieldEquals(ASSET_ENTITY, ETH_ADDRESS_MOCK, "type", "UNDERLYING")
    })
})

describe("handlePaused()", () => {
    test("Should change future status to `PAUSED`", () => {
        let pausedEvent = changetype<Paused>(newMockEvent())
        pausedEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK

        handlePaused(pausedEvent)

        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "state",
            "PAUSED"
        )
    })
})

describe("handleUnpaused()", () => {
    test("Should change future status to `ACTIVE`", () => {
        let unpausedEvent = changetype<Unpaused>(newMockEvent())
        unpausedEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK

        handleUnpaused(unpausedEvent)

        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "state",
            "ACTIVE"
        )
    })
})

describe("handleYieldTransferred()", () => {
    test("Should add unclaimed fees to the right future entity", () => {
        let yieldTransferredEvent = changetype<YieldTransferred>(newMockEvent())
        yieldTransferredEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK

        let receiverParam = new ethereum.EventParam(
            "receiver",
            ethereum.Value.fromAddress(FEE_COLLECTOR_ADDRESS_MOCK)
        )

        let yieldParam = new ethereum.EventParam(
            "yield",
            ethereum.Value.fromI32(COLLECTED_FEE)
        )

        yieldTransferredEvent.parameters = [receiverParam, yieldParam]

        handleYieldTransferred(yieldTransferredEvent)

        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "unclaimedFees",
            FEE_MOCK.toString()
        )
    })
})

describe("handleFeeClaimed()", () => {
    test("Should create a new FeeClam entity with properly assign future as well as fee collector entity", () => {
        let feeClaimedEvent = changetype<FeeClaimed>(newMockEvent())
        feeClaimedEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK

        let feeCollectorParam = new ethereum.EventParam(
            "_feeCollector",
            ethereum.Value.fromAddress(FEE_COLLECTOR_ADDRESS_MOCK)
        )

        let feesParam = new ethereum.EventParam(
            "_fees",
            ethereum.Value.fromI32(COLLECTED_FEE)
        )

        feeClaimedEvent.parameters = [feeCollectorParam, feesParam]

        handleFeeClaimed(feeClaimedEvent)

        let feeClaimId = generateFeeClaimId(
            FEE_COLLECTOR_ADDRESS_MOCK.toHex(),
            feeClaimedEvent.block.timestamp.toString()
        )

        assert.fieldEquals(
            FEE_CLAIM_ENTITY,
            feeClaimId,
            "amount",
            COLLECTED_FEE.toString()
        )

        assert.fieldEquals(
            USER_ENTITY,
            FEE_COLLECTOR_ADDRESS_MOCK.toHex(),
            "collectedFees",
            `[${feeClaimId}]`
        )

        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "feeClaims",
            `[${feeClaimId}]`
        )
    })
    test("Should reflect collected fees in the future stats", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "totalCollectedFees",
            COLLECTED_FEE.toString()
        )
    })
    test("Should reset unclaimed fees", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "unclaimedFees",
            ZERO_BI.toString()
        )
    })
})

describe("handleDeposit()", () => {
    beforeAll(() => {
        let depositEvent = changetype<Deposit>(newMockEvent())
        depositEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
        depositEvent.transaction.hash = DEPOSIT_TRANSACTION_HASH

        let callerParam = new ethereum.EventParam(
            "caller",
            ethereum.Value.fromAddress(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        )

        let ownerParam = new ethereum.EventParam(
            "owner",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let assetsParam = new ethereum.EventParam(
            "assets",
            ethereum.Value.fromI32(IBT_DEPOSIT)
        )

        let sharesParam = new ethereum.EventParam(
            "shares",
            ethereum.Value.fromI32(SHARES_RETURN)
        )

        depositEvent.parameters = [
            callerParam,
            ownerParam,
            assetsParam,
            sharesParam,
        ]

        handleDeposit(depositEvent)
    })

    test("Should create a new Transaction entity with properly assigned future as well as user entity", () => {
        assert.entityCount(TRANSACTION_ENTITY, 1)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "futureInTransaction",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )
    })
    test("Should create Asset entities for all the tokens in the transaction", () => {
        // IBT
        assert.fieldEquals(
            ASSET_ENTITY,
            IBT_ADDRESS_MOCK.toHex(),
            "address",
            IBT_ADDRESS_MOCK.toHex()
        )

        // PT
        assert.fieldEquals(
            ASSET_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "address",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        // YT
        assert.fieldEquals(
            ASSET_ENTITY,
            YT_ADDRESS_MOCK.toHex(),
            "address",
            YT_ADDRESS_MOCK.toHex()
        )
    })
    test("Should create three new AssetAmounts entities with properly assigned transaction relations", () => {
        assert.entityCount(ASSET_AMOUNT_ENTITY, 3)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "amountsIn",
            `[${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                IBT_ADDRESS_MOCK.toHex()
            )}]`
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            DEPOSIT_TRANSACTION_HASH.toHex(),
            "amountsOut",
            `[${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
            )}, ${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                YT_ADDRESS_MOCK.toHex()
            )}]`
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
    test("Should create three UserAsset entities and reflect its balances changes", () => {
        assert.entityCount(USER_ASSET_ENTITY, 3)

        assert.fieldEquals(
            USER_ASSET_ENTITY,
            generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                IBT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            ZERO_BI.minus(BigInt.fromI32(IBT_DEPOSIT)).toString()
        )

        assert.fieldEquals(
            USER_ASSET_ENTITY,
            generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            BigInt.fromI32(SHARES_RETURN).toString()
        )

        assert.fieldEquals(
            USER_ASSET_ENTITY,
            generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                YT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            BigInt.fromI32(SHARES_RETURN).toString()
        )
    })
    test("Should assign three UserAsset entities to User entity used in the transaction", () => {
        assert.fieldEquals(
            USER_ENTITY,
            FIRST_USER_MOCK.toHex(),
            "portfolio",
            `[${generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                IBT_ADDRESS_MOCK.toHex()
            )}, ${generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
            )}, ${generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                YT_ADDRESS_MOCK.toHex()
            )}]`
        )
    })
})

describe("handleWithdraw()", () => {
    beforeAll(() => {
        let withdrawEvent = changetype<Withdraw>(newMockEvent())
        withdrawEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
        withdrawEvent.transaction.hash = WITHDRAW_TRANSACTION_HASH

        let callerParam = new ethereum.EventParam(
            "caller",
            ethereum.Value.fromAddress(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
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
            ethereum.Value.fromI32(IBT_DEPOSIT)
        )

        let sharesParam = new ethereum.EventParam(
            "shares",
            ethereum.Value.fromI32(SHARES_RETURN)
        )

        withdrawEvent.parameters = [
            callerParam,
            receiverParam,
            ownerParam,
            assetsParam,
            sharesParam,
        ]

        handleWithdraw(withdrawEvent)
    })

    test("Should create a new Transaction entity with properly assigned future as well as user entity", () => {
        assert.entityCount(TRANSACTION_ENTITY, 2)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "futureInTransaction",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )
    })
    test("Should create three new AssetAmount entities with properly assigned user and transaction relations", () => {
        // 3 created by `Deposit` event + 3 created by Withdraw event
        assert.entityCount(ASSET_AMOUNT_ENTITY, 6)
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "amountsIn",
            `[${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
            )}, ${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                YT_ADDRESS_MOCK.toHex()
            )}]`
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            WITHDRAW_TRANSACTION_HASH.toHex(),
            "amountsOut",
            `[${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                IBT_ADDRESS_MOCK.toHex()
            )}]`
        )
    })
    test("Should update UserAsset entities and reflect its changes in balances", () => {
        assert.fieldEquals(
            USER_ASSET_ENTITY,
            generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                IBT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            ZERO_BI.toString()
        )

        assert.fieldEquals(
            USER_ASSET_ENTITY,
            generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            ZERO_BI.toString()
        )

        assert.fieldEquals(
            USER_ASSET_ENTITY,
            generateUserAssetId(
                FIRST_USER_MOCK.toHex(),
                YT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            ZERO_BI.toString()
        )
    })
})
