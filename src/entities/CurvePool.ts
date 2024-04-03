import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { CurvePool } from "../../generated/CurvePool/CurvePool"
import { Pool } from "../../generated/schema"
import { UNIT_BI, ZERO_ADDRESS, ZERO_BI } from "../constants"
import { getERC20Decimals } from "./ERC20"

export const getPoolLPToken = (poolAddress: Address): Address => {
    let curvePoolContract = CurvePool.bind(poolAddress)

    let tokenCall = curvePoolContract.try_token()

    if (!tokenCall.reverted) {
        return tokenCall.value
    }

    log.warning("token() call reverted for {}", [poolAddress.toHex()])

    return ZERO_ADDRESS
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
