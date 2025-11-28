import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts"

import {
    MetaVaultWrapperInitialized,
    DepositRequest,
    DecreaseDepositRequest,
    RedeemRequest,
    DecreaseRedeemRequest,
    Deposit,
    Withdraw,
} from "../../../generated/Metavault/MetavaultWrapper"
import { MetavaultWrapper } from "../../../generated/templates"
import { ERC20 } from "../../../generated/templates"
import { MetavaultWrapper as MetavaultWrapperContract } from "../../../generated/Metavault/MetavaultWrapper"
import { Metavault } from "../../../generated/schema"
import { ZERO_ADDRESS, ZERO_BI } from "../../constants"
import { updateAccountMetavaultRequest } from "../../entities/AccountAsset"
import { getAssetAmount } from "../../entities/AssetAmount"
import { getMetavaultFromWrapper } from "../../entities/Metavault"
import { createTransaction } from "../../entities/Transaction"
import { AssetType } from "../../utils"
import { generateTransactionId } from "../../utils/idGenerators"

/**
 * Get underlying asset address from metavault, with fallback to contract call
 */
function getUnderlyingAddress(
    metavault: Metavault,
    wrapperAddress: Address
): Address {
    let underlyingString = metavault.underlying
    if (underlyingString != null) {
        return Address.fromString(underlyingString)
    }
    
    // Fallback: get from wrapper contract
    let wrapperContract = MetavaultWrapperContract.bind(wrapperAddress)
    let assetCall = wrapperContract.try_asset()
    if (assetCall.reverted) {
        return ZERO_ADDRESS
    }
    return assetCall.value
}

/**
 * Create base transaction params with common metavault fields
 */
function createBaseMetavaultTransaction(
    event: ethereum.Event,
    metavault: Metavault,
    user: Address,
    transactionType: string
): any {
    return {
        id: generateTransactionId(
            event.transaction.hash,
            event.logIndex.toString()
        ),
        transactionAddress: event.transaction.hash,
        futureInTransaction: ZERO_ADDRESS,
        userInTransaction: user,
        poolInTransaction: ZERO_ADDRESS,
        metavaultInTransaction: Address.fromBytes(metavault.safeAddress),
        amountsIn: [],
        amountsOut: [],
        valueUnderlying: ZERO_BI,
        feeUnderlying: ZERO_BI,
        feeRatio: ZERO_BI,
        transaction: {
            type: transactionType,
            timestamp: event.block.timestamp,
            block: event.block.number,
            gas: event.block.gasUsed,
            gasPrice: event.transaction.gasPrice,
            fee: ZERO_BI,
            adminFee: ZERO_BI,
        },
        ibtRate: ZERO_BI,
        ptRate: ZERO_BI,
        metavaultRequestId: ZERO_BI,
        metavaultEpochId: ZERO_BI,
        metavaultShares: ZERO_BI,
        metavaultAssets: ZERO_BI,
    }
}

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
        event.params.owner,
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

    let params = createBaseMetavaultTransaction(
        event,
        metavault,
        event.params.owner,
        "MV_DEPOSIT_REQUEST"
    )
    params.metavaultRequestId = event.params.requestId
    params.metavaultAssets = event.params.assets

    createTransaction(params)
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
        let params = createBaseMetavaultTransaction(
            event,
            metavault,
            event.params.owner,
            "MV_DECREASE_DEPOSIT_REQUEST"
        )
        params.metavaultEpochId = event.params.epochId
        params.metavaultAssets = decreaseAmount

        createTransaction(params)
    }
}

export function handleRedeemRequest(event: RedeemRequest): void {
    updateAccountMetavaultRequest(
        event.params.owner,
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

    let params = createBaseMetavaultTransaction(
        event,
        metavault,
        event.params.owner,
        "MV_REDEEM_REQUEST"
    )
    params.metavaultRequestId = event.params.requestId
    params.metavaultShares = event.params.shares

    createTransaction(params)
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
        let params = createBaseMetavaultTransaction(
            event,
            metavault,
            event.params.owner,
            "MV_DECREASE_REDEEM_REQUEST"
        )
        params.metavaultEpochId = event.params.epochId
        params.metavaultShares = decreaseAmount

        createTransaction(params)
    }
    // what happens if:
    // 1. user requests deposit
    // 2. curator settles
    // 3. user requests new deposit
}

export function handleDeposit(event: Deposit): void {
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_DEPOSIT,
        "set",
        ZERO_BI
    )

    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )
    
    let underlyingAddress = getUnderlyingAddress(metavault, event.address)
    if (underlyingAddress == ZERO_ADDRESS) {
        return
    }

    let sharesAssetAmount = getAssetAmount(
        event.transaction.hash,
        event.address,
        event.params.shares,
        AssetType.MV_SHARES,
        event.logIndex.toString(),
        event.block.timestamp
    )

    let params = createBaseMetavaultTransaction(
        event,
        metavault,
        event.params.owner,
        "MV_DEPOSIT"
    )
    params.metavaultShares = event.params.shares
    params.metavaultAssets = event.params.assets

    createTransaction(params)
}

export function handleWithdraw(event: Withdraw): void {
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_REDEEM,
        "set",
        ZERO_BI
    )

    let metavault = getMetavaultFromWrapper(
        event.address,
        event.block.timestamp,
        event.block.number
    )
    
    let underlyingAddress = getUnderlyingAddress(metavault, event.address)
    if (underlyingAddress == ZERO_ADDRESS) {
        return
    }

    let underlyingAssetAmount = getAssetAmount(
        event.transaction.hash,
        underlyingAddress,
        event.params.assets,
        AssetType.UNDERLYING,
        event.logIndex.toString(),
        event.block.timestamp
    )

    let params = createBaseMetavaultTransaction(
        event,
        metavault,
        event.params.owner,
        "MV_WITHDRAW"
    )
    params.metavaultShares = event.params.shares
    params.metavaultAssets = event.params.assets

    createTransaction(params)
}
