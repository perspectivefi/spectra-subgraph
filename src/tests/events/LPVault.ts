import { ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as"

import { LPVDeployed } from "../../../generated/Factory/Factory"
import { handleLPVDeployed } from "../../mappings/futures"
import { FIRST_POOL_ADDRESS_MOCK } from "../mocks/CurvePool"
import { FACTORY_ADDRESS_MOCK } from "../mocks/Factory"
import {
    LP_VAULT_ADDRESS_MOCK,
    PRINCIPAL_TOKEN_ADDRESS_MOCK,
} from "../mocks/LPVault"

export const emitLPVDeployed = (): void => {
    let lpVaultDeployedEvent = changetype<LPVDeployed>(newMockEvent())
    lpVaultDeployedEvent.address = FACTORY_ADDRESS_MOCK

    let lpvParam = new ethereum.EventParam(
        "lpv",
        ethereum.Value.fromAddress(LP_VAULT_ADDRESS_MOCK)
    )

    let curvePoolParam = new ethereum.EventParam(
        "curvePool",
        ethereum.Value.fromAddress(FIRST_POOL_ADDRESS_MOCK)
    )

    let ptParam = new ethereum.EventParam(
        "pt",
        ethereum.Value.fromAddress(PRINCIPAL_TOKEN_ADDRESS_MOCK)
    )

    lpVaultDeployedEvent.parameters = [lpvParam, curvePoolParam, ptParam]
    handleLPVDeployed(lpVaultDeployedEvent)
}
