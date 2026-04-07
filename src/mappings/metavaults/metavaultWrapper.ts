import { BigInt, Address } from "@graphprotocol/graph-ts"

import {
    MetaVaultWrapperInitialized,
    DepositRequest,
    DecreaseDepositRequest,
    RedeemRequest,
    DecreaseRedeemRequest,
    Deposit,
    Withdraw,
    MetavaultWrapper as MetavaultWrapperContract,
} from "../../../generated/Metavault/MetavaultWrapper"
import { MetavaultWrapper } from "../../../generated/templates"
import { ERC20 } from "../../../generated/templates"
import { ZERO_ADDRESS, ZERO_BI } from "../../constants"
import { updateAccountMetavaultRequest } from "../../entities/AccountAsset"
import { getAssetAmount } from "../../entities/AssetAmount"
import { getMetavaultFromWrapper } from "../../entities/Metavault"
import { createTransaction } from "../../entities/Transaction"
import { AssetType } from "../../utils"
import { generateTransactionId } from "../../utils/idGenerators"

export function handleMetaVaultWrapperInitialized(
    event: MetaVaultWrapperInitialized
): void {
    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )

    metavault.wrapperAddress = event.address // if Metavault was created with a different wrapper previously, update it to the new one
    metavault.save()
    MetavaultWrapper.create(event.address)
    ERC20.create(event.address)
}

export function handleDepositRequest(event: DepositRequest): void {
    updateAccountMetavaultRequest(
        event.params.controller,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_DEPOSIT,
        "add",
        event.params.assets
    )

    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )

    let wrapperContract = MetavaultWrapperContract.bind(event.address)
    let epochIdCall = wrapperContract.try_epochId()
    let epochId = epochIdCall.reverted ? ZERO_BI : epochIdCall.value

    createTransaction({
        id: generateTransactionId(
            event.transaction.hash,
            event.logIndex.toString()
        ),
        transactionAddress: event.transaction.hash,
        futureInTransaction: ZERO_ADDRESS,
        userInTransaction: event.params.controller,
        poolInTransaction: ZERO_ADDRESS,
        metavaultInTransaction: Address.fromBytes(metavault.safeAddress),
        amountsIn: [],
        amountsOut: [],
        valueUnderlying: ZERO_BI,
        feeUnderlying: ZERO_BI,
        feeRatio: ZERO_BI,
        transaction: {
            type: "MV_DEPOSIT_REQUEST",
            timestamp: event.block.timestamp,
            block: event.block.number,
            gas: event.block.gasUsed,
            gasPrice: event.transaction.gasPrice,
            fee: ZERO_BI,
            adminFee: ZERO_BI,
        },
        ibtRate: ZERO_BI,
        ptRate: ZERO_BI,
        metavaultEpochId: epochId,
        metavaultShares: ZERO_BI,
        metavaultAssets: event.params.assets,
    })
}

export function handleDecreaseDepositRequest(
    event: DecreaseDepositRequest
): void {
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_DEPOSIT,
        "set",
        event.params.newRequestedAssets
    )

    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )

    let decreaseAmount = event.params.previousRequestedAssets.minus(
        event.params.newRequestedAssets
    )

    if (decreaseAmount.gt(ZERO_BI)) {
        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,
            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: event.params.owner,
            poolInTransaction: ZERO_ADDRESS,
            metavaultInTransaction: Address.fromBytes(metavault.safeAddress),
            amountsIn: [],
            amountsOut: [],
            valueUnderlying: ZERO_BI,
            feeUnderlying: ZERO_BI,
            feeRatio: ZERO_BI,
            transaction: {
                type: "MV_DECREASE_DEPOSIT_REQUEST",
                timestamp: event.block.timestamp,
                block: event.block.number,
                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
            ibtRate: ZERO_BI,
            ptRate: ZERO_BI,
            metavaultEpochId: event.params.epochId,
            metavaultShares: ZERO_BI,
            metavaultAssets: decreaseAmount,
        })
    }
}

export function handleRedeemRequest(event: RedeemRequest): void {
    updateAccountMetavaultRequest(
        event.params.controller,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_REDEEM,
        "add",
        event.params.shares
    )

    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )

    let wrapperContract = MetavaultWrapperContract.bind(event.address)
    let epochIdCall = wrapperContract.try_epochId()
    let epochId = epochIdCall.reverted ? ZERO_BI : epochIdCall.value

    createTransaction({
        id: generateTransactionId(
            event.transaction.hash,
            event.logIndex.toString()
        ),
        transactionAddress: event.transaction.hash,
        futureInTransaction: ZERO_ADDRESS,
        userInTransaction: event.params.controller,
        poolInTransaction: ZERO_ADDRESS,
        metavaultInTransaction: Address.fromBytes(metavault.safeAddress),
        amountsIn: [],
        amountsOut: [],
        valueUnderlying: ZERO_BI,
        feeUnderlying: ZERO_BI,
        feeRatio: ZERO_BI,
        transaction: {
            type: "MV_REDEEM_REQUEST",
            timestamp: event.block.timestamp,
            block: event.block.number,
            gas: event.block.gasUsed,
            gasPrice: event.transaction.gasPrice,
            fee: ZERO_BI,
            adminFee: ZERO_BI,
        },
        ibtRate: ZERO_BI,
        ptRate: ZERO_BI,
        metavaultEpochId: epochId,
        metavaultShares: event.params.shares,
        metavaultAssets: ZERO_BI,
    })
}

export function handleDecreaseRedeemRequest(
    event: DecreaseRedeemRequest
): void {
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_REDEEM,
        "set",
        event.params.newRequestedShares
    )

    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )

    let decreaseAmount = event.params.previousRequestedShares.minus(
        event.params.newRequestedShares
    )

    if (decreaseAmount.gt(ZERO_BI)) {
        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,
            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: event.params.owner,
            poolInTransaction: ZERO_ADDRESS,
            metavaultInTransaction: Address.fromBytes(metavault.safeAddress),
            amountsIn: [],
            amountsOut: [],
            valueUnderlying: ZERO_BI,
            feeUnderlying: ZERO_BI,
            feeRatio: ZERO_BI,
            transaction: {
                type: "MV_DECREASE_REDEEM_REQUEST",
                timestamp: event.block.timestamp,
                block: event.block.number,
                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
            ibtRate: ZERO_BI,
            ptRate: ZERO_BI,
            metavaultEpochId: event.params.epochId,
            metavaultShares: decreaseAmount,
            metavaultAssets: ZERO_BI,
        })
    }
}

export function handleDeposit(event: Deposit): void {
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_DEPOSIT,
        "clear",
        ZERO_BI
    )

    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )

    let sharesAssetAmount = getAssetAmount(
        event.transaction.hash,
        event.address,
        event.params.shares,
        AssetType.MV_SHARES,
        event.logIndex.toString(),
        event.block.timestamp
    )

    let wrapperContract = MetavaultWrapperContract.bind(event.address)
    let epochIdCall = wrapperContract.try_epochId()
    let epochId = epochIdCall.reverted ? ZERO_BI : epochIdCall.value

    createTransaction({
        id: generateTransactionId(
            event.transaction.hash,
            event.logIndex.toString()
        ),
        transactionAddress: event.transaction.hash,
        futureInTransaction: ZERO_ADDRESS,
        userInTransaction: event.params.owner,
        poolInTransaction: ZERO_ADDRESS,
        metavaultInTransaction: Address.fromBytes(metavault.safeAddress),
        amountsIn: [],
        amountsOut: [],
        valueUnderlying: ZERO_BI,
        feeUnderlying: ZERO_BI,
        feeRatio: ZERO_BI,
        transaction: {
            type: "MV_DEPOSIT",
            timestamp: event.block.timestamp,
            block: event.block.number,
            gas: event.block.gasUsed,
            gasPrice: event.transaction.gasPrice,
            fee: ZERO_BI,
            adminFee: ZERO_BI,
        },
        ibtRate: ZERO_BI,
        ptRate: ZERO_BI,
        metavaultEpochId: epochId,
        metavaultShares: event.params.shares,
        metavaultAssets: event.params.assets,
    })
}

export function handleWithdraw(event: Withdraw): void {
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_REDEEM,
        "clear",
        ZERO_BI
    )

    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )

    let underlyingAssetAmount = getAssetAmount(
        event.transaction.hash,
        event.address,
        event.params.assets,
        AssetType.UNDERLYING,
        event.logIndex.toString(),
        event.block.timestamp
    )

    let wrapperContract = MetavaultWrapperContract.bind(event.address)
    let epochIdCall = wrapperContract.try_epochId()
    let epochId = epochIdCall.reverted ? ZERO_BI : epochIdCall.value

    createTransaction({
        id: generateTransactionId(
            event.transaction.hash,
            event.logIndex.toString()
        ),
        transactionAddress: event.transaction.hash,
        futureInTransaction: ZERO_ADDRESS,
        userInTransaction: event.params.owner,
        poolInTransaction: ZERO_ADDRESS,
        metavaultInTransaction: Address.fromBytes(metavault.safeAddress),
        amountsIn: [],
        amountsOut: [],
        valueUnderlying: ZERO_BI,
        feeUnderlying: ZERO_BI,
        feeRatio: ZERO_BI,
        transaction: {
            type: "MV_WITHDRAW",
            timestamp: event.block.timestamp,
            block: event.block.number,
            gas: event.block.gasUsed,
            gasPrice: event.transaction.gasPrice,
            fee: ZERO_BI,
            adminFee: ZERO_BI,
        },
        ibtRate: ZERO_BI,
        ptRate: ZERO_BI,
        metavaultEpochId: epochId,
        metavaultShares: event.params.shares,
        metavaultAssets: event.params.assets,
    })
}
