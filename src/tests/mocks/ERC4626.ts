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

    createMockedFunction(
        addressMock,
        "convertToAssets",
        "convertToAssets(uint256):(uint256)"
    )
        .withArgs([
            ethereum.Value.fromUnsignedBigInt(
                BigInt.fromI64(1000000000000000000)
            ),
        ])
        .returns([
            ethereum.Value.fromUnsignedBigInt(
                BigInt.fromI64(1000000000000000000)
            ),
        ])
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

export const createAssetCallMock = (
    addressMock: Address,
    asset: Address
): void => {
    createMockedFunction(addressMock, "asset", "asset():(address)").returns([
        ethereum.Value.fromAddress(asset),
    ])
}
