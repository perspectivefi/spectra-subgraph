import { BigInt } from "@graphprotocol/graph-ts"

import {
    MetaVaultWrapperInitialized,
    DepositRequest,
    DecreaseDepositRequest,
    RedeemRequest,
    DecreaseRedeemRequest,
    Deposit,
    Withdraw,
    ClaimPendingDeposit,
} from "../../../generated/Metavault/MetavaultWrapper"
import { MetavaultWrapper as MetavaultWrapperAbi } from "../../../generated/Metavault/MetavaultWrapper"
import { MetavaultWrapper } from "../../../generated/templates"
import { ERC20 } from "../../../generated/templates"
import { AmphorAsyncVault } from "../../../generated/templates/MetavaultWrapper/AmphorAsyncVault"
import { ZERO_BI } from "../../constants"
import { updateAccountMetavaultRequest } from "../../entities/AccountAsset"
import { getMetavault, createMetavaultEpoch } from "../../entities/Metavault"
import { AssetType } from "../../utils"

export function handleMetaVaultWrapperInitialized(
    event: MetaVaultWrapperInitialized
): void {
    let metavaultWrapper = getMetavault(
        event.address,
        event.block.timestamp,
        event.block.number,
        "MetavaultWrapper"
    )

    metavaultWrapper.wrapperAddress = event.address // if Metavault was created with a different wrapper previously, update it to the new one
    metavaultWrapper.save()
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
    // TODO: anything else to do?
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
    // TODO: anything else to do?
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
    // TODO: anything else to do?
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
    // TODO: anything else to do?

    // what happens if:
    // 1. user requests deposit
    // 2. curator settles
    // 3. user requests new deposit
}

export function handleDeposit(event: Deposit): void {
    // all deposit requests are cleared
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_DEPOSIT,
        "set",
        ZERO_BI
    )
    // shares are already tracked with the ERC20 template
    // TODO: anything else to do?
}

export function handleWithdraw(event: Withdraw): void {
    // all redeem requests are cleared
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_REDEEM,
        "set",
        ZERO_BI
    )
    // shares are already tracked with the ERC20 template
    // TODO: anything else to do?
}

export function handleClaimPendingDeposit(event: ClaimPendingDeposit): void {
    // Calculate conversion rate: assets / wrapper shares
    // TODO: check if division is safe from overflow or underflow (can wrapperSharesClaimed be 0 ?)

    const wrapperDecimals = MetavaultWrapperAbi.bind(
        event.address
    ).try_decimals().value
    const lastSavedBalance = AmphorAsyncVault.bind(
        MetavaultWrapperAbi.bind(event.address).try_getInfraVault().value
    ).try_lastSavedBalance().value
    // Create MetavaultEpoch entity
    createMetavaultEpoch(
        event.address,
        event.params.epochId,
        event.params.assetsClaimed
            .times(BigInt.fromString("10").pow(wrapperDecimals as u8))
            .div(event.params.wrapperSharesReceived),
        lastSavedBalance,
        event.block.timestamp,
        event.block.number
    )
}

/**
 * Not used in the subgraph as this would create a rate taking into account performance fees that we don't want to track,
 * but kept for reference
 * @param event ClaimPendingRedeem event
 */
/*
export function handleClaimPendingRedeem(event: ClaimPendingRedeem): void {
    // Calculate conversion rate: assets / wrapper shares
    // TODO: check if division is safe from overflow or underflow (can wrapperSharesClaimed be 0 ?)

    const wrapperDecimals = MetavaultWrapperAbi.bind(
        event.address
    ).try_decimals().value
    // Create MetavaultEpoch entity
    createMetavaultEpoch(
        event.address,
        event.params.epochId,
        event.params.assetsReceived
            .times(BigInt.fromString("10").pow(wrapperDecimals as u8))
            .div(event.params.wrapperSharesClaimed),
        event.block.timestamp,
        event.block.number
    )
}
*/
