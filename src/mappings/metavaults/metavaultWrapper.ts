import { BigInt, Address } from "@graphprotocol/graph-ts"

import {
    MetaVaultWrapperInitialized,
    DepositRequest,
    DecreaseDepositRequest,
    RedeemRequest,
    DecreaseRedeemRequest,
    Deposit,
    Withdraw,
} from "../../../generated/Metavault/MetavaultWrapper"
import { MetavaultWrapper as MetavaultWrapperAbi } from "../../../generated/Metavault/MetavaultWrapper"
import { MetavaultWrapper } from "../../../generated/templates"
import { ERC20 } from "../../../generated/templates"
import { ZERO_BI } from "../../constants"
import { updateAccountMetavaultRequest } from "../../entities/AccountAsset"
import { getMetavault } from "../../entities/Metavault"
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
}
