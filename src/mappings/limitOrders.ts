import {
    OrderFilled as OrderFilledEvent,
    OrderCanceled as OrderCanceledEvent,
    OrderPreSigned as OrderPreSignedEvent,
    LimitOrderFeeUpdated as LimitOrderFeeUpdatedEvent,
    NonceIncreased as NonceIncreasedEvent,
    AuthorityUpdated as AuthorityUpdatedEvent,
    FeeRecipientUpdated as FeeRecipientUpdatedEvent,
    RouterUpdated as RouterUpdatedEvent,
    Paused as PausedEvent,
    Unpaused as UnpausedEvent,
} from "../../generated/LimitOrderEngine/LimitOrderEngine"
// NonceIncreased comes from the LimitOrderEngine ABI directly:
// the engine inherits NonceManager (same contract, same address)
// Import entities
import {
    UserNonce,
    OnChainOrderStatus,
    LimitOrderFee,
} from "../../generated/schema"
import { ZERO_BI } from "../constants"
// Import utilities
import { logInfo } from "../utils/log"

/**
 * Handle OrderFilled event from LimitOrderEngine
 * This event is emitted when a limit order is filled
 */
export function handleOrderFilled(event: OrderFilledEvent): void {
    // Use orderHash hex string as entity ID for efficient lookups
    const orderHashId = event.params.orderHash.toHexString()

    // Minimal logging for performance - only log in debug builds
    // logInfo('OrderFilled', [orderHashId, event.params.actualMaking.toString()]);

    // Get or create OnChainOrderStatus entity
    let orderStatus = OnChainOrderStatus.load(orderHashId)
    if (orderStatus == null) {
        // Create new order status entity
        orderStatus = new OnChainOrderStatus(orderHashId)
        orderStatus.orderHash = event.params.orderHash
        orderStatus.totalFilled = ZERO_BI
        orderStatus.cancelled = false
        // isPreSigned is deliberately left unset: null means "presign status
        // unknown" (entity copied by a graft, or first seen via a fill) —
        // writing false here would claim knowledge we don't have
    }

    // Update order status with new fill
    orderStatus.totalFilled = orderStatus.totalFilled.plus(
        event.params.actualMaking
    )
    orderStatus.updatedAt = event.block.timestamp
    orderStatus.updatedAtBlock = event.block.number

    // Single save operation
    orderStatus.save()
}

/**
 * Handle OrderCanceled event from LimitOrderEngine
 * This event is emitted when a limit order is canceled
 */
export function handleOrderCanceled(event: OrderCanceledEvent): void {
    // Use orderHash hex string as entity ID for efficient lookups
    const orderHashId = event.params.orderHash.toHexString()

    // Minimal logging for performance - only log in debug builds
    // logInfo('OrderCanceled', [event.params.maker.toHexString(), orderHashId]);

    // Get or create OnChainOrderStatus entity
    let orderStatus = OnChainOrderStatus.load(orderHashId)
    if (orderStatus == null) {
        // Create new order status entity
        orderStatus = new OnChainOrderStatus(orderHashId)
        orderStatus.orderHash = event.params.orderHash
        orderStatus.totalFilled = ZERO_BI
        // isPreSigned deliberately left unset (null = unknown), see handleOrderFilled
    }

    // Mark the order as cancelled
    orderStatus.cancelled = true
    orderStatus.updatedAt = event.block.timestamp
    orderStatus.updatedAtBlock = event.block.number

    // Single save operation
    orderStatus.save()
}

/**
 * Handle OrderPreSigned event from LimitOrderEngine
 * Emitted when a maker registers an order on-chain via preSignSingle/preSignBatch,
 * allowing fillers to skip EIP-712 signature verification.
 * Fires before any fill, so totalFilled is ZERO_BI when the entity is first created here.
 */
export function handleOrderPreSigned(event: OrderPreSignedEvent): void {
    // Use orderHash hex string as entity ID for efficient lookups
    const orderHashId = event.params.orderHash.toHexString()

    // Get or create OnChainOrderStatus entity
    let orderStatus = OnChainOrderStatus.load(orderHashId)
    if (orderStatus == null) {
        orderStatus = new OnChainOrderStatus(orderHashId)
        orderStatus.orderHash = event.params.orderHash
        orderStatus.totalFilled = ZERO_BI
        orderStatus.cancelled = false
    }

    // Mark the order as pre-signed (registered on-chain)
    orderStatus.isPreSigned = true
    orderStatus.updatedAt = event.block.timestamp
    orderStatus.updatedAtBlock = event.block.number

    orderStatus.save()
}

/**
 * Handle LimitOrderFeeUpdated event from LimitOrderEngine
 * Emitted when the protocol limit-order fee is updated via setLimitOrderFee.
 * Tracked as a singleton entity holding the current and previous fee (18-decimal WAD).
 * The event only carries newFee, so previousFee is derived from the stored value.
 */
export function handleLimitOrderFeeUpdated(
    event: LimitOrderFeeUpdatedEvent
): void {
    // Singleton entity for the protocol-wide limit-order fee
    let fee = LimitOrderFee.load("limit-order-fee")
    if (fee == null) {
        fee = new LimitOrderFee("limit-order-fee")
        fee.previousFee = ZERO_BI
    } else {
        // Carry the prior current value into previousFee before overwriting
        fee.previousFee = fee.currentFee
    }

    fee.currentFee = event.params.newFee
    fee.updatedAt = event.block.timestamp
    fee.updatedAtBlock = event.block.number

    fee.save()
}

/**
 * Handle NonceIncreased event from LimitOrderEngine (Important !, Nonce Manager also has its own NonceIncreased event)
 * This event is emitted when a user's nonce is increased
 */
export function handleNonceIncreased(event: NonceIncreasedEvent): void {
    logInfo("Handling NonceIncreased event from LimitOrderEngine", [
        "maker: " + event.params.maker.toHexString(),
        "oldNonce: " + event.params.oldNonce.toString(),
        "newNonce: " + event.params.newNonce.toString(),
    ])

    // Create unique ID for UserNonce entity
    //TODO maybe create at the end and also add nonce number ?
    let userNonceId = "nonce-" + event.params.maker.toHexString()

    // Get or create UserNonce entity
    let userNonce = UserNonce.load(userNonceId)
    if (userNonce == null) {
        userNonce = new UserNonce(userNonceId)
        userNonce.user = event.params.maker
    }

    // Update with the new nonce (should always be higher)
    userNonce.latestNonce = event.params.newNonce
    userNonce.updatedAt = event.block.timestamp
    userNonce.updatedAtBlock = event.block.number

    userNonce.save()
}


/**
 * Handle AuthorityUpdated event from LimitOrderEngine
 * This event is emitted when the authority is updated
 */
export function handleAuthorityUpdated(event: AuthorityUpdatedEvent): void {
    logInfo("Handling AuthorityUpdated event", [
        "authority: " + event.params.authority.toHexString(),
    ])

    // For now, just log the event. Can be extended later to track authority changes
}

/**
 * Handle FeeRecipientUpdated event from LimitOrderEngine
 * This event is emitted when the fee recipient is updated
 */
export function handleFeeRecipientUpdated(
    event: FeeRecipientUpdatedEvent
): void {
    logInfo("Handling FeeRecipientUpdated event", [
        "newFeeRecipient: " + event.params.newFeeRecipient.toHexString(),
    ])

    // For now, just log the event. Can be extended later to track fee recipient changes
}

/**
 * Handle RouterUpdated event from LimitOrderEngine
 * This event is emitted when the router is updated
 */
export function handleRouterUpdated(event: RouterUpdatedEvent): void {
    logInfo("Handling RouterUpdated event", [
        "newRouter: " + event.params.newRouter.toHexString(),
    ])

    // For now, just log the event. Can be extended later to track router changes
}

/**
 * Handle Paused event from LimitOrderEngine
 * This event is emitted when the contract is paused
 */
export function handlePaused(event: PausedEvent): void {
    logInfo("Handling Paused event", [
        "account: " + event.params.account.toHexString(),
    ])

    // For now, just log the event. Can be extended later to track pause state
}

/**
 * Handle Unpaused event from LimitOrderEngine
 * This event is emitted when the contract is unpaused
 */
export function handleUnpaused(event: UnpausedEvent): void {
    logInfo("Handling Unpaused event", [
        "account: " + event.params.account.toHexString(),
    ])

    // For now, just log the event. Can be extended later to track pause state
}
