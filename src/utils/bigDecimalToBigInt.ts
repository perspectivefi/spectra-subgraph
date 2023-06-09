import { BigDecimal, BigInt } from "@graphprotocol/graph-ts"

export function bigDecimalToBigInt(value: BigDecimal): BigInt {
    const integer = value.toString().split(".")[0]
    return BigInt.fromString(integer)
}
