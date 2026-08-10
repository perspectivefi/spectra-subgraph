import { Address, log } from "@graphprotocol/graph-ts"

import {
    TimelockedTransactionAdded,
    MetavaultModule,
    MetavaultTransaction,
} from "../../../generated/schema"
import { GnosisSafeModule } from "../../../generated/templates"
import { EnabledModule, SafeModuleTransaction, SafeMultiSigTransaction } from "../../../generated/templates/GnosisSafe/GnosisSAFE"
import { TransactionAdded } from "../../../generated/templates/GnosisSafeModule/GnosisSAFEModule"


function getModule(moduleAddress: Address, metavaultAddress: Address): MetavaultModule | null {
    const module = MetavaultModule.load(moduleAddress)
    if (!module) {
        const newModule = new MetavaultModule(moduleAddress)
        newModule.address = moduleAddress
        newModule.metavault = metavaultAddress.toHex()
        newModule.save()
        return newModule
    }
    return module
}

export function handleEnabledModule(event: EnabledModule): void {
    const moduleAddress = event.params.module
    const metavaultAddress = event.address
    const module = getModule(moduleAddress, metavaultAddress)
    if (!module) {
        throw new Error("Module not found")
    }
    GnosisSafeModule.create(moduleAddress)
}

export function handleSafeModuleTransaction(event: SafeModuleTransaction): void {
    const transaction = new MetavaultTransaction(event.transaction.hash.concatI32(event.logIndex.toI32()))
    const module = getModule(event.params.module, event.address)
    if (!module) {
        throw new Error("Module not found")
    }
    transaction.module = module.id
    transaction.metavault = module.metavault
    transaction.to = event.params.to
    transaction.value = event.params.value
    transaction.data = event.params.data
    transaction.operation = event.params.operation
    transaction.timestamp = event.block.timestamp
    transaction.blockNumber = event.block.number
    transaction.transactionHash = event.transaction.hash
    transaction.logIndex = event.logIndex
    transaction.save()
}

export function handleSafeMultiSigTransaction(event: SafeMultiSigTransaction): void {
    const transaction = new MetavaultTransaction(event.transaction.hash.concatI32(event.logIndex.toI32()))
    transaction.metavault = event.address.toHex()
    transaction.to = event.params.to
    transaction.value = event.params.value
    transaction.data = event.params.data
    transaction.operation = event.params.operation
    transaction.timestamp = event.block.timestamp
    transaction.blockNumber = event.block.number
    transaction.transactionHash = event.transaction.hash
    transaction.logIndex = event.logIndex
    transaction.save()
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
