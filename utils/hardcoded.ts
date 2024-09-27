import { Address, Bytes } from "@graphprotocol/graph-ts";
import { ProofOfHumanity as ProofOfHumanityContract } from "../generated/ProofOfHumanity/ProofOfHumanity";

export const ProofOfHumanityAddress = Address.fromBytes(
  Bytes.fromHexString("0x2505C87AA36d9ed18514Ea7473Ac58aeDeb50849")
);

export const ProofOfHumanity = ProofOfHumanityContract.bind(
  ProofOfHumanityAddress
);
