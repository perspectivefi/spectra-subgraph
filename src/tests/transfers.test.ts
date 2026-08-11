import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import { Address } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeAll,
    clearStore,
    describe,
    newMockEvent,
    test,
} from "matchstick-as/assembly"

import { Account } from "../../generated/schema"
import { Transfer } from "../../generated/templates/ERC20/ERC20"
import { ZERO_BI } from "../constants"
import { handleTransfer } from "../mappings/transfers"
import {
    generateAccountAssetId,
    generateTransferId,
} from "../utils/idGenerators"
import { toPrecision } from "../utils/toPrecision"
import { emitFactoryUpdated } from "./events/Factory"
import {
    emiCurveFactoryChange,
    emitCurvePoolDeployed,
    emitMint,
    emitFutureVaultDeployed,
} from "./events/FutureVault"
import {
    FIRST_POOL_ADDRESS_MOCK,
    mockCurvePoolFunctions,
    POOL_LP_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "./mocks/CurvePool"
import {
    ETH_ADDRESS_MOCK,
    mockERC20BalanceFor,
    mockERC20Balances,
    mockERC20Functions,
    mockERC20FunctionsFor,
    POOL_LP_BALANCE_MOCK,
    POOL_PT_BALANCE_MOCK,
    STANDARD_DECIMALS_MOCK,
} from "./mocks/ERC20"
import {
    createAssetCallMock,
    createConvertToAssetsCallMock,
} from "./mocks/ERC4626"
import { mockFactoryFunctions } from "./mocks/Factory"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
    RECEIVER_YIELD_IN_IBT_MOCK,
    SECOND_USER_MOCK,
    SENDER_YIELD_IN_IBT_MOCK,
} from "./mocks/FutureVault"
import { RECEIVER_USER_MOCK } from "./mocks/Transaction"
import { ACCOUNT_ASSET_ENTITY, TRANSFER_ENTITY } from "./utils/entities"

const LP_TRANSFER_TRANSACTION_HASH = Address.fromString(
    "0x0000000000000000000000000000000005552222"
)

const PT_TRANSFER_TRANSACTION_HASH = Address.fromString(
    "0x0000000000000000000000000000000000000001"
)

const INVALID_TRANSFER_TRANSACTION_HASH = Address.fromString(
    "0x0000000000000000000000000000000005559999"
)

const INVALID_ASSET_ADDRESS = Address.fromString(
    "0x0000000000000000000000000000000000009999"
)

export const SENDER_USER_MOCK = Address.fromString(
    "0x1010000000000000000000000000000000000000"
)

export const LP_TRANSFER_VALUE = toPrecision(
    BigInt.fromI32(5),
    0,
    STANDARD_DECIMALS_MOCK
)
export const PT_TRANSFER_VALUE = toPrecision(
    BigInt.fromI32(17),
    0,
    STANDARD_DECIMALS_MOCK
)

describe("handleTransfer()", () => {
    beforeAll(() => {
        clearStore()

        mockERC20Functions()
        mockERC20Balances()
        mockERC20FunctionsFor(INVALID_ASSET_ADDRESS)
        mockERC20BalanceFor(INVALID_ASSET_ADDRESS, BigInt.fromI32(0))

        mockFactoryFunctions()

        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        createAssetCallMock(
            IBT_ADDRESS_MOCK,
            Address.fromString(ETH_ADDRESS_MOCK)
        )

        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
        mockCurvePoolFunctions()

        emitFactoryUpdated()
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emiCurveFactoryChange()
        emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)
        // Necessary to have YT entity to follow yield
        emitMint(0, SENDER_USER_MOCK)
        emitMint(0, RECEIVER_USER_MOCK)
        emitMint(0, SECOND_USER_MOCK)

        let lpTransferEvent = changetype<Transfer>(newMockEvent())
        lpTransferEvent.address = POOL_LP_ADDRESS_MOCK
        lpTransferEvent.transaction.hash = LP_TRANSFER_TRANSACTION_HASH
        lpTransferEvent.logIndex = ZERO_BI

        let fromParam = new ethereum.EventParam(
            "from",
            ethereum.Value.fromAddress(SENDER_USER_MOCK)
        )

        let toParam = new ethereum.EventParam(
            "to",
            ethereum.Value.fromAddress(RECEIVER_USER_MOCK)
        )

        let lpValueParam = new ethereum.EventParam(
            "value",
            ethereum.Value.fromSignedBigInt(LP_TRANSFER_VALUE)
        )

        lpTransferEvent.parameters = [fromParam, toParam, lpValueParam]

        handleTransfer(lpTransferEvent)

        let ptTransferEvent = changetype<Transfer>(newMockEvent())
        ptTransferEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
        ptTransferEvent.transaction.hash = PT_TRANSFER_TRANSACTION_HASH
        ptTransferEvent.logIndex = ZERO_BI

        let ptValueParam = new ethereum.EventParam(
            "value",
            ethereum.Value.fromSignedBigInt(PT_TRANSFER_VALUE)
        )

        ptTransferEvent.parameters = [fromParam, toParam, ptValueParam]

        handleTransfer(ptTransferEvent)

        let invalidAssetTransferEvent = changetype<Transfer>(newMockEvent())
        // Asset discovered from its first transfer
        invalidAssetTransferEvent.address = INVALID_ASSET_ADDRESS
        invalidAssetTransferEvent.transaction.hash =
            INVALID_TRANSFER_TRANSACTION_HASH
        invalidAssetTransferEvent.logIndex = ZERO_BI

        let invalidAssetValueParam = new ethereum.EventParam(
            "value",
            ethereum.Value.fromSignedBigInt(
                toPrecision(BigInt.fromI32(1), 0, STANDARD_DECIMALS_MOCK)
            )
        )

        invalidAssetTransferEvent.parameters = [
            fromParam,
            toParam,
            invalidAssetValueParam,
        ]

        handleTransfer(invalidAssetTransferEvent)
    })

    test("Should create a Transfer entity for known and newly discovered assets", () => {
        assert.entityCount(TRANSFER_ENTITY, 3)
    })

    test("Should reflect asset transfers in the account portfolio", () => {
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                SENDER_USER_MOCK.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "balance",
            POOL_LP_BALANCE_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                RECEIVER_USER_MOCK.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "balance",
            POOL_LP_BALANCE_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                SENDER_USER_MOCK.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            POOL_PT_BALANCE_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                RECEIVER_USER_MOCK.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            POOL_PT_BALANCE_MOCK.toString()
        )
    })

    test("Should properly set transfer details", () => {
        const lpTransferId = generateTransferId(
            LP_TRANSFER_TRANSACTION_HASH.toHex(),
            "1",
            "0"
        )

        assert.fieldEquals(
            TRANSFER_ENTITY,
            lpTransferId,
            "address",
            LP_TRANSFER_TRANSACTION_HASH.toHex()
        )

        assert.fieldEquals(TRANSFER_ENTITY, lpTransferId, "block", "1")

        assert.fieldEquals(TRANSFER_ENTITY, lpTransferId, "gasLimit", "1")

        assert.fieldEquals(TRANSFER_ENTITY, lpTransferId, "gasPrice", "1")

        const ptTransferId = generateTransferId(
            PT_TRANSFER_TRANSACTION_HASH.toHex(),
            "1",
            "0"
        )

        assert.fieldEquals(
            TRANSFER_ENTITY,
            ptTransferId,
            "address",
            PT_TRANSFER_TRANSACTION_HASH.toHex()
        )
    })

    test("Should update yield for sender and receiver if transferred asset is PrincipalToken", () => {
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                SENDER_USER_MOCK.toHex(),
                `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-yield`
            ),
            "balance",
            SENDER_YIELD_IN_IBT_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                RECEIVER_USER_MOCK.toHex(),
                `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-yield`
            ),
            "balance",
            RECEIVER_YIELD_IN_IBT_MOCK.toString()
        )
    })

    test("Should update yield for all the PrincipalToken users with yield", () => {
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                SENDER_USER_MOCK.toHex(),
                `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-yield`
            ),
            "balance",
            SENDER_YIELD_IN_IBT_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                RECEIVER_USER_MOCK.toHex(),
                `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-yield`
            ),
            "balance",
            RECEIVER_YIELD_IN_IBT_MOCK.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                SECOND_USER_MOCK.toHex(),
                `${FIRST_FUTURE_VAULT_ADDRESS_MOCK.toHex()}-yield`
            ),
            "balance",
            RECEIVER_YIELD_IN_IBT_MOCK.toString()
        )
    })
})
