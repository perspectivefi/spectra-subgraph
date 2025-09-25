import { BigInt, Address } from "@graphprotocol/graph-ts"

import {
    MetaVaultWrapperInitialized,
    DepositRequest,
    DecreaseDepositRequest,
    RedeemRequest,
    DecreaseRedeemRequest,
    Deposit,
    Withdraw
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
    const epochId = getEpochId(event.address)
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_DEPOSIT,
        "add",
        event.params.assets,
        epochId
    )
}

export function handleDecreaseDepositRequest(
    event: DecreaseDepositRequest
): void {
    const epochId = getEpochId(event.address)
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_DEPOSIT,
        "set",
        event.params.newRequestedAssets,
        epochId
    )
}

export function handleRedeemRequest(event: RedeemRequest): void {
    const epochId = getEpochId(event.address)
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_REDEEM,
        "add",
        event.params.shares,
        epochId
    )
}

export function handleDecreaseRedeemRequest(
    event: DecreaseRedeemRequest
): void {
    const epochId = getEpochId(event.address)
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_REDEEM,
        "set",
        event.params.newRequestedShares,
        epochId
    )
    // what happens if:
    // 1. user requests deposit
    // 2. curator settles
    // 3. user requests new deposit
}

export function handleDeposit(event: Deposit): void {
    const epochId = getEpochId(event.address)
    // all deposit requests are cleared
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_DEPOSIT,
        "set",
        ZERO_BI,
        epochId
    )
}

export function handleWithdraw(event: Withdraw): void {
    const epochId = getEpochId(event.address)
    // all redeem requests are cleared
    updateAccountMetavaultRequest(
        event.params.owner,
        event.address,
        event.block.timestamp,
        AssetType.MV_REQUEST_REDEEM,
        "set",
        ZERO_BI,
        epochId
    )
}

function getEpochId(metavaultWrapperAddress: Address): BigInt {
    return MetavaultWrapperAbi.bind(metavaultWrapperAddress).try_epochId().value
}