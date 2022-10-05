import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts"
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
} from "../../generated/FutureVault/FutureVault"
import { FutureVaultDeployed } from "../../generated/FutureVaultFactory/FutureVaultFactory"
import {
    handleDeposit,
    handleFeeClaimed,
    handleFutureVaultDeployed,
    handlePaused,
    handleUnpaused,
} from "../mappings/futures"
import { generateFeeClaimId } from "../utils/idGenerators"
import { ETH_ADDRESS_MOCK, mockERC20Functions } from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FEE_COLLECTOR_ADDRESS_MOCK,
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
} from "./mocks/FutureVault"
import {
    ASSET_ENTITY,
    FEE_CLAIM_ENTITY,
    FUTURE_ENTITY,
    TRANSACTION_ENTITY,
    USER_ENTITY,
} from "./utils/entities"

describe("handleFutureVaultDeployed()", () => {
    beforeAll(() => {
        clearStore()
        mockFutureVaultFunctions()
        mockERC20Functions()
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
            "totalFees",
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
            ethereum.Value.fromI32(50)
        )

        feeClaimedEvent.parameters = [feeCollectorParam, feesParam]

        handleFeeClaimed(feeClaimedEvent)

        let feeClaimId = generateFeeClaimId(
            FEE_COLLECTOR_ADDRESS_MOCK.toHex(),
            feeClaimedEvent.block.timestamp.toString()
        )

        assert.fieldEquals(FEE_CLAIM_ENTITY, feeClaimId, "amount", "50")

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
})

describe("handleDeposit()", () => {
    test("Should create a new Transaction entity with properly assign future as well as fee collector entity", () => {
        let depositEvent = changetype<Deposit>(newMockEvent())
        depositEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK

        let callerParam = new ethereum.EventParam(
            "caller",
            ethereum.Value.fromAddress(FEE_COLLECTOR_ADDRESS_MOCK)
        )

        let ownerParam = new ethereum.EventParam(
            "owner",
            ethereum.Value.fromAddress(FEE_COLLECTOR_ADDRESS_MOCK)
        )

        let assetsParam = new ethereum.EventParam(
            "assets",
            ethereum.Value.fromI32(15)
        )

        let sharesParam = new ethereum.EventParam(
            "shares",
            ethereum.Value.fromI32(51)
        )

        depositEvent.parameters = [
            callerParam,
            ownerParam,
            assetsParam,
            sharesParam,
        ]

        handleDeposit(depositEvent)

        logStore()

        assert.entityCount(TRANSACTION_ENTITY, 1)

        // let feeClaimId = generateFeeClaimId(
        //   FEE_COLLECTOR_ADDRESS_MOCK.toHex(),
        //   feeClaimedEvent.block.timestamp.toString()
        // )
        //
        // assert.fieldEquals(FEE_CLAIM_ENTITY, feeClaimId, "amount", "50")
        //
        // assert.fieldEquals(
        //   USER_ENTITY,
        //   FEE_COLLECTOR_ADDRESS_MOCK.toHex(),
        //   "collectedFees",
        //   `[${feeClaimId}]`
        // )
        //
        // assert.fieldEquals(
        //   FUTURE_ENTITY,
        //   FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex(),
        //   "feeClaims",
        //   `[${feeClaimId}]`
        // )
    })
})
