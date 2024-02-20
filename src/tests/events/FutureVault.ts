import { Address } from "@graphprotocol/graph-ts"
import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as/assembly"

import {
    CurveFactoryChanged,
    CurvePoolDeployed,
    PTDeployed,
} from "../../../generated/Factory/Factory"
import { Deposit } from "../../../generated/templates/PrincipalToken/PrincipalToken"
import {
    handleCurveFactoryChange,
    handleCurvePoolDeployed,
    handleDeposit,
    handlePTDeployed,
} from "../../mappings/futures"
import {
    POOL_DEPLOY_TRANSACTION_HASH,
    FACTORY_ADDRESS_MOCK,
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
    CURVE_FACTORY_ADDRESS_MOCK,
    CURVE_OLD_FACTORY_ADDRESS_MOCK,
} from "../mocks/Factory"
import {
    DEPOSIT_TRANSACTION_HASH,
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
} from "../mocks/FutureVault"

export const SHARES_RETURN = 51
export const UNDERLYING_DEPOSIT = 15

export const emitFutureVaultDeployed = (futureVaultAddress: Address): void => {
    let futureVaultDeployedEvent = changetype<PTDeployed>(newMockEvent())
    futureVaultDeployedEvent.address = FACTORY_ADDRESS_MOCK

    let futureVaultParam = new ethereum.EventParam(
        "_futureVault",
        ethereum.Value.fromAddress(futureVaultAddress)
    )
    futureVaultDeployedEvent.parameters = [futureVaultParam]
    handlePTDeployed(futureVaultDeployedEvent)
}

export const emitDeposit = (
    timestamp: number = 0,
    sender: Address = FIRST_USER_MOCK
): Deposit => {
    let depositEvent = changetype<Deposit>(newMockEvent())
    depositEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
    depositEvent.transaction.hash = DEPOSIT_TRANSACTION_HASH
    depositEvent.logIndex = BigInt.fromI32(1)

    if (timestamp) {
        depositEvent.block.timestamp = BigInt.fromI32(timestamp as i32)
    }
    let senderParam = new ethereum.EventParam(
        "sender",
        ethereum.Value.fromAddress(sender)
    )

    let ownerParam = new ethereum.EventParam(
        "owner",
        ethereum.Value.fromAddress(sender)
    )

    let assetsParam = new ethereum.EventParam(
        "assets",
        ethereum.Value.fromI32(UNDERLYING_DEPOSIT)
    )

    let sharesParam = new ethereum.EventParam(
        "shares",
        ethereum.Value.fromI32(SHARES_RETURN)
    )

    depositEvent.parameters = [
        senderParam,
        ownerParam,
        assetsParam,
        sharesParam,
    ]

    handleDeposit(depositEvent)
    return depositEvent
}

export const emiCurveFactoryChanged = (): void => {
    let curveFactoryChangedEvent = changetype<CurveFactoryChanged>(
        newMockEvent()
    )
    curveFactoryChangedEvent.address = FACTORY_ADDRESS_MOCK

    let previousFactoryParam = new ethereum.EventParam(
        "previousFactory",
        ethereum.Value.fromAddress(CURVE_OLD_FACTORY_ADDRESS_MOCK)
    )

    let newFactoryParam = new ethereum.EventParam(
        "newFactory",
        ethereum.Value.fromAddress(CURVE_FACTORY_ADDRESS_MOCK)
    )

    curveFactoryChangedEvent.parameters = [
        previousFactoryParam,
        newFactoryParam,
    ]

    handleCurveFactoryChange(curveFactoryChangedEvent)
}

export const emitCurvePoolDeployed = (poolAddress: Address): void => {
    let curvePoolDeployedEvent = changetype<CurvePoolDeployed>(newMockEvent())

    curvePoolDeployedEvent.address = FACTORY_ADDRESS_MOCK
    curvePoolDeployedEvent.transaction.hash = POOL_DEPLOY_TRANSACTION_HASH

    let poolAddressParam = new ethereum.EventParam(
        "poolAddress",
        ethereum.Value.fromAddress(poolAddress)
    )

    let ibtParam = new ethereum.EventParam(
        "ibt",
        ethereum.Value.fromAddress(POOL_IBT_ADDRESS_MOCK)
    )
    let ptParam = new ethereum.EventParam(
        "pt",
        ethereum.Value.fromAddress(POOL_PT_ADDRESS_MOCK)
    )

    curvePoolDeployedEvent.parameters = [poolAddressParam, ibtParam, ptParam]

    handleCurvePoolDeployed(curvePoolDeployedEvent)
}
