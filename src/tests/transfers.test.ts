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
import { handleTransfer } from "../mappings/transfers"
import {
    generateAccountAssetId,
    generateTransferId,
} from "../utils/idGenerators"
import { toPrecision } from "../utils/toPrecision"
import {
    emiCurveFactoryChanged,
    emitCurvePoolDeployed,
    emitDeposit,
    emitFutureVaultDeployed,
} from "./events/FutureVault"
import { emitFactoryUpdated } from "./events/Factory"
import {
    FIRST_POOL_ADDRESS_MOCK,
    mockCurvePoolFunctions,
    POOL_LP_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "./mocks/CurvePool"
import {
    mockERC20Balances,
    mockERC20Functions,
    POOL_LP_BALANCE_MOCK,
    POOL_PT_BALANCE_MOCK,
    STANDARD_DECIMALS_MOCK,
} from "./mocks/ERC20"
import { createConvertToAssetsCallMock } from "./mocks/ERC4626"
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

        mockFactoryFunctions()

        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
        mockCurvePoolFunctions()

        emitFactoryUpdated()
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emiCurveFactoryChanged()
        emitCurvePoolDeployed(FIRST_POOL_ADDRESS_MOCK)

        createConvertToAssetsCallMock(IBT_ADDRESS_MOCK, 1)
        // Necessary to have YT entity to follow yield
        emitDeposit(0, SENDER_USER_MOCK)
        emitDeposit(0, RECEIVER_USER_MOCK)
        emitDeposit(0, SECOND_USER_MOCK)

        let lpTransferEvent = changetype<Transfer>(newMockEvent())
        lpTransferEvent.address = POOL_LP_ADDRESS_MOCK
        lpTransferEvent.transaction.hash = LP_TRANSFER_TRANSACTION_HASH

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

        let ptValueParam = new ethereum.EventParam(
            "value",
            ethereum.Value.fromSignedBigInt(PT_TRANSFER_VALUE)
        )

        ptTransferEvent.parameters = [fromParam, toParam, ptValueParam]

        handleTransfer(ptTransferEvent)

        let invalidAssetTransferEvent = changetype<Transfer>(newMockEvent())
        // Asset not existing in any APWine pool
        invalidAssetTransferEvent.address = Address.fromString(
            "0x0000000000000000000000000000000000000000"
        )
        invalidAssetTransferEvent.transaction.hash =
            INVALID_TRANSFER_TRANSACTION_HASH

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

    test("Should create new Transfer entity on every valid transfer", () => {
        assert.entityCount(TRANSFER_ENTITY, 2)
    })

    test("Should assign the transfer event to a receiver and sender", () => {
        const lpTransferId = generateTransferId(
            LP_TRANSFER_TRANSACTION_HASH.toHex(),
            "1"
        )

        const ptTransferId = generateTransferId(
            PT_TRANSFER_TRANSACTION_HASH.toHex(),
            "1"
        )

        assert.fieldEquals(
            TRANSFER_ENTITY,
            lpTransferId,
            "from",
            SENDER_USER_MOCK.toHex()
        )
        assert.fieldEquals(
            TRANSFER_ENTITY,
            lpTransferId,
            "to",
            RECEIVER_USER_MOCK.toHex()
        )

        let senderAccountEntity = Account.load(SENDER_USER_MOCK.toHex())!
        const transfersOut = senderAccountEntity.transfersOut.load()

        let receiverAccountEntity = Account.load(RECEIVER_USER_MOCK.toHex())!
        const transfersIn = receiverAccountEntity.transfersIn.load()

        assert.i32Equals(transfersOut.length, 2)
        assert.i32Equals(transfersIn.length, 2)
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
            "1"
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
            "1"
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
