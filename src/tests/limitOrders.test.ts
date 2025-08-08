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
      let orderHash = Bytes.fromHexString('0x1111111111111111111111111111111111111111111111111111111111111111'); //Random order hash
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
      let orderHash = Bytes.fromHexString('0x1111111111111111111111111111111111111111111111111111111111111111'); //Random order hash
      let entityId = orderHash.toHexString();
      let totalFilled = BigInt.fromI32(500);
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      let entity = new OnChainOrderStatus(entityId);
      entity.orderHash = orderHash;
      entity.totalFilled = totalFilled;
      entity.cancelled = true; // Order is cancelled
      entity.updatedAt = timestamp;
      entity.updatedAtBlock = blockNumber;
      entity.save();
      
      assert.fieldEquals('OnChainOrderStatus', entityId, 'orderHash', orderHash.toHexString());
      assert.fieldEquals('OnChainOrderStatus', entityId, 'totalFilled', totalFilled.toString());
      assert.fieldEquals('OnChainOrderStatus', entityId, 'cancelled', 'true');
      assert.fieldEquals('OnChainOrderStatus', entityId, 'updatedAt', timestamp.toString());
      assert.fieldEquals('OnChainOrderStatus', entityId, 'updatedAtBlock', blockNumber.toString());
    });
  });

  describe('Performance and Edge Cases', () => {
    test('Should handle multiple order status entities efficiently', () => {
      // Test creating multiple order status entities to simulate high volume
      let baseOrderHash = '0x1111111111111111111111111111111111111111111111111111111111111';
      let fillAmount = BigInt.fromI32(100);
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      for (let i = 0; i < 10; i++) {
        let orderHash = Bytes.fromHexString(baseOrderHash + i.toString().padStart(3, '0'));
        let entityId = orderHash.toHexString();
        
        let entity = new OnChainOrderStatus(entityId);
        entity.orderHash = orderHash;
        entity.totalFilled = fillAmount;
        entity.cancelled = false;
        entity.updatedAt = timestamp;
        entity.updatedAtBlock = blockNumber;
        entity.save();
        
        // Verify each entity was created correctly
        assert.fieldEquals('OnChainOrderStatus', entityId, 'totalFilled', fillAmount.toString());
        assert.fieldEquals('OnChainOrderStatus', entityId, 'cancelled', 'false');
      }
    });

    test('Should handle zero fill amounts', () => {
      let orderHash = Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000001'); //Random order hash
      let entityId = orderHash.toHexString();
      let zeroFill = BigInt.fromI32(0);
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      let entity = new OnChainOrderStatus(entityId);
      entity.orderHash = orderHash;
      entity.totalFilled = zeroFill;
      entity.cancelled = false;
      entity.updatedAt = timestamp;
      entity.updatedAtBlock = blockNumber;
      entity.save();
      
      assert.fieldEquals('OnChainOrderStatus', entityId, 'totalFilled', '0');
      assert.fieldEquals('OnChainOrderStatus', entityId, 'cancelled', 'false');
    });

    test('Should handle large fill amounts', () => {
      let orderHash = Bytes.fromHexString('0x9999999999999999999999999999999999999999999999999999999999999999'); //Random order hash
      let entityId = orderHash.toHexString();
      let largeFill = BigInt.fromString('1000000000000000000000'); // 1000 tokens with 18 decimals
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      let entity = new OnChainOrderStatus(entityId);
      entity.orderHash = orderHash;
      entity.totalFilled = largeFill;
      entity.cancelled = false;
      entity.updatedAt = timestamp;
      entity.updatedAtBlock = blockNumber;
      entity.save();
      
      assert.fieldEquals('OnChainOrderStatus', entityId, 'totalFilled', largeFill.toString());
      assert.fieldEquals('OnChainOrderStatus', entityId, 'cancelled', 'false');
    });

    test('Should handle accumulative fills simulation', () => {
      let orderHash = Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000001'); //Random order hash
      let entityId = orderHash.toHexString();
      let firstFill = BigInt.fromI32(500);
      let secondFill = BigInt.fromI32(300);
      let expectedTotal = firstFill.plus(secondFill);
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      // Simulate first fill
      let entity = new OnChainOrderStatus(entityId);
      entity.orderHash = orderHash;
      entity.totalFilled = firstFill;
      entity.cancelled = false;
      entity.updatedAt = timestamp;
      entity.updatedAtBlock = blockNumber;
      entity.save();
      
      // Load and update with second fill (simulating handler behavior)
      let loadedEntity = OnChainOrderStatus.load(entityId);
      if (loadedEntity != null) {
        loadedEntity.totalFilled = loadedEntity.totalFilled.plus(secondFill);
        loadedEntity.save();
      }
      
      // Verify total is accumulated correctly
      assert.fieldEquals('OnChainOrderStatus', entityId, 'totalFilled', expectedTotal.toString());
    });
  });

  describe('UserNonce Performance Tests', () => {
    test('Should handle multiple user nonces efficiently', () => {
      let baseUserAddress = '0x111111111111111111111111111111111111111';
      let nonce = BigInt.fromI32(5);
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      for (let i = 0; i < 5; i++) {
        let userAddress = Address.fromString(baseUserAddress + i.toString());
        let entityId = 'nonce-' + userAddress.toHexString();
        let userNonce = nonce.plus(BigInt.fromI32(i));
        
        let entity = new UserNonce(entityId);
        entity.user = userAddress;
        entity.latestNonce = userNonce;
        entity.updatedAt = timestamp;
        entity.updatedAtBlock = blockNumber;
        entity.save();
        
        // Verify each nonce entity was created correctly
        assert.fieldEquals('UserNonce', entityId, 'user', userAddress.toHexString());
        assert.fieldEquals('UserNonce', entityId, 'latestNonce', userNonce.toString());
      }
    });

    test('Should handle nonce updates simulation', () => {
      let userAddress = Address.fromString('0x9876543210987654321098765432109876543210'); //random address
      let entityId = 'nonce-' + userAddress.toHexString();
      let initialNonce = BigInt.fromI32(5);
      let updatedNonce = BigInt.fromI32(10);
      let timestamp = BigInt.fromI32(1234567890);
      let blockNumber = BigInt.fromI32(12345);
      
      // Create initial nonce
      let entity = new UserNonce(entityId);
      entity.user = userAddress;
      entity.latestNonce = initialNonce;
      entity.updatedAt = timestamp;
      entity.updatedAtBlock = blockNumber;
      entity.save();
      
      // Load and update nonce (simulating handler behavior)
      let loadedEntity = UserNonce.load(entityId);
      if (loadedEntity != null) {
        loadedEntity.latestNonce = updatedNonce;
        loadedEntity.save();
      }
      
      // Verify nonce was updated correctly
      assert.fieldEquals('UserNonce', entityId, 'latestNonce', updatedNonce.toString());
    });
  });
});