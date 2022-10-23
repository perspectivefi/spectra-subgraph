import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { MetaPoolFactory } from "../../generated/AMM/MetaPoolFactory"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"

export const getPoolFeeReceiver = (poolAddress: Address): Address => {
    let metaPoolContract = MetaPoolFactory.bind(poolAddress)

    let getFeeReceiverCall = metaPoolContract.try_get_fee_receiver(poolAddress)

    if (!getFeeReceiverCall.reverted) {
        return getFeeReceiverCall.value
    }

    log.warning("get_fee_receiver() call reverted for {}", [
        poolAddress.toHex(),
    ])

    return ZERO_ADDRESS
}

export const getPoolFee = (poolAddress: Address): BigInt => {
    let metaPoolContract = MetaPoolFactory.bind(poolAddress)

    let getFeeReceiverCall = metaPoolContract.try_get_fees(poolAddress)

    if (!getFeeReceiverCall.reverted) {
        return getFeeReceiverCall.value.value0
    }

    log.warning("get_fees() call reverted for {}", [poolAddress.toHex()])

    return ZERO_BI
}

export const getPoolAdminFee = (poolAddress: Address): BigInt => {
    let metaPoolContract = MetaPoolFactory.bind(poolAddress)

    let getFeeReceiverCall = metaPoolContract.try_get_fees(poolAddress)

    if (!getFeeReceiverCall.reverted) {
        return getFeeReceiverCall.value.value1
    }

    log.warning("get_fees() call reverted for {}", [poolAddress.toHex()])

    return ZERO_BI
}
