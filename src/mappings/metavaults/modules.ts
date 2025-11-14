import { log } from "@graphprotocol/graph-ts"

import {
    TimelockedTransactionAdded,
    MetavaultModule,
} from "../../../generated/schema"
import { GnosisSafeModule } from "../../../generated/templates"
import { EnabledModule } from "../../../generated/templates/GnosisSAFE/GnosisSAFE"
import { TransactionAdded } from "../../../generated/templates/GnosisSafeModule/GnosisSAFEModule"

export function handleEnabledModule(event: EnabledModule): void {
    const moduleAddress = event.params.module
    const metavaultModule = new MetavaultModule(moduleAddress)
    metavaultModule.address = moduleAddress
    metavaultModule.metavault = event.address.toHex()
    metavaultModule.save()
    GnosisSafeModule.create(moduleAddress)
}

export function handleTransactionAdded(event: TransactionAdded): void {
    const transactionAdded = new TimelockedTransactionAdded(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    transactionAdded.operator = event.transaction.from
    transactionAdded.delayModule = event.address
    const metavaultModule = MetavaultModule.load(event.address)
    if (metavaultModule === null) {
        log.warning("Module was not registered", [])
        return
    }
    transactionAdded.metavault = metavaultModule.metavault
    transactionAdded.queueNonce = event.params.queueNonce
    transactionAdded.timelockedTransactionHash = event.params.txHash
    transactionAdded.to = event.params.to
    transactionAdded.value = event.params.value
    transactionAdded.data = event.params.data
    transactionAdded.operation = event.params.operation
    transactionAdded.nonce = event.params.queueNonce
    transactionAdded.timestamp = event.block.timestamp
    transactionAdded.blockNumber = event.block.number
    transactionAdded.transactionHash = event.transaction.hash
    transactionAdded.logIndex = event.logIndex
    transactionAdded.delayModule = event.address
    transactionAdded.save()
}
