import { Address, log } from "@graphprotocol/graph-ts"

import { CurvePoolFactory } from "../../generated/AMM/CurvePoolFactory"
import { ZERO_ADDRESS } from "../constants"

export const getPoolFactoryFeeReceiver = (factoryAddress: Address): Address => {
    let curvePoolFactoryContract = CurvePoolFactory.bind(factoryAddress)

    let feeReceiverCall = curvePoolFactoryContract.try_fee_receiver()

    if (!feeReceiverCall.reverted) {
        return feeReceiverCall.value
    }

    log.warning("fee_receiver() call reverted for {}", [factoryAddress.toHex()])

    return ZERO_ADDRESS
}

export const getPoolFactoryAdmin = (factoryAddress: Address): Address => {
    let curvePoolFactoryContract = CurvePoolFactory.bind(factoryAddress)

    let adminCall = curvePoolFactoryContract.try_admin()

    if (!adminCall.reverted) {
        return adminCall.value
    }

    log.warning("admin() call reverted for {}", [factoryAddress.toHex()])

    return ZERO_ADDRESS
}
