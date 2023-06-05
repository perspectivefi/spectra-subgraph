import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as"

/**
 * Mock the convertToAsset function from the ERC4626 contract.
 * The rate is computed for a unit of IBT
 * @param addressMock The address of the ERC4626 asset
 * @param rate The rate to return but the convertToAsset function
 */
export const createConvertToAssetsCallMock = (
    addressMock: Address,
    rate: number
): void => {
    createMockedFunction(
        addressMock,
        "convertToAssets",
        "convertToAssets(uint256):(uint256)"
    )
        .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))])
        .returns([ethereum.Value.fromI32(rate as u32)])
}

/**
 * Mock the convertToAsset function from the ERC4626 contract. Specify the mocked rate as a String
 * The rate is computed for a unit of IBT
 * @param addressMock The address of the ERC4626 asset
 * @param rate The rate to return but the convertToAsset function
 */
export const createConvertToAssetsCallMockFromString = (
    addressMock: Address,
    rate: string
): void => {
    let rateBI = BigInt.fromString(rate)
    createMockedFunction(
        addressMock,
        "convertToAssets",
        "convertToAssets(uint256):(uint256)"
    )
        .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))])
        .returns([ethereum.Value.fromSignedBigInt(rateBI)])
}

export const createConvertToSharesCallMock = (
    addressMock: Address,
    rate: BigInt
): void => {
    createMockedFunction(
        addressMock,
        "convertToShares",
        "convertToShares(uint256):(uint256)"
    )
        .withArgs([ethereum.Value.fromUnsignedBigInt(rate)])
        .returns([ethereum.Value.fromUnsignedBigInt(rate)])
}
