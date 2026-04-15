class TransactionType {
    FUTURE_VAULT_DEPOSIT: string = "FUTURE_VAULT_DEPOSIT"
    FUTURE_VAULT_WITHDRAW: string = "FUTURE_VAULT_WITHDRAW"
    AMM_ADD_LIQUIDITY: string = "AMM_ADD_LIQUIDITY"
    AMM_REMOVE_LIQUIDITY: string = "AMM_REMOVE_LIQUIDITY"
    AMM_REMOVE_LIQUIDITY_ONE: string = "AMM_REMOVE_LIQUIDITY_ONE"
    AMM_EXCHANGE: string = "AMM_EXCHANGE"
}

const transactionType = new TransactionType()
export default transactionType
