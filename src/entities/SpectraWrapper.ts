import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { SpectraWrapper as SpectraWrapperEntity } from "../../generated/schema"
import { ERC20 } from "../../generated/templates"
import { Spectra4626Wrapper } from "../../generated/templates/SpectraWrapper/Spectra4626Wrapper"
import { getERC20Decimals, getERC20Name, getERC20Symbol } from "./ERC20"

export function getSpectraWrapper(
    address: Address,
    timestamp: BigInt
): SpectraWrapperEntity {
    let wrapper = SpectraWrapperEntity.load(address.toHex())
    if (wrapper) {
        return wrapper
    }

    wrapper = createSpectraWrapper(address, timestamp)
    return wrapper
}

function createSpectraWrapper(
    address: Address,
    timestamp: BigInt
): SpectraWrapperEntity {
    let wrapper = new SpectraWrapperEntity(address.toHex())
    let wrapperContract = Spectra4626Wrapper.bind(address)

    wrapper.address = address
    wrapper.createdAtTimestamp = timestamp

    // Wrapper token details
    wrapper.name = getERC20Name(address)
    wrapper.symbol = getERC20Symbol(address)
    wrapper.decimals = getERC20Decimals(address)

    // Get vault share details
    let vaultShareCall = wrapperContract.try_vaultShare()
    if (!vaultShareCall.reverted) {
        let vaultShareAddress = vaultShareCall.value
        wrapper.vaultShare = vaultShareAddress
        wrapper.vaultShareName = getERC20Name(vaultShareAddress)
        wrapper.vaultShareSymbol = getERC20Symbol(vaultShareAddress)
        wrapper.vaultShareDecimals = getERC20Decimals(vaultShareAddress)
    } else {
        log.warning("vaultShare() call reverted for wrapper {}", [
            address.toHex(),
        ])
    }

    // Get underlying asset details
    let assetCall = wrapperContract.try_asset()
    if (!assetCall.reverted) {
        let assetAddress = assetCall.value
        wrapper.asset = assetAddress
        wrapper.assetName = getERC20Name(assetAddress)
        wrapper.assetSymbol = getERC20Symbol(assetAddress)
        wrapper.assetDecimals = getERC20Decimals(assetAddress)
    } else {
        log.warning("asset() call reverted for wrapper {}", [address.toHex()])
    }

    // Create ERC20 template to track transfers if not already created
    ERC20.create(address)

    wrapper.save()
    return wrapper
}
