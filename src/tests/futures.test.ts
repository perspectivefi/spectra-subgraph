import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeAll,
    clearStore,
    describe,
    newMockEvent,
    test,
} from "matchstick-as/assembly"

import { Account, Factory } from "../../generated/schema"
import {
    FeeClaimed,
    Paused,
    Redeem,
    Unpaused,
    YieldUpdated,
    YieldClaimed,
} from "../../generated/templates/PrincipalToken/PrincipalToken"
import { DAY_ID_0, ZERO_BI } from "../constants"
import {
    handleFeeClaimed,
    handlePaused,
    handleRedeem,
    handleUnpaused,
    handleYieldUpdated,
    handleYieldClaimed,
} from "../mappings/futures"
import {
    generateAssetAmountId,
    generateFeeClaimId,
    generateAccountAssetId,
    generateFutureDailyStatsId,
    AssetType,
} from "../utils"
import { generateTransactionId } from "../utils/idGenerators"
import { emitFactoryUpdated } from "./events/Factory"
import {
    emiCurveFactoryChange,
    emitCurvePoolDeployed,
    emitMint,
    emitFutureVaultDeployed,
    SHARES_RETURN,
    DEFAULT_EMIT_LOG_INDEX,
} from "./events/FutureVault"
import {
    mockCurvePoolFunctions,
    POOL_LP_ADDRESS_MOCK,
    FIRST_POOL_ADDRESS_MOCK,
    POOL_FEE_MOCK,
} from "./mocks/CurvePool"
import {
    ETH_ADDRESS_MOCK,
    mockERC20Balances,
    mockERC20Functions,
    POOL_IBT_BALANCE_MOCK,
    POOL_PT_BALANCE_MOCK,
    YT_BALANCE_MOCK,
} from "./mocks/ERC20"
import { createConvertToAssetsCallMock } from "./mocks/ERC4626"
import {
    mockFactoryFunctions,
    FACTORY_ADDRESS_MOCK,
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
    CURVE_FACTORY_ADDRESS_MOCK,
} from "./mocks/Factory"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    DEPOSIT_TRANSACTION_HASH,
    FEE_COLLECTOR_ADDRESS_MOCK,
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
    RECEIVER_YIELD_IN_IBT_MOCK,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
    SENDER_YIELD_IN_IBT_MOCK,
    WITHDRAW_TRANSACTION_HASH,
    YIELD_USER_ADDRESS_MOCK,
    YIELD_USER_YIELD_IN_IBT_MOCK,
    YT_ADDRESS_MOCK,
} from "./mocks/FutureVault"
import {
    ACCOUNT_ASSET_ENTITY,
    ASSET_AMOUNT_ENTITY,
    ASSET_ENTITY,
    FEE_CLAIM_ENTITY,
    FUTURE_DAILY_STATS_ENTITY,
    FUTURE_ENTITY,
    POOL_ENTITY,
    FACTORY_ENTITY,
    TRANSACTION_ENTITY,
    APR_IN_TIME_ENTITY,
} from "./utils/entities"

const COLLECTED_FEE = 50

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

describe("handleFutureVaultDeployed()", () => {
    beforeAll(() => {
        clearStore()
        mockERC20Functions()
        mockERC20Balances()

        mockFactoryFunctions()
        mockCurvePoolFunctions()

        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()

        emitFactoryUpdated()
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emitFutureVaultDeployed(SECOND_FUTURE_VAULT_ADDRESS_MOCK)
    })

    test("Should create new Future on every deployment", () => {
        assert.entityCount(FUTURE_ENTITY, 2)
    })

    test("Should fetch and assign expiration date for the new FutureVault entity", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "expirationAtTimestamp",
            "2"
        )
    })

    test("Should fetch and assign fee details for the new FutureVault entity", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "totalCollectedFees",
            "0"
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
        // Check IBT details are correct
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
        assert.fieldEquals(
            ASSET_ENTITY,
            IBT_ADDRESS_MOCK.toHex(),
            "address",
            IBT_ADDRESS_MOCK.toHex()
        )
        // Check Underlying details are correct
        assert.fieldEquals(ASSET_ENTITY, ETH_ADDRESS_MOCK, "type", "UNDERLYING")
        assert.fieldEquals(
            ASSET_ENTITY,
            ETH_ADDRESS_MOCK,
            "address",
            ETH_ADDRESS_MOCK
        )
    })

    test("Should assign created future to correct future vault factory", () => {
        assert.fieldEquals(
            FUTURE_ENTITY,
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "factory",
            FACTORY_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            FUTURE_ENTITY,
            SECOND_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "factory",
            FACTORY_ADDRESS_MOCK.toHex()
        )

        let factoryEntity = Factory.load(FACTORY_ADDRESS_MOCK.toHex())!

        let deployedFutures = factoryEntity.deployedFutures.load()

        assert.i32Equals(deployedFutures.length, 2)
    })

    test("Should create Asset - Future for PT token", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            POOL_PT_ADDRESS_MOCK.toHex(),
            "futureVault",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )
    })

    test("Should create Asset - Future for YT token", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            YT_ADDRESS_MOCK.toHex(),
            "futureVault",
            SECOND_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )
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

describe("handleYieldUpdated()", () => {
    beforeAll(() => {
        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)

        emitMint(0, FEE_COLLECTOR_ADDRESS_MOCK)

        let yieldUpdatedEvent = changetype<YieldUpdated>(newMockEvent())
        yieldUpdatedEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
        yieldUpdatedEvent.transaction.from = FIRST_USER_MOCK

        let userParam = new ethereum.EventParam(
            "user",
            ethereum.Value.fromAddress(YIELD_USER_ADDRESS_MOCK)
        )

        let yieldParam = new ethereum.EventParam(
            "yield",
            ethereum.Value.fromUnsignedBigInt(YIELD_USER_YIELD_IN_IBT_MOCK)
        )

        yieldUpdatedEvent.parameters = [userParam, yieldParam]

        handleYieldUpdated(yieldUpdatedEvent)
    })

    test("Should update yield for users with YT asset in portfolio", () => {
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FEE_COLLECTOR_ADDRESS_MOCK.toHex(),
                `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-yield`
            ),
            "balance",
            RECEIVER_YIELD_IN_IBT_MOCK.toString()
        )
    })
})

// describe("handleYieldTransferred()", () => {
//     beforeAll(() => {
//         emitDeposit(0, FIRST_USER_MOCK)
//
//         let yieldTransferredEvent = changetype<YieldTransferred>(newMockEvent())
//         yieldTransferredEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
//         yieldTransferredEvent.transaction.from = FIRST_USER_MOCK
//
//         let receiverParam = new ethereum.EventParam(
//             "receiver",
//             ethereum.Value.fromAddress(FEE_COLLECTOR_ADDRESS_MOCK)
//         )
//
//         let yieldParam = new ethereum.EventParam(
//             "yield",
//             ethereum.Value.fromI32(COLLECTED_FEE)
//         )
//
//         yieldTransferredEvent.parameters = [receiverParam, yieldParam]
//
//         handleYieldTransferred(yieldTransferredEvent)
//     })
//
//     test("Should create AccountAsset entities", () => {
//         assert.entityCount(ACCOUNT_ASSET_ENTITY, 8)
//     })
//
//     test("Should reflect sent yield in users portfolio", () => {
//         assert.fieldEquals(
//             ACCOUNT_ASSET_ENTITY,
//             generateAccountAssetId(
//                 FIRST_USER_MOCK.toHex(),
//                 `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-yield`
//             ),
//             "balance",
//             SENDER_YIELD_IN_IBT_MOCK.toString()
//         )
//
//         assert.fieldEquals(
//             ACCOUNT_ASSET_ENTITY,
//             generateAccountAssetId(
//                 FEE_COLLECTOR_ADDRESS_MOCK.toHex(),
//                 `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-yield`
//             ),
//             "balance",
//             RECEIVER_YIELD_IN_IBT_MOCK.toString()
//         )
//     })
// })

describe("handleFeeClaimed()", () => {
    test("Should create a new FeeClaim entity with properly assign future as well as fee collector entity", () => {
        let feeClaimedEvent = changetype<FeeClaimed>(newMockEvent())
        feeClaimedEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK

        let feeCollectorParam = new ethereum.EventParam(
            "user",
            ethereum.Value.fromAddress(FEE_COLLECTOR_ADDRESS_MOCK)
        )

        let feesParam = new ethereum.EventParam(
            "redeemedIbts",
            ethereum.Value.fromI32(COLLECTED_FEE)
        )

        let receivedAssetsParam = new ethereum.EventParam(
            "receivedAssets",
            ethereum.Value.fromI32(COLLECTED_FEE)
        )

        feeClaimedEvent.parameters = [
            feeCollectorParam,
            feesParam,
            receivedAssetsParam,
        ]

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
            FEE_CLAIM_ENTITY,
            feeClaimId,
            "future",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            FEE_CLAIM_ENTITY,
            feeClaimId,
            "feeCollector",
            FEE_COLLECTOR_ADDRESS_MOCK.toHex()
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

describe("handleMint()", () => {
    beforeAll(() => {
        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        emitMint()
    })

    test("Should create a new Transaction entity with properly assigned future as well as account entity", () => {
        assert.entityCount(TRANSACTION_ENTITY, 1)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "futureInTransaction",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )
    })
    test("Should create Asset entities for the output in the transaction", () => {
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
    test("Should create two new AssetAmounts entities with properly assigned transaction relations", () => {
        assert.entityCount(ASSET_AMOUNT_ENTITY, 2)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            depositTransactionId,
            "amountsOut",
            `[${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DEFAULT_EMIT_LOG_INDEX.toString(),
                AssetType.PT
            )}, ${generateAssetAmountId(
                DEPOSIT_TRANSACTION_HASH.toHex(),
                YT_ADDRESS_MOCK.toHex(),
                DEFAULT_EMIT_LOG_INDEX.toString(),
                AssetType.YT
            )}]`
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
    test("Should create output AccountAsset entities", () => {
        assert.entityCount(ACCOUNT_ASSET_ENTITY, 6)

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            POOL_PT_BALANCE_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                YT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            YT_BALANCE_MOCK.toString()
        )
    })
    test("Should assign three AccountAsset entities to Account entity used in the transaction", () => {
        const accountEntity = Account.load(FIRST_USER_MOCK.toHex())!
        let portfolio = accountEntity.portfolio.load()

        assert.i32Equals(portfolio.length, 3)
    })
    test("Should create FutureDailyStats with the correct details", () => {
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
            "dailyDeposits",
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
})

describe("handleRedeem()", () => {
    beforeAll(() => {
        let redeemEvent = changetype<Redeem>(newMockEvent())
        redeemEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
        redeemEvent.transaction.hash = WITHDRAW_TRANSACTION_HASH
        redeemEvent.logIndex = WITHDRAW_LOG_INDEX

        let senderParam = new ethereum.EventParam(
            "from",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let receiverParam = new ethereum.EventParam(
            "to",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let sharesParam = new ethereum.EventParam(
            "amount",
            ethereum.Value.fromI32(SHARES_RETURN)
        )

        redeemEvent.parameters = [senderParam, receiverParam, sharesParam]
        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        handleRedeem(redeemEvent)
    })

    test("Should create a new Transaction entity with properly assigned future as well as Account entity", () => {
        assert.entityCount(TRANSACTION_ENTITY, 2)

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "futureInTransaction",
            FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "userInTransaction",
            FIRST_USER_MOCK.toHex()
        )
    })
    test("Should create two new AssetAmount entities with properly assigned user and transaction relations", () => {
        // 2 created by `Deposit` event + 2 created by Withdraw event
        assert.entityCount(ASSET_AMOUNT_ENTITY, 4)
        assert.fieldEquals(
            TRANSACTION_ENTITY,
            withdrawTransactionId,
            "amountsIn",
            `[${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                WITHDRAW_LOG_INDEX.toString(),
                AssetType.PT
            )}, ${generateAssetAmountId(
                WITHDRAW_TRANSACTION_HASH.toHex(),
                YT_ADDRESS_MOCK.toHex(),
                WITHDRAW_LOG_INDEX.toString(),
                AssetType.YT
            )}]`
        )
    })
    test("Should update createAccountAsset entities", () => {
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            POOL_PT_BALANCE_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                YT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            YT_BALANCE_MOCK.toString()
        )
    })

    test("Should create FutureDailyStats with the correct details", () => {
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
            "dailyDeposits",
            "2"
        )

        assert.fieldEquals(
            FUTURE_DAILY_STATS_ENTITY,
            generateFutureDailyStatsId(
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
                DAY_ID_0
            ),
            "dailyWithdrawals",
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

describe("handleCurveFactoryChange()", () => {
    beforeAll(() => {
        mockFactoryFunctions()
        mockCurvePoolFunctions()
        emiCurveFactoryChange()
    })

    test("Should create new factory entity", () => {
        assert.entityCount(FACTORY_ENTITY, 2)
    })

    test("Should set new curve factory address for the future vault factory", () => {
        assert.fieldEquals(
            FACTORY_ENTITY,
            FACTORY_ADDRESS_MOCK.toHex(),
            "curveFactory",
            CURVE_FACTORY_ADDRESS_MOCK.toHex()
        )
    })
})

describe("handleCurvePoolDeployed()", () => {
    beforeAll(() => {
        emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)
    })

    test("Should create new pool entity", () => {
        assert.entityCount(POOL_ENTITY, 1)
    })

    test("Should set factory and fee rates for created pool", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "factory",
            CURVE_FACTORY_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "feeRate",
            POOL_FEE_MOCK.toString()
        )

        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "adminFeeRate",
            "5000000000"
        )
    })

    test("Should create new Asset entity for liquidity token and assign that token to the pool", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            POOL_LP_ADDRESS_MOCK.toHex(),
            "address",
            POOL_LP_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "liquidityToken",
            POOL_LP_ADDRESS_MOCK.toHex()
        )
    })

    test("Should create Asset entity for ibt token used in the pool", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            POOL_IBT_ADDRESS_MOCK.toHex(),
            "address",
            POOL_IBT_ADDRESS_MOCK.toHex()
        )
    })

    test("Should create Asset entity for pt token used in the pool", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            POOL_PT_ADDRESS_MOCK.toHex(),
            "address",
            POOL_PT_ADDRESS_MOCK.toHex()
        )
    })

    test("Should create Asset entity for yt token used in the pool", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            YT_ADDRESS_MOCK.toHex(),
            "address",
            YT_ADDRESS_MOCK.toHex()
        )
    })

    test("Should assign created pool to correct future vault factory", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "factory",
            CURVE_FACTORY_ADDRESS_MOCK.toHex()
        )
    })

    test("Should create Asset - Future for LP token", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            POOL_LP_ADDRESS_MOCK.toHex(),
            "futureVault",
            // the same as FutureVault address
            POOL_PT_ADDRESS_MOCK.toHex()
        )
    })

    test("Should assign chainId to the new Asset entities", () => {
        assert.fieldEquals(
            ASSET_ENTITY,
            POOL_LP_ADDRESS_MOCK.toHex(),
            "chainId",
            "1"
        )

        assert.fieldEquals(
            ASSET_ENTITY,
            POOL_IBT_ADDRESS_MOCK.toHex(),
            "chainId",
            "1"
        )

        assert.fieldEquals(
            ASSET_ENTITY,
            POOL_PT_ADDRESS_MOCK.toHex(),
            "chainId",
            "1"
        )

        assert.fieldEquals(
            ASSET_ENTITY,
            YT_ADDRESS_MOCK.toHex(),
            "chainId",
            "1"
        )
    })

    test("Should create new APR entity assigned to the right pool", () => {
        test("Should create new pool entity", () => {
            assert.entityCount(POOL_ENTITY, 1)
        })

        assert.fieldEquals(
            APR_IN_TIME_ENTITY,
            `${FIRST_POOL_ADDRESS_MOCK.toHex()}-1`,
            "pool",
            FIRST_POOL_ADDRESS_MOCK.toHex()
        )
    })
})

describe("handleYieldClaimed()", () => {
    beforeAll(() => {
        let yieldClaimedEvent = changetype<YieldClaimed>(newMockEvent())
        yieldClaimedEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK

        let ownerParam = new ethereum.EventParam(
            "owner",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let receiverParam = new ethereum.EventParam(
            "receiver",
            ethereum.Value.fromAddress(FIRST_USER_MOCK)
        )

        let yieldInIBTParam = new ethereum.EventParam(
            "yieldInIBT",
            ethereum.Value.fromUnsignedBigInt(YIELD_USER_YIELD_IN_IBT_MOCK)
        )

        yieldClaimedEvent.parameters = [
            ownerParam,
            receiverParam,
            yieldInIBTParam,
        ]

        handleYieldClaimed(yieldClaimedEvent)
    })

    test("Should update claim yield in user portfolio", () => {
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-claimed-yield`,
                "claimed-"
            ),
            "balance",
            YIELD_USER_YIELD_IN_IBT_MOCK.toString()
        )
    })
})
