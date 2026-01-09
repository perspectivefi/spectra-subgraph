import { BigInt } from "@graphprotocol/graph-ts"

const FEE_DENOMINATOR = BigInt.fromI32(10).pow(10)
const A_PRECISION = BigInt.fromI32(100)
const N_COINS = BigInt.fromI32(2)
const N_COINS_I32: i32 = 2
const MAX_ITERATIONS: i32 = 255

export class CurveViews {
    /**
     * Calculate dynamic fee based on pool imbalance
     *
     *
     * @param xpi - Balance of token i in pool (normalized)
     * @param xpj - Balance of token j in pool (normalized)
     * @param fee - Base fee rate
     * @param offpegFeeMultiplier - Multiplier for off-peg fee (from pool contract)
     * @returns Dynamic fee rate
     */
    static dynamicFee(
        xpi: BigInt,
        xpj: BigInt,
        fee: BigInt,
        offpegFeeMultiplier: BigInt
    ): BigInt {
        // If offpeg multiplier is <= FEE_DENOMINATOR, no dynamic fee adjustment
        if (offpegFeeMultiplier.le(FEE_DENOMINATOR)) {
            return fee
        }

        // xps2 = (xpi + xpj)^2
        const xps2 = xpi.plus(xpj).pow(2)

        // Avoid division by zero
        if (xps2.equals(BigInt.zero())) {
            return fee
        }

        // numerator = offpeg_fee_multiplier * fee
        const numerator = offpegFeeMultiplier.times(fee)

        // inner = (offpeg_fee_multiplier - FEE_DENOMINATOR) * 4 * xpi * xpj / xps2
        const inner = offpegFeeMultiplier
            .minus(FEE_DENOMINATOR)
            .times(BigInt.fromI32(4))
            .times(xpi)
            .times(xpj)
            .div(xps2)

        // denominator = inner + FEE_DENOMINATOR
        const denominator = inner.plus(FEE_DENOMINATOR)

        if (denominator.equals(BigInt.zero())) {
            return fee
        }

        return numerator.div(denominator)
    }

    /**
     * D invariant calculation in non-overflowing integer operations iteratively
     *
     * A * sum(x_i) * n^n + D = A * D * n^n + D^(n+1) / (n^n * prod(x_i))
     *
     * Converging solution:
     * D[j+1] = (A * n^n * sum(x_i) - D[j]^(n+1) / (n^n prod(x_i))) / (A * n^n - 1)
     *
     * @param xp - Array of normalized token balances
     * @param amp - Amplification parameter
     * @returns D invariant value
     */
    static getD(xp: BigInt[], amp: BigInt): BigInt {
        // S = sum(x_i)
        let S = BigInt.zero()
        for (let i = 0; i < xp.length; i++) {
            S = S.plus(xp[i])
        }

        if (S.equals(BigInt.zero())) {
            return BigInt.zero()
        }

        let D = S
        const Ann = amp.times(N_COINS) // A * n

        // Newton-Raphson iteration
        for (let i: i32 = 0; i < MAX_ITERATIONS; i++) {
            // D_P = D^(n+1) / (n^n * prod(x_i))
            // Computed iteratively: D_P = D, then for each x: D_P = D_P * D / x
            let D_P = D
            for (let j = 0; j < xp.length; j++) {
                // D_P = D_P * D / x
                D_P = D_P.times(D).div(xp[j])
            }
            // D_P /= N_COINS^N_COINS (for 2 coins: 2^2 = 4)
            D_P = D_P.div(N_COINS.pow(N_COINS_I32 as u8))

            const Dprev = D

            // D = (Ann * S / A_PRECISION + D_P * N_COINS) * D
            //     / ((Ann - A_PRECISION) * D / A_PRECISION + (N_COINS + 1) * D_P)
            const numerator = Ann.times(S)
                .div(A_PRECISION)
                .plus(D_P.times(N_COINS))
                .times(D)

            const denominator = Ann.minus(A_PRECISION)
                .times(D)
                .div(A_PRECISION)
                .plus(N_COINS.plus(BigInt.fromI32(1)).times(D_P))

            D = numerator.div(denominator)

            // Convergence check with precision of 1
            if (D.gt(Dprev)) {
                if (D.minus(Dprev).le(BigInt.fromI32(1))) {
                    return D
                }
            } else {
                if (Dprev.minus(D).le(BigInt.fromI32(1))) {
                    return D
                }
            }
        }
        return D
    }
}
