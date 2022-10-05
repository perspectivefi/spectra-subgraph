import { Address, BigInt } from "@graphprotocol/graph-ts"

import { AssetAmount, Future, Transaction, User } from "../../generated/schema"
import { getUser } from "./User"

class getTransactionParams {
    transactionAddress: Address

    fromAddress: Address
    toAddress: Address

    userInTransaction: Address
    // futureInTransaction: Address

    amountIn: BigInt
    amountOut: BigInt

    // assetIn: Address
    // assetOut: Address

    transaction: TransactionDetails
}

class TransactionDetails {
    type: string

    timestamp: BigInt
    block: BigInt

    gas: BigInt
    gasPrice: BigInt
}

export function createTransaction(params: getTransactionParams): Transaction {
    let transaction = new Transaction(params.transactionAddress.toHex())
    transaction.createdAtTimestamp = params.transaction.timestamp
    transaction.address = params.transactionAddress
    transaction.block = params.transaction.block

    transaction.gas = params.transaction.gas
    transaction.gasPrice = params.transaction.gasPrice
    // // // transaction.fee: BigDecimal!
    transaction.type = params.transaction.type

    transaction.from = params.fromAddress
    transaction.to = params.toAddress

    transaction.amountIn = params.amountIn
    transaction.amountOut = params.amountOut

    let user = getUser(
        params.userInTransaction.toHex(),
        params.transaction.timestamp
    )

    transaction.userInTransaction = user.id
    // transaction.futureInTransaction = params.futureInTransaction.toHex()

    transaction.save()
    return transaction
}
