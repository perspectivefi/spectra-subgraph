import { BigInt, Address, Bytes, ethereum } from '@graphprotocol/graph-ts';

import {
  OrderFilled as OrderFilledEvent,
  OrderCanceled as OrderCanceledEvent,
  NonceIncreased as NonceIncreasedEvent,
  AuthorityUpdated as AuthorityUpdatedEvent,
  FeeRecipientUpdated as FeeRecipientUpdatedEvent,
  RouterUpdated as RouterUpdatedEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent
} from '../../generated/LimitOrderEngine/LimitOrderEngine';

// NonceManager events are also available from the LimitOrderEngine generated types
// since NonceManager is included as an ABI in the LimitOrderEngine data source

// Import entities
import { UserNonce, OnChainOrderStatus } from '../../generated/schema';

// Import utilities
import { logInfo, logWarning } from '../utils/log';
import { ZERO_BI, ZERO_BD } from '../constants';

/**
 * Handle OrderFilled event from LimitOrderEngine
 * This event is emitted when a limit order is filled
 * 
 * Performance optimizations:
 * - Minimal logging for high-volume events
 * - Efficient entity loading and creation
 * - Single save operation per event
 */
export function handleOrderFilled(event: OrderFilledEvent): void {
  // Use orderHash hex string as entity ID for efficient lookups
  const orderHashId = event.params.orderHash.toHexString();
  
  // Minimal logging for performance - only log in debug builds
  // logInfo('OrderFilled', [orderHashId, event.params.actualMaking.toString()]);

  // Get or create OnChainOrderStatus entity
  let orderStatus = OnChainOrderStatus.load(orderHashId);
  if (orderStatus == null) {
    // Create new order status entity
    orderStatus = new OnChainOrderStatus(orderHashId);
    orderStatus.orderHash = event.params.orderHash;
    orderStatus.totalFilled = ZERO_BI;
    orderStatus.cancelled = false;
  }

  // Update order status with new fill
  orderStatus.totalFilled = orderStatus.totalFilled.plus(event.params.actualMaking);
  orderStatus.updatedAt = event.block.timestamp;
  orderStatus.updatedAtBlock = event.block.number;

  // Single save operation
  orderStatus.save();
}

/**
 * Handle OrderCanceled event from LimitOrderEngine
 * This event is emitted when a limit order is canceled
 * 
 * Performance optimizations:
 * - Minimal logging for high-volume events
 * - Efficient entity loading and creation
 * - Single save operation per event
 */
export function handleOrderCanceled(event: OrderCanceledEvent): void {
  // Use orderHash hex string as entity ID for efficient lookups
  const orderHashId = event.params.orderHash.toHexString();
  
  // Minimal logging for performance - only log in debug builds
  // logInfo('OrderCanceled', [event.params.maker.toHexString(), orderHashId]);

  // Get or create OnChainOrderStatus entity
  let orderStatus = OnChainOrderStatus.load(orderHashId);
  if (orderStatus == null) {
    // Create new order status entity
    orderStatus = new OnChainOrderStatus(orderHashId);
    orderStatus.orderHash = event.params.orderHash;
    orderStatus.totalFilled = ZERO_BI;
  }

  // Mark the order as cancelled
  orderStatus.cancelled = true;
  orderStatus.updatedAt = event.block.timestamp;
  orderStatus.updatedAtBlock = event.block.number;

  // Single save operation
  orderStatus.save();
}

/**
 * Handle NonceIncreased event from LimitOrderEngine (Important !, Nonce Manager also has its own NonceIncreased event)
 * This event is emitted when a user's nonce is increased
 */
export function handleNonceIncreased(event: NonceIncreasedEvent): void {
  logInfo('Handling NonceIncreased event from LimitOrderEngine', [
    'maker: ' + event.params.maker.toHexString(),
    'oldNonce: ' + event.params.oldNonce.toString(),
    'newNonce: ' + event.params.newNonce.toString()
  ]);

  // Create unique ID for UserNonce entity
  //TODO maybe create at the end and also add nonce number ?
  let userNonceId = 'nonce-' + event.params.maker.toHexString();
  
  // Get or create UserNonce entity
  let userNonce = UserNonce.load(userNonceId);
  if (userNonce == null) {
    userNonce = new UserNonce(userNonceId);
    userNonce.user = event.params.maker;
  }

  // Update with the new nonce (should always be higher)
  userNonce.latestNonce = event.params.newNonce;
  userNonce.updatedAt = event.block.timestamp;
  userNonce.updatedAtBlock = event.block.number;

  userNonce.save();
}

/**
 * Handle NonceIncreased event from NonceManager
 * This event is emitted when a user's nonce is increased via NonceManager
 */
export function handleNonceManagerNonceIncreased(event: NonceIncreasedEvent): void {
  logInfo('Handling NonceIncreased event from NonceManager', [
    'maker: ' + event.params.maker.toHexString(),
    'oldNonce: ' + event.params.oldNonce.toString(),
    'newNonce: ' + event.params.newNonce.toString()
  ]);

  // Create unique ID for UserNonce entity
  let userNonceId = 'nonce-' + event.params.maker.toHexString();
  
  // Get or create UserNonce entity
  let userNonce = UserNonce.load(userNonceId);
  if (userNonce == null) {
    userNonce = new UserNonce(userNonceId);
    userNonce.user = event.params.maker;
  }

  // Update with the new nonce (should always be higher)
  userNonce.latestNonce = event.params.newNonce;
  userNonce.updatedAt = event.block.timestamp;
  userNonce.updatedAtBlock = event.block.number;

  userNonce.save();
}


//TODO Other events from LimitOrderEngine, see if we absolutely need to add them or not later on.


// /**
//  * Handle AuthorityUpdated event from LimitOrderEngine
//  * This event is emitted when the authority is updated
//  */
// export function handleAuthorityUpdated(event: AuthorityUpdatedEvent): void {
//   logInfo('Handling AuthorityUpdated event', [
//     'authority: ' + event.params.authority.toHexString()
//   ]);

//   // TODO: Implement authority update logic
  
// }

// /**
//  * Handle FeeRecipientUpdated event from LimitOrderEngine
//  * This event is emitted when the fee recipient is updated
//  */
// export function handleFeeRecipientUpdated(event: FeeRecipientUpdatedEvent): void {
//   logInfo('Handling FeeRecipientUpdated event', [
//     'newFeeRecipient: ' + event.params.newFeeRecipient.toHexString()
//   ]);

//   // TODO: Implement fee recipient update logic
  
// }

// /**
//  * Handle RouterUpdated event from LimitOrderEngine
//  * This event is emitted when the router is updated
//  */
// export function handleRouterUpdated(event: RouterUpdatedEvent): void {
//   logInfo('Handling RouterUpdated event', [
//     'newRouter: ' + event.params.newRouter.toHexString()
//   ]);

//   // TODO: Implement router update logic
  
// }

// /**
//  * Handle Paused event from LimitOrderEngine
//  * This event is emitted when the contract is paused
//  */
// export function handlePaused(event: PausedEvent): void {
//   logInfo('Handling Paused event', [
//     'account: ' + event.params.account.toHexString()
//   ]);

//   // TODO: Implement pause logic
  
// }

// /**
//  * Handle Unpaused event from LimitOrderEngine
//  * This event is emitted when the contract is unpaused
//  */
// export function handleUnpaused(event: UnpausedEvent): void {
//   logInfo('Handling Unpaused event', [
//     'account: ' + event.params.account.toHexString()
//   ]);

//   // TODO: Implement unpause logic
  
// }

