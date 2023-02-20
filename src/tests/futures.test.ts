import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeAll,
    clearStore,
    describe,
    newMockEvent,
    test,
} from "matchstick-as/assembly/index"

import {
    FeeClaimed,
    Paused,
    Unpaused,
    Withdraw,
    YieldTransferred,
} from "../../generated/PrincipalToken/PrincipalToken"
import { DAY_ID_0, ZERO_BI } from "../constants"
import {
    handleFeeClaimed,
    handlePaused,
    handleUnpaused,
    handleWithdraw,
    handleYieldTransferred,
} from "../mappings/futures"
import {
    generateAssetAmountId,
    generateFeeClaimId,
    generateAccountAssetId,
    generateFutureDailyStatsId,
} from "../utils"
import {
    emiCurveFactoryChanged,
    emitCurvePoolDeployed,
    emitDeposit,
    emitFutureVaultDeployed,
    IBT_DEPOSIT,
    SHARES_RETURN,
} from "./events/FutureVault"
import { emitPrincipalTokenFactoryUpdated } from "./events/FutureVaultFactory"
import { mockCurvePoolFunctions, POOL_LP_ADDRESS_MOCK } from "./mocks/CurvePool"
import {
    FIRST_POOL_ADDRESS_MOCK,
    mockMetaPoolFactoryFunctions,
    POOL_ADMIN_FEE_MOCK,
    POOL_FACTORY_ADDRESS_MOCK,
    POOL_FEE_MOCK,
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "./mocks/CurvePoolFactory"
import {
    ETH_ADDRESS_MOCK,
    mockERC20Balances,
    mockERC20Functions,
    POOL_IBT_BALANCE_MOCK,
    POOL_PT_BALANCE_MOCK,
    YT_BALANCE_MOCK,
} from "./mocks/ERC20"
import { createConvertToAssetsCallMock } from "./mocks/ERC4626"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    DEPOSIT_TRANSACTION_HASH,
    FEE_COLLECTOR_ADDRESS_MOCK,
    FEE_MOCK,
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
    WITHDRAW_TRANSACTION_HASH,
    YT_ADDRESS_MOCK,
} from "./mocks/FutureVault"
import {
    FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK,
    mockFutureVaultFactoryFunctions,
} from "./mocks/FutureVaultFactory"
import {
    ACCOUNT_ENTITY,
    ACCOUNT_ASSET_ENTITY,
    ASSET_AMOUNT_ENTITY,
    ASSET_ENTITY,
    FEE_CLAIM_ENTITY,
    FUTURE_DAILY_STATS_ENTITY,
    FUTURE_ENTITY,
    POOL_ENTITY,
    POOL_FACTORY_ENTITY,
    TRANSACTION_ENTITY,
    FUTURE_VAULT_FACTORY_ENTITY,
} from "./utils/entities"

const COLLECTED_FEE = 50

describe("handleFutureVaultDeployed()", () => {
    beforeAll(() => {
        clearStore()
        mockERC20Functions()
        mockERC20Balances()
        mockFutureVaultFactoryFunctions()
        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()

        emitPrincipalTokenFactoryUpdated()
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
            "futureVaultFactory",
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            FUTURE_ENTITY,
            SECOND_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
            "futureVaultFactory",
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHex()
        )

        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "deployedFutures",
            `[${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}, ${SECOND_FUTURE_VAULT_ADDRESS_MOCK.toHex()}]`
        )
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
            ACCOUNT_ENTITY,
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
        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        emitDeposit()
    })

    test("Should create a new Transaction entity with properly assigned future as well as account entity", () => {
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
    test("Should create three AccountAsset entities and fetch IBT token balance", () => {
        assert.entityCount(ACCOUNT_ASSET_ENTITY, 3)

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                IBT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            POOL_IBT_BALANCE_MOCK.toString()
        )

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
        assert.fieldEquals(
            ACCOUNT_ENTITY,
            FIRST_USER_MOCK.toHex(),
            "portfolio",
            `[${generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                IBT_ADDRESS_MOCK.toHex()
            )}, ${generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()
            )}, ${generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                YT_ADDRESS_MOCK.toHex()
            )}]`
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

describe("handleWithdraw()", () => {
    beforeAll(() => {
        let withdrawEvent = changetype<Withdraw>(newMockEvent())
        withdrawEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
        withdrawEvent.transaction.hash = WITHDRAW_TRANSACTION_HASH

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
            ethereum.Value.fromI32(IBT_DEPOSIT)
        )

        let sharesParam = new ethereum.EventParam(
            "shares",
            ethereum.Value.fromI32(SHARES_RETURN)
        )

        withdrawEvent.parameters = [
            senderParam,
            receiverParam,
            ownerParam,
            assetsParam,
            sharesParam,
        ]
        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        handleWithdraw(withdrawEvent)
    })

    test("Should create a new Transaction entity with properly assigned future as well as Account entity", () => {
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
    test("Should update createAccountAsset entities and fetch IBT token balance", () => {
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                FIRST_USER_MOCK.toHex(),
                IBT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            POOL_IBT_BALANCE_MOCK.toString()
        )

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
            "1"
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

describe("handleCurveFactoryChanged()", () => {
    beforeAll(() => {
        mockMetaPoolFactoryFunctions()
        mockCurvePoolFunctions()
        emiCurveFactoryChanged()
    })

    test("Should create new pool factory entity", () => {
        assert.entityCount(POOL_FACTORY_ENTITY, 1)
    })

    test("Should set 'CURVE' as AMM provide", () => {
        assert.fieldEquals(
            POOL_FACTORY_ENTITY,
            POOL_FACTORY_ADDRESS_MOCK.toHex(),
            "ammProvider",
            "CURVE"
        )
    })

    test("Should set correct admin and fee receiver for the factory", () => {
        assert.fieldEquals(
            POOL_FACTORY_ENTITY,
            POOL_FACTORY_ADDRESS_MOCK.toHex(),
            "admin",
            FIRST_USER_MOCK.toHex()
        )

        assert.fieldEquals(
            POOL_FACTORY_ENTITY,
            POOL_FACTORY_ADDRESS_MOCK.toHex(),
            "feeReceiver",
            FIRST_USER_MOCK.toHex()
        )
    })

    test("Should set new curve factory address for the future vault factory", () => {
        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "poolFactory",
            POOL_FACTORY_ADDRESS_MOCK.toHex()
        )
    })
})

describe("handleCurvePoolDeployed()", () => {
    beforeAll(() => {
        emitCurvePoolDeployed()
    })

    test("Should create new pool entity", () => {
        assert.entityCount(POOL_ENTITY, 1)
    })

    test("Should set factory and fee rates for created pool", () => {
        assert.fieldEquals(
            POOL_ENTITY,
            FIRST_POOL_ADDRESS_MOCK.toHex(),
            "factory",
            POOL_FACTORY_ADDRESS_MOCK.toHex()
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
            "futureVaultFactory",
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHex()
        )
        assert.fieldEquals(
            FUTURE_VAULT_FACTORY_ENTITY,
            FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK.toHex(),
            "deployedPools",
            `[${FIRST_POOL_ADDRESS_MOCK.toHex()}]`
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
})
