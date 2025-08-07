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
 */
export function handleOrderFilled(event: OrderFilledEvent): void {
  logInfo('Handling OrderFilled event', [
    'orderHash: ' + event.params.orderHash.toHexString(),
    'actualMaking: ' + event.params.actualMaking.toString()
  ]);

  // Get or create OnChainOrderStatus entity
  let orderStatus = OnChainOrderStatus.load(event.params.orderHash.toHexString());
  if (orderStatus == null) {
    //Create Empty Order Status if no previous one exists
    orderStatus = new OnChainOrderStatus(event.params.orderHash.toHexString());
    orderStatus.orderHash = event.params.orderHash;
    orderStatus.totalFilled = BigInt.fromI32(0); //Create empty order with 0 filled if no previous one exists
    orderStatus.cancelled = false; //Not cancelled since order was just created
  }

  // Increment the total filled amount
  orderStatus.totalFilled = orderStatus.totalFilled.plus(event.params.actualMaking);
  orderStatus.updatedAt = event.block.timestamp;
  orderStatus.updatedAtBlock = event.block.number;

  orderStatus.save();
}

/**
 * Handle OrderCanceled event from LimitOrderEngine
 * This event is emitted when a limit order is canceled
 */
export function handleOrderCanceled(event: OrderCanceledEvent): void {
  logInfo('Handling OrderCanceled event', [
    'maker: ' + event.params.maker.toHexString(),
    'orderHash: ' + event.params.orderHash.toHexString()
  ]);

  // Get or create OnChainOrderStatus entity
  let orderStatus = OnChainOrderStatus.load(event.params.orderHash.toHexString());
  if (orderStatus == null) {
    //Create Empty Order Status if no previous one exists
    orderStatus = new OnChainOrderStatus(event.params.orderHash.toHexString());
    orderStatus.orderHash = event.params.orderHash;
    orderStatus.totalFilled = BigInt.fromI32(0); //Create empty order with 0 filled if no previous one exists
  }

  // Mark the order as cancelled
  orderStatus.cancelled = true;
  orderStatus.updatedAt = event.block.timestamp;
  orderStatus.updatedAtBlock = event.block.number;

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

