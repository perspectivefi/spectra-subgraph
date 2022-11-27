import { BigInt } from "@graphprotocol/graph-ts"

export const toPrecision = (
    value: BigInt,
    fromPrecision: i32,
    toPrecision: i32
): BigInt => {
    const precisionDelta = fromPrecision - toPrecision
    if (precisionDelta === 0) {
        return value
    } else if (precisionDelta > 0) {
        return value.div(BigInt.fromI32(10).pow(precisionDelta as u8))
    } else {
        return value.times(BigInt.fromI32(10).pow(-precisionDelta as u8))
    }
}
