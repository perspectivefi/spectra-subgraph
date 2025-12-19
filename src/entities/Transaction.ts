import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

import { Future, Metavault, Transaction } from "../../generated/schema"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"
import { getAccount } from "./Account"

class CreateTransactionParams {
    id: string
    transactionAddress: Bytes

    futureInTransaction: Address
    userInTransaction: Address
    poolInTransaction: Address
    metavaultInTransaction: Address

    amountsIn: string[]
    amountsOut: string[]
    valueUnderlying: BigInt
    feeUnderlying: BigInt
    feeRatio: BigInt

    transaction: TransactionDetails

    ibtRate: BigInt
    ptRate: BigInt

    // Metavault-specific optional fields
    metavaultEpochId: BigInt
    metavaultShares: BigInt
    metavaultAssets: BigInt
}

class TransactionDetails {
    type: string

    timestamp: BigInt
    block: BigInt

    gas: BigInt
    gasPrice: BigInt

    fee: BigInt
    adminFee: BigInt
}

export function createTransaction(
    params: CreateTransactionParams
): Transaction {
    let transaction = new Transaction(params.id)
    transaction.createdAtTimestamp = params.transaction.timestamp
    transaction.address = params.transactionAddress
    transaction.block = params.transaction.block
    transaction.type = params.transaction.type

    transaction.gas = params.transaction.gas
    transaction.gasPrice = params.transaction.gasPrice

    transaction.amountsIn = params.amountsIn
    transaction.amountsOut = params.amountsOut

    // We have to compare it to an address as AssemblyScript do not support optional properties.
    if (params.userInTransaction !== ZERO_ADDRESS) {
        let account = getAccount(
            params.userInTransaction.toHex(),
            params.transaction.timestamp
        )
        transaction.userInTransaction = account.id
    }

    if (params.futureInTransaction !== ZERO_ADDRESS) {
        let future = Future.load(params.futureInTransaction.toHex())
        if (future) {
            transaction.futureInTransaction = future.id
        }
    }

    if (params.poolInTransaction !== ZERO_ADDRESS) {
        transaction.poolInTransaction = params.poolInTransaction.toHex()
    }

    if (params.metavaultInTransaction !== ZERO_ADDRESS) {
        let metavault = Metavault.load(params.metavaultInTransaction.toHex())
        if (metavault) {
            transaction.metavaultInTransaction = metavault.id
        }
    }

    if (params.transaction.fee !== ZERO_BI) {
        transaction.fee = params.transaction.fee
    }

    if (params.transaction.adminFee !== ZERO_BI) {
        transaction.adminFee = params.transaction.adminFee
    }

    transaction.valueUnderlying = params.valueUnderlying

    transaction.feeUnderlying = params.feeUnderlying
    transaction.feeRatio = params.feeRatio

    // Set optional metavault-specific fields if provided
    if (params.metavaultEpochId !== ZERO_BI) {
        transaction.metavaultEpochId = params.metavaultEpochId
    }

    if (params.metavaultShares !== ZERO_BI) {
        transaction.metavaultShares = params.metavaultShares
    }

    if (params.metavaultAssets !== ZERO_BI) {
        transaction.metavaultAssets = params.metavaultAssets
    }

    transaction.save()
    return transaction
}
