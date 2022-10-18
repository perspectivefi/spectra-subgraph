import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"

export const FEED_REGISTRY = "0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf"
export const USD_DENOMINATION = "0x0000000000000000000000000000000000000348"

export const ZERO_BD = BigDecimal.fromString("0")
export const ZERO_BI = BigInt.fromString("0")

export const ZERO_ADDRESS = Address.fromString(
    "0x0000000000000000000000000000000000000000"
)
