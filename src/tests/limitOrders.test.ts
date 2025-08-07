import { describe, test, beforeAll, afterAll, clearStore, assert } from 'matchstick-as/assembly/index';
import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { UserNonce, OnChainOrderStatus } from '../../generated/schema';

describe('Limit Orders', () => {
  beforeAll(() => {
    clearStore();
  });

  afterAll(() => {
    clearStore();
  });

  describe('UserNonce Entity', () => {
    test('Should create UserNonce entity with correct fields', () => {
      let userAddress = Address.fromString('0x1234567890123456789012345678901234567890');
      let entityId = 'nonce-' + userAddress.toHexString();
      let latestNonce = BigInt.fromI32(10);
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      let entity = new UserNonce(entityId);
      entity.user = userAddress;
      entity.latestNonce = latestNonce;
      entity.updatedAt = timestamp;
      entity.updatedAtBlock = blockNumber;
      entity.save();
      
      assert.fieldEquals('UserNonce', entityId, 'user', userAddress.toHexString());
      assert.fieldEquals('UserNonce', entityId, 'latestNonce', latestNonce.toString());
      assert.fieldEquals('UserNonce', entityId, 'updatedAt', timestamp.toString());
      assert.fieldEquals('UserNonce', entityId, 'updatedAtBlock', blockNumber.toString());
    });
  });

  describe('OnChainOrderStatus Entity', () => {
    test('Should create OnChainOrderStatus entity with correct fields', () => {
      let orderHash = Bytes.fromHexString('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
      let entityId = orderHash.toHexString();
      let totalFilled = BigInt.fromI32(1000);
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      let entity = new OnChainOrderStatus(entityId);
      entity.orderHash = orderHash;
      entity.totalFilled = totalFilled;
      entity.cancelled = false;
      entity.updatedAt = timestamp;
      entity.updatedAtBlock = blockNumber;
      entity.save();
      
      assert.fieldEquals('OnChainOrderStatus', entityId, 'orderHash', orderHash.toHexString());
      assert.fieldEquals('OnChainOrderStatus', entityId, 'totalFilled', totalFilled.toString());
      assert.fieldEquals('OnChainOrderStatus', entityId, 'cancelled', 'false');
      assert.fieldEquals('OnChainOrderStatus', entityId, 'updatedAt', timestamp.toString());
      assert.fieldEquals('OnChainOrderStatus', entityId, 'updatedAtBlock', blockNumber.toString());
    });

    test('Should handle cancelled order status', () => {
      let orderHash = Bytes.fromHexString('0x1111111111111111111111111111111111111111111111111111111111111111');
      let entityId = orderHash.toHexString();
      
      let entity = new OnChainOrderStatus(entityId);
      entity.orderHash = orderHash;
      entity.totalFilled = BigInt.fromI32(0);
      entity.cancelled = true;
      entity.updatedAt = BigInt.fromI32(1234567890);
      entity.updatedAtBlock = BigInt.fromI32(12345);
      entity.save();
      
      assert.fieldEquals('OnChainOrderStatus', entityId, 'cancelled', 'true');
      assert.fieldEquals('OnChainOrderStatus', entityId, 'totalFilled', '0');
    });
  });
});