import { MetaVaultWrapperInitialized, DepositRequest, DecreaseDepositRequest, RedeemRequest, DecreaseRedeemRequest, Deposit, Withdraw, ClaimPendingDeposit, ClaimPendingRedeem } from "../../../generated/Metavault/MetavaultWrapper"
import { MetavaultWrapper } from "../../../generated/templates"
import { Metavault } from "../../../generated/schema"
import { ERC20 } from "../../../generated/templates"
import { updateAccountMetavaultRequestRedeemBalance, updateAccountMetavaultRequestDepositBalance } from "../../entities/AccountAsset"
import { getMetavault } from "../../entities/Metavault"
import { getAsset, getAssetID } from "../../entities/Asset"
import { AssetType } from "../../utils"

export function handleMetaVaultWrapperInitialized(event: MetaVaultWrapperInitialized): void {
    let metavaultWrapper = getMetavault(event.address, event.block.timestamp, event.block.number, "MetavaultWrapper")

    MetavaultWrapper.create(event.address)
    ERC20.create(event.address)
}


export function handleDepositRequest(event: DepositRequest): void {
    let asset = getAsset(event.address.toHex(), event.block.timestamp, AssetType.MV_REQUEST_DEPOSIT, getAssetID(event.address.toHex(), AssetType.MV_REQUEST_DEPOSIT))
    updateAccountMetavaultRequestDepositBalance(event.params.owner.toHex(), asset.id, event.block.timestamp, event.params.assets, true)
    throw new Error("Not implemented");
}

export function handleDecreaseDepositRequest(event: DecreaseDepositRequest): void {
    let asset = getAsset(event.address.toHex(), event.block.timestamp, AssetType.MV_REQUEST_DEPOSIT, getAssetID(event.address.toHex(), AssetType.MV_REQUEST_DEPOSIT))
    updateAccountMetavaultRequestDepositBalance(event.params.owner.toHex(), asset.id, event.block.timestamp, event.params.previousRequestedAssets.minus(event.params.newRequestedAssets), false)
    throw new Error("Not implemented");
}

export function handleRedeemRequest(event: RedeemRequest): void {
    throw new Error("Not implemented");
}

export function handleDecreaseRedeemRequest(event: DecreaseRedeemRequest): void {
    //    should call updateAccountMetavaultRequestRedeemBalance() to update the balance of the redeem request asset according to the amount decreased in the event
    throw new Error("Not implemented");
}

export function handleDeposit(event: Deposit): void {
    // should delete the deposit request entity as the shares are now minted or set them to 0
    throw new Error("Not implemented");
}

export function handleWithdraw(event: Withdraw): void {
    // should not delete the redeem request entity as the shares are still held by the user or set them to 0
    throw new Error("Not implemented");
}

export function handleClaimPendingDeposit(event: ClaimPendingDeposit): void {
    throw new Error("Not implemented");
}

export function handleClaimPendingRedeem(event: ClaimPendingRedeem): void {
    throw new Error("Not implemented");
}