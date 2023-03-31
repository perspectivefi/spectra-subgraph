import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"

export const FEED_REGISTRY = "0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf"
export const USD_DENOMINATION = "0x0000000000000000000000000000000000000348"

export const ZERO_BD = BigDecimal.fromString("0")
export const ZERO_BI = BigInt.fromString("0")
export const UNIT_BI = BigInt.fromString("1")

export const ZERO_ADDRESS = Address.fromString(
    "0x0000000000000000000000000000000000000000"
)

export const SECONDS_PER_DAY = 86400
export const DAYS_PER_YEAR_BD = BigDecimal.fromString("364.25")
export const SECONDS_PER_YEAR_BD = BigDecimal.fromString("31556926")

export const DAY_ID_0 = "0"
