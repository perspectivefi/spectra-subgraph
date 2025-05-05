import { SpectraWrapper as SpectraWrapperEntity } from "../../generated/schema"
import { ERC20 } from "../../generated/templates"
import { Deposit as DepositEvent } from "../../generated/templates/SpectraWrapper/Spectra4626Wrapper"
import { Spectra4626Wrapper } from "../../generated/templates/SpectraWrapper/Spectra4626Wrapper"
import { getAsset } from "../entities/Asset"
import { getSpectraWrapper } from "../entities/SpectraWrapper"
import { AssetType } from "../utils"

export function handleWrapperDeposit(event: DepositEvent): void {
    let eventTimestamp = event.block.timestamp
    // identify if the transfer is from a wrapper or not
    let wrapperContract = Spectra4626Wrapper.bind(event.address)
    let symbolCall = wrapperContract.try_symbol()
    if (symbolCall.reverted) {
        return
    }
    let symbol = symbolCall.value
    if (!symbol.startsWith("sw-")) {
        return
    }

    let vaultShare = wrapperContract.try_vaultShare()
    if (vaultShare.reverted) {
        return
    }

    let existingWrapper = SpectraWrapperEntity.load(event.address.toHex())
    if (existingWrapper) {
        return
    }
    // Get or create wrapper entity and create ERC20 template
    let wrapper = getSpectraWrapper(event.address, eventTimestamp)

    let asset = getAsset(
        event.address.toHex(),
        eventTimestamp,
        AssetType.WRAPPER
    )
    // Create ERC20 template to track transfers
    ERC20.create(event.address)
}
