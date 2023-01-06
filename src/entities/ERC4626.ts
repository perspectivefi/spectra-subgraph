import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { ERC4626 } from "../../generated/FutureVault/ERC4626"
import { UNIT_BI, ZERO_BI } from "../constants"

export function getIBTRate(address: Address): BigInt {
    let erc4626Contract = ERC4626.bind(address)
    let rate = erc4626Contract.try_convertToAssets(UNIT_BI)

    if (!rate.reverted) {
        return rate.value
    }

    log.warning("convertToAssets() call reverted for {}", [address.toHex()])
    return ZERO_BI
}
