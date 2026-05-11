import { Address, Bytes } from "@graphprotocol/graph-ts";
import { ProofOfHumanity as ProofOfHumanityContract } from "../generated/ProofOfHumanity/ProofOfHumanity";

export const ProofOfHumanityAddress = Address.fromBytes(
  Bytes.fromHexString("0xbE9834097A4E97689d9B667441acafb456D0480A")
);

export const ProofOfHumanity = ProofOfHumanityContract.bind(
  ProofOfHumanityAddress
);


