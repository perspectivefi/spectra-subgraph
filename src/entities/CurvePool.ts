import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { CurvePool } from "../../generated/CurvePool/CurvePool"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"

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
