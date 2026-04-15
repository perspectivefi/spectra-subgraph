import { Address, ByteArray, crypto } from "@graphprotocol/graph-ts"

import { StepDeployed } from "../../../generated/MetaVaultFactory/MetaVaultFactory"
import {
    MetavaultWrapper,
    AmphorAsyncVault,
    GnosisSafe,
    GnosisSafeModule,
    ERC20,
} from "../../../generated/templates"
import { ZERO_ADDRESS } from "../../constants"
import { getMetavault } from "../../entities/Metavault"

const VAULT_PIPELINE = crypto.keccak256(ByteArray.fromUTF8("vault"))
const SAFE_PIPELINE = crypto.keccak256(ByteArray.fromUTF8("safe"))
const REGISTRY_PIPELINE = crypto.keccak256(ByteArray.fromUTF8("registry"))

export function handleStepDeployed(event: StepDeployed): void {
    let safe = event.params.safe
    if (safe.equals(Address.zero())) return

    let safeAddress = safe
    let pipelineId = event.params.pipelineId
    let contracts = event.params.contracts
    let safeModule = event.params.safeModule

    let metavault = getMetavault(
        safeAddress,
        event.block.timestamp,
        event.block.number
    )

    metavault.factory = event.address
    metavault.deployedAtBlock = event.block.number
    metavault.deployedAtTimestamp = event.block.timestamp
    metavault.save()

    // NOTE: Template creation is idempotent in The Graph — creating a template
    // for an already-tracked address is a no-op. This is safe even when both
    // StepDeployed and EnabledModule events fire in the same transaction.
    if (pipelineId == VAULT_PIPELINE && contracts.length >= 2) {
        // contracts[0] = AsyncVault (infravault), contracts[1] = MetaVaultWrapper
        MetavaultWrapper.create(contracts[1])
        AmphorAsyncVault.create(contracts[0])
        GnosisSafe.create(safeAddress)
        ERC20.create(contracts[1])
    } else if (pipelineId == SAFE_PIPELINE && contracts.length >= 1) {
        GnosisSafe.create(contracts[0])
    } else if (
        pipelineId != VAULT_PIPELINE &&
        pipelineId != SAFE_PIPELINE &&
        pipelineId != REGISTRY_PIPELINE
    ) {
        // Zodiac pipeline: spawn module template if safeModule is non-zero
        if (safeModule != ZERO_ADDRESS) {
            GnosisSafeModule.create(safeModule)
        }
    }
}
