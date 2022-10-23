import { Address, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as/assembly/index";



import { FIRST_USER_MOCK } from "./FutureVault";


export const POOL_FACTORY_ADDRESS_MOCK = Address.fromString(
  "0x0000000000000000000000555550000000000000"
)

export const FIRST_POOL_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000555550000000000000"
)

export const POOL_IBT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000022"
)

export const POOL_PT_ADDRESS_MOCK = Address.fromString(
  "0x0000000000000000000000000000000000002222"
)

export const POOL_FEE_MOCK = 555
export const POOL_ADMIN_FEE_MOCK = 55

export function mockMetaPoolFactoryFunctions(): void {
    ;[FIRST_POOL_ADDRESS_MOCK].forEach((addressMock) => {
        createMockedFunction(
            addressMock,
            "get_fee_receiver",
            "get_fee_receiver(address):(address)"
        )
            .withArgs([ethereum.Value.fromAddress(FIRST_POOL_ADDRESS_MOCK)])
            .returns([ethereum.Value.fromAddress(FIRST_USER_MOCK)])

        createMockedFunction(
            addressMock,
            "get_fees",
            "get_fees(address):(uint256,uint256)"
        )
            .withArgs([ethereum.Value.fromAddress(FIRST_POOL_ADDRESS_MOCK)])
            .returns([
                ethereum.Value.fromI32(POOL_FEE_MOCK),
                ethereum.Value.fromI32(POOL_ADMIN_FEE_MOCK),
            ])
    })
}