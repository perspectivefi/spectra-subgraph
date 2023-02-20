import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { FutureVaultFactory } from "../../generated/schema"
import { ZERO_ADDRESS } from "../constants"

export function createFutureVaultFactory(
    address: Address,
    timestamp: BigInt
): FutureVaultFactory {
    let newContract = new FutureVaultFactory(address.toHex())
    newContract.address = address
    newContract.createdAtTimestamp = timestamp

  return newContract;
}

export function getPool(factoryAddress: Address, futureVaultAddress: Address, poolIndex: BigInt): Address {
  const futureVaultFactoryContract = FutureVaultFactory.bind(factoryAddress);

  // TODO: ABI update necessary to use this method
  let poolCall = futureVaultFactoryContract.try_getPool(futureVaultAddress, poolIndex);

  if (!poolCall.reverted) {
    return poolCall.value;
  }

  log.warning("getPool() call reverted for {}", [factoryAddress.toHex()]);

  return ZERO_ADDRESS;
}