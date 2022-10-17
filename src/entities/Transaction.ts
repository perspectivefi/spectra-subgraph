import { Address, BigInt } from "@graphprotocol/graph-ts"

import { Future, Transaction } from "../../generated/schema"
import { ZERO_ADDRESS } from "../constants"
import { getUser } from "./User"

class CreateTransactionParams {
    transactionAddress: Address

    futureInTransaction: Address
    userInTransaction: Address

    amountsIn: string[]
    amountsOut: string[]

    transaction: TransactionDetails
}

class TransactionDetails {
    type: string

    timestamp: BigInt
    block: BigInt

    gas: BigInt
    gasPrice: BigInt
}

export function createTransaction(
    params: CreateTransactionParams
): Transaction {
    let transaction = new Transaction(params.transactionAddress.toHex())
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
        let user = getUser(
            params.userInTransaction.toHex(),
            params.transaction.timestamp
        )
        transaction.userInTransaction = user.id
    }

    // We have to compare it to an address as AssemblyScript do not support optional properties.
    if (params.futureInTransaction !== ZERO_ADDRESS) {
        let future = Future.load(params.futureInTransaction.toHex())
        transaction.futureInTransaction = future!.id
    }

    transaction.save()
    return transaction
}
