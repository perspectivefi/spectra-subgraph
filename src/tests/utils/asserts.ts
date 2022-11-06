import { BigDecimal } from "@graphprotocol/graph-ts"
import { assert } from "matchstick-as/assembly/index"

/**
 * Compute the absolute value of a BigDecimal
 * @param n The BigDecimal to compute the absolute value of
 * @returns The absolute value of the BigDecimal
 */
export function absBD(n: BigDecimal): BigDecimal {
    return n < BigDecimal.fromString("0") ? n.neg() : n
}

/**
 * Asserts that two BigDecimal values are almost equal up to a given precision.
 * @param number1 The first number to compare.
 * @param number2 The second number to compare.
 * @param precision The precision to use for the comparison.
 */
export function assertAlmostEquals(
    number1: BigDecimal,
    number2: BigDecimal,
    precision: number = 0.01
): void {
    // shortcut for exact equality
    if (number1.equals(number2)) {
        assert.assertTrue(true)
        return
    }
    const deltaBI = absBD(number1.minus(number2))
    const precisionBD = BigDecimal.fromString(precision.toString())
    assert.assertTrue(deltaBI.lt(precisionBD))
    return
}
