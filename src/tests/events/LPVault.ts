import { ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as"

import { LPVaultDeployed } from "../../../generated/LPVaultFactory/LPVaultFactory"
import { handleLPVaultDeployed } from "../../mappings/lpVaults"
import {
    IMPLEMENTATION_ADDRESS_MOCK,
    LP_VAULT_ADDRESS_MOCK,
    PRINCIPAL_TOKEN_ADDRESS_MOCK,
} from "../mocks/LPVault"
import { NEW_LP_VAULT_FACTORY_ADDRESS_MOCK } from "../mocks/LPVaultFactory"

export const emitLPVaultDeployed = (): void => {
    let lpVaultDeployedEvent = changetype<LPVaultDeployed>(newMockEvent())
    lpVaultDeployedEvent.address = NEW_LP_VAULT_FACTORY_ADDRESS_MOCK

    let lpVaultParam = new ethereum.EventParam(
        "lpVault",
        ethereum.Value.fromAddress(LP_VAULT_ADDRESS_MOCK)
    )

    let implementationParam = new ethereum.EventParam(
        "implementation",
        ethereum.Value.fromAddress(IMPLEMENTATION_ADDRESS_MOCK)
    )

    let principalTokenParam = new ethereum.EventParam(
        "principalToken",
        ethereum.Value.fromAddress(PRINCIPAL_TOKEN_ADDRESS_MOCK)
    )

    lpVaultDeployedEvent.parameters = [
        lpVaultParam,
        implementationParam,
        principalTokenParam,
    ]
    handleLPVaultDeployed(lpVaultDeployedEvent)
}
