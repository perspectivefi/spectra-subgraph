import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import { Address } from "@graphprotocol/graph-ts/index"
import {
    assert,
    beforeAll,
    clearStore,
    describe,
    newMockEvent,
    test,
} from "matchstick-as/assembly/index"

import { Transfer } from "../../generated/templates/ERC20/ERC20Contract"
import { handleTransfer } from "../mappings/transfers"
import {
    generateAccountAssetId,
    generateTransferId,
} from "../utils/idGenerators"
import { toPrecision } from "../utils/toPrecision"
import {
    emiCurveFactoryChanged,
    emitCurvePoolDeployed,
    emitFutureVaultDeployed,
} from "./events/FutureVault"
import { emitRegistryUpdate } from "./events/FutureVaultFactory"
import {
    mockCurvePoolFunctions,
    POOL_LP_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "./mocks/CurvePool"
import { mockMetaPoolFactoryFunctions } from "./mocks/CurvePoolFactory"
import {
    ETH_ADDRESS_MOCK,
    mockERC20Functions,
    STANDARD_DECIMALS_MOCK,
} from "./mocks/ERC20"
import { mockFeedRegistryInterfaceFunctions } from "./mocks/FeedRegistryInterface"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    mockFutureVaultFunctions,
} from "./mocks/FutureVault"
import { mockFutureVaultFactoryFunctions } from "./mocks/FutureVaultFactory"
import {
    ACCOUNT_ASSET_ENTITY,
    ACCOUNT_ENTITY,
    TRANSFER_ENTITY,
} from "./utils/entities"

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

export const RECEIVER_USER_MOCK = Address.fromString(
    "0x2020000000000000000000000000000000000000"
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

        mockFutureVaultFactoryFunctions()
        mockFutureVaultFunctions()
        mockFeedRegistryInterfaceFunctions()
        mockMetaPoolFactoryFunctions()
        mockCurvePoolFunctions()

        emitRegistryUpdate("Test")
        emitFutureVaultDeployed(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
        emiCurveFactoryChanged()
        emitCurvePoolDeployed()

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
        ptTransferEvent.address = POOL_PT_ADDRESS_MOCK
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

        assert.fieldEquals(
            ACCOUNT_ENTITY,
            SENDER_USER_MOCK.toHex(),
            "transfersOut",
            `[${lpTransferId}, ${ptTransferId}]`
        )
        assert.fieldEquals(
            ACCOUNT_ENTITY,
            RECEIVER_USER_MOCK.toHex(),
            "transfersIn",
            `[${lpTransferId}, ${ptTransferId}]`
        )
    })

    test("Should reflect asset transfers in the account portfolio", () => {
        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                SENDER_USER_MOCK.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "balance",
            LP_TRANSFER_VALUE.neg().toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                RECEIVER_USER_MOCK.toHex(),
                POOL_LP_ADDRESS_MOCK.toHex()
            ),
            "balance",
            LP_TRANSFER_VALUE.toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                SENDER_USER_MOCK.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            PT_TRANSFER_VALUE.neg().toString()
        )

        assert.fieldEquals(
            ACCOUNT_ASSET_ENTITY,
            generateAccountAssetId(
                RECEIVER_USER_MOCK.toHex(),
                POOL_PT_ADDRESS_MOCK.toHex()
            ),
            "balance",
            PT_TRANSFER_VALUE.toString()
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
})
