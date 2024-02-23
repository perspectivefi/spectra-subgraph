import { Address } from "@graphprotocol/graph-ts"
import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as/assembly"

import {
    CurveFactoryChange,
    CurvePoolDeployed,
    PTDeployed,
} from "../../../generated/Factory/Factory"
import { Mint } from "../../../generated/templates/PrincipalToken/PrincipalToken"
import {
    handleCurveFactoryChange,
    handleCurvePoolDeployed,
    handleMint,
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

export const emitMint = (
    timestamp: number = 0,
    from: Address = FIRST_USER_MOCK
): Mint => {
    let mintEvent = changetype<Mint>(newMockEvent())
    mintEvent.address = FIRST_FUTURE_VAULT_ADDRESS_MOCK
    mintEvent.transaction.hash = DEPOSIT_TRANSACTION_HASH
    mintEvent.logIndex = BigInt.fromI32(1)

    if (timestamp) {
        mintEvent.block.timestamp = BigInt.fromI32(timestamp as i32)
    }
    let senderParam = new ethereum.EventParam(
        "from",
        ethereum.Value.fromAddress(from)
    )

    let ownerParam = new ethereum.EventParam(
        "to",
        ethereum.Value.fromAddress(from)
    )

    let amountParam = new ethereum.EventParam(
        "amount",
        ethereum.Value.fromI32(SHARES_RETURN)
    )

    mintEvent.parameters = [senderParam, ownerParam, amountParam]

    handleMint(mintEvent)
    return mintEvent
}

export const emiCurveFactoryChange = (): void => {
    let CurveFactoryChangeEvent = changetype<CurveFactoryChange>(newMockEvent())
    CurveFactoryChangeEvent.address = FACTORY_ADDRESS_MOCK

    let previousFactoryParam = new ethereum.EventParam(
        "previousFactory",
        ethereum.Value.fromAddress(CURVE_OLD_FACTORY_ADDRESS_MOCK)
    )

    let newFactoryParam = new ethereum.EventParam(
        "newFactory",
        ethereum.Value.fromAddress(CURVE_FACTORY_ADDRESS_MOCK)
    )

    CurveFactoryChangeEvent.parameters = [previousFactoryParam, newFactoryParam]

    handleCurveFactoryChange(CurveFactoryChangeEvent)
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
