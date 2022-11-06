import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import { ERC4626Contract } from "../../generated/futureVault/ERC4626Contract"
import { UNIT_BI, ZERO_BI } from "../constants"

export function getIBTRate(address: Address): BigInt {
    let erc4626Contract = ERC4626Contract.bind(address)
    let rate = erc4626Contract.try_convertToAssets(UNIT_BI)

    if (!rate.reverted) {
        return rate.value
    }

    log.warning("convertToAssets() call reverted for {}", [
        address.toHex(),
    ])
    return ZERO_BI
}