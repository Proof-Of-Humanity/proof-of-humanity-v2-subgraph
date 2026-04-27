import { Address, Bytes } from "@graphprotocol/graph-ts";
import { ProofOfHumanity as ProofOfHumanityContract } from "../generated/ProofOfHumanity/ProofOfHumanity";

export const ProofOfHumanityAddress = Address.fromBytes(
  Bytes.fromHexString("{{address}}")
);

export const ProofOfHumanity = ProofOfHumanityContract.bind(
  ProofOfHumanityAddress
);

{{#foresight-router}}
export const ForesightRouterAddress = Address.fromBytes(
  Bytes.fromHexString("{{foresight-router}}")
);
{{/foresight-router}}

{{#foresight-market}}
export const ForesightMarketAddress = Address.fromBytes(
  Bytes.fromHexString("{{foresight-market}}")
);
{{/foresight-market}}
