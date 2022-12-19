import { BigInt, ethereum } from "@graphprotocol/graph-ts/index"
import { newMockEvent } from "matchstick-as/assembly/index"

import { Deposit } from "../../../generated/FutureVault/FutureVault"
import {
    CurveFactoryChanged,
    CurvePoolDeployed,
    FutureVaultDeployed,
} from "../../../generated/FutureVaultFactory/FutureVaultFactory"
import {
    handleCurveFactoryChanged,
    handleCurvePoolDeployed,
    handleDeposit,
    handleFutureVaultDeployed,
} from "../../mappings/futures"
import {
    POOL_DEPLOY_TRANSACTION_HASH,
    FIRST_POOL_ADDRESS_MOCK,
    POOL_FACTORY_ADDRESS_MOCK,
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
} from "../mocks/CurvePoolFactory"
import {
    DEPOSIT_TRANSACTION_HASH,
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
} from "../mocks/FutureVault"

export const SHARES_RETURN = 51
export const IBT_DEPOSIT = 15

export const emitFutureVaultDeployed = (): void => {
    let futureVaultDeployedEvent = changetype<FutureVaultDeployed>(
        newMockEvent()
    )

    let futureVaultParam = new ethereum.EventParam(
        "_futureVault",
        ethereum.Value.fromAddress(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
    )
    futureVaultDeployedEvent.parameters = [futureVaultParam]
    handleFutureVaultDeployed(futureVaultDeployedEvent)

    futureVaultParam = new ethereum.EventParam(
        "_futureVault",
        ethereum.Value.fromAddress(SECOND_FUTURE_VAULT_ADDRESS_MOCK)
    )
    futureVaultDeployedEvent.parameters = [futureVaultParam]
    handleFutureVaultDeployed(futureVaultDeployedEvent)
}

export const emitDeposit = (timestamp: number = 0): Deposit => {
    let depositEvent = changetype<Deposit>(newMockEvent())
    depositEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
    depositEvent.transaction.hash = DEPOSIT_TRANSACTION_HASH
    if (timestamp) {
        depositEvent.block.timestamp = BigInt.fromI32(timestamp as i32)
    }
    let callerParam = new ethereum.EventParam(
        "caller",
        ethereum.Value.fromAddress(FIRST_FUTURE_VAULT_ADDRESS_MOCK)
    )

    let ownerParam = new ethereum.EventParam(
        "owner",
        ethereum.Value.fromAddress(FIRST_USER_MOCK)
    )

    let assetsParam = new ethereum.EventParam(
        "assets",
        ethereum.Value.fromI32(IBT_DEPOSIT)
    )

    let sharesParam = new ethereum.EventParam(
        "shares",
        ethereum.Value.fromI32(SHARES_RETURN)
    )

    depositEvent.parameters = [
        callerParam,
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

    curveFactoryChangedEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK

    let newFactoryParam = new ethereum.EventParam(
        "newFactory",
        ethereum.Value.fromAddress(POOL_FACTORY_ADDRESS_MOCK)
    )

    curveFactoryChangedEvent.parameters = [newFactoryParam]

    handleCurveFactoryChanged(curveFactoryChangedEvent)
}

export const emitCurvePoolDeployed = (): void => {
    let curvePoolDeployedEvent = changetype<CurvePoolDeployed>(newMockEvent())

    curvePoolDeployedEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
    curvePoolDeployedEvent.transaction.hash = POOL_DEPLOY_TRANSACTION_HASH

    let poolAddressParam = new ethereum.EventParam(
        "poolAddress",
        ethereum.Value.fromAddress(FIRST_POOL_ADDRESS_MOCK)
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
