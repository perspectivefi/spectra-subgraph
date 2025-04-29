import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { CurvePool } from "../../generated/templates/CurvePool/CurvePool"
import { CurvePoolNG } from "../../generated/templates/CurvePool/CurvePoolNG"
import { CurvePoolSNG } from "../../generated/templates/CurvePool/CurvePoolSNG"
import { CURVE_UNIT, UNIT_BI, ZERO_ADDRESS, ZERO_BI } from "../constants"
import { PoolType } from "../utils"

export const getPoolType = (poolAddress: Address): string => {
    if (!CurvePoolSNG.bind(poolAddress).try_decimals().reverted) {
        return "CURVE_SNG"
    }
    if (!CurvePoolNG.bind(poolAddress).try_ma_time().reverted) {
        return "CURVE_NG"
    }
    if (!CurvePool.bind(poolAddress).try_ma_half_time().reverted) {
        return "CURVE"
    }
    log.warning("all identification methods failed for pool {}", [
        poolAddress.toHex(),
    ])
    return "UNKNOWN"
}

export const getPoolLPToken = (
    poolAddress: Address,
    poolType: string
): Address => {
    // if pool is SNG, the LP token is itself
    if (poolType == PoolType.CURVE_SNG) {
        return poolAddress
    } else {
        let curvePoolContract = CurvePool.bind(poolAddress)
        let tokenCall = curvePoolContract.try_token()
        if (!tokenCall.reverted) {
            return tokenCall.value
        }
        log.warning("token() call reverted for {}", [poolAddress.toHex()])
        return ZERO_ADDRESS
    }
}

export const getPoolVirtualPrice = (poolAddress: Address): BigInt => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let call = curvePoolContract.try_get_virtual_price()

    if (!call.reverted) {
        return call.value
    }

    log.warning("get_virtual_price() call reverted for {}", [
        poolAddress.toHex(),
    ])

    return CURVE_UNIT
}

export const getPoolFee = (poolAddress: Address): BigInt => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let feeCall = curvePoolContract.try_fee()

    if (!feeCall.reverted) {
        return feeCall.value
    }

    log.warning("fee() call reverted for {}", [poolAddress.toHex()])

    return ZERO_BI
}

export const getPoolAdminFee = (poolAddress: Address): BigInt => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let adminFeeCall = curvePoolContract.try_admin_fee()

    if (!adminFeeCall.reverted) {
        return adminFeeCall.value
    }

    log.warning("admin_fee() call reverted for {}", [poolAddress.toHex()])

    return ZERO_BI
}

export const getPoolFutureAdminFee = (poolAddress: Address): BigInt => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let adminFeeCall = curvePoolContract.try_future_admin_fee()

    if (!adminFeeCall.reverted) {
        return adminFeeCall.value
    }

    log.warning("future_admin_fee() call reverted for {}", [
        poolAddress.toHex(),
    ])

    return ZERO_BI
}

export const getPoolFutureAdminFeeChangeDeadline = (
    poolAddress: Address
): BigInt => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let adminFeeChangeDeadlineCall =
        curvePoolContract.try_admin_actions_deadline()

    if (!adminFeeChangeDeadlineCall.reverted) {
        return adminFeeChangeDeadlineCall.value
    }

    log.warning("admin_actions_deadline() call reverted for {}", [
        poolAddress.toHex(),
    ])

    return ZERO_BI
}

export const getPoolBalances = (poolAddress: Address): Array<BigInt> => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let ibtBalanceCall = curvePoolContract.try_balances(BigInt.fromI32(0))
    let ptBalanceCall = curvePoolContract.try_balances(BigInt.fromI32(1))

    if (!ibtBalanceCall.reverted && !ptBalanceCall.reverted) {
        return [ibtBalanceCall.value, ptBalanceCall.value]
    }

    log.warning("balances() call reverted for {}", [poolAddress.toHex()])

    return [ZERO_BI, ZERO_BI]
}

export const getPoolPriceScale = (poolAddress: Address): BigInt => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let priceScaleCall = curvePoolContract.try_price_scale()

    if (!priceScaleCall.reverted) {
        return priceScaleCall.value
    }

    log.warning("price_scale() call reverted for {}", [poolAddress.toHex()])

    return ZERO_BI
}

export const getPoolLastPrices = (
    poolAddress: Address,
    poolType: string
): BigInt => {
    if (poolType == PoolType.CURVE_SNG) {
        let contract = CurvePoolSNG.bind(poolAddress)
        let lastPriceCall = contract.try_last_price(ZERO_BI)
        let storedRatesCall = contract.try_stored_rates()
        if (!lastPriceCall.reverted && !storedRatesCall.reverted) {
            return storedRatesCall.value[1]
                .times(lastPriceCall.value)
                .div(storedRatesCall.value[0])
        }
        log.warning("last_price() or stored_rates() call reverted for {}, {}", [
            poolAddress.toHex(),
            poolType,
        ])
        return ZERO_BI
    } else {
        let lastPricesCall = CurvePool.bind(poolAddress).try_last_prices()
        if (!lastPricesCall.reverted) {
            return lastPricesCall.value
        }
        log.warning("last_prices() call reverted for {}, {}", [
            poolAddress.toHex(),
            poolType,
        ])
        return ZERO_BI
    }
}

const MIN_DX = BigInt.fromI32(100)
const getInfinitesimalDx = (poolAddress: Address, i: BigInt): BigInt => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let balancesCall = curvePoolContract.try_balances(i)

    if (!balancesCall.reverted) {
        const amount = balancesCall.value.div(BigInt.fromI32(100000))
        return amount.lt(MIN_DX) ? MIN_DX : amount
    }

    log.warning("balances() call reverted for {}", [poolAddress.toHex()])

    return ZERO_BI
}

export const getPoolSwapPreview = (
    poolAddress: Address,
    poolType: string,
    i: BigInt,
    j: BigInt
): BigInt => {
    if (poolType == PoolType.CURVE_SNG) {
        let curvePoolContract = CurvePoolSNG.bind(poolAddress)

        let amount = getInfinitesimalDx(poolAddress, i)
        let swapPreviewCall = curvePoolContract.try_get_dy(i, j, amount)

        if (!swapPreviewCall.reverted && amount.gt(ZERO_BI)) {
            return swapPreviewCall.value.times(CURVE_UNIT).div(amount)
        }

        log.warning("get_dy() call reverted for {}", [poolAddress.toHex()])

        return ZERO_BI
    } else {
        let curvePoolContract = CurvePool.bind(poolAddress)

        let amount = getInfinitesimalDx(poolAddress, i)
        let swapPreviewCall = curvePoolContract.try_get_dy(i, j, amount)

        if (!swapPreviewCall.reverted && amount.gt(ZERO_BI)) {
            return swapPreviewCall.value.times(CURVE_UNIT).div(amount)
        }

        log.warning("get_dy() call reverted for {}", [poolAddress.toHex()])

        return ZERO_BI
    }
}

export const getPoolCoins = (poolAddress: Address): Address[] => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let token0Call = curvePoolContract.try_coins(BigInt.fromI32(0))
    let token1Call = curvePoolContract.try_coins(BigInt.fromI32(1))

    if (token0Call.reverted) {
        log.warning("coins() call reverted for {} pool and {} coin index", [
            poolAddress.toHex(),
            "0",
        ])
        return [ZERO_ADDRESS, ZERO_ADDRESS]
    } else if (token1Call.reverted) {
        log.warning("coins() call reverted for {} pool and {} coin index", [
            poolAddress.toHex(),
            "1",
        ])
        return [ZERO_ADDRESS, ZERO_ADDRESS]
    }

    return [token0Call.value, token1Call.value]
}

// With 10 decimals precision
export const getIBTtoPTRate = (poolAddress: Address, input: BigInt): BigInt => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let ptForIBTPriceCall = curvePoolContract.try_get_dy(
        BigInt.fromI32(0),
        BigInt.fromI32(1),
        input
    )

    if (!ptForIBTPriceCall.reverted) {
        return ptForIBTPriceCall.value
    }

    log.warning("get_dy() call reverted for {}", [poolAddress.toHex()])

    return UNIT_BI
}
