import { store } from "@graphprotocol/graph-ts";
import {
  UpdateReceived,
  TransferInitiated,
  TransferReceived,
  GatewayAdded,
  GatewayRemoved,
} from "../generated/CrossChainProofOfHumanity/CrossChainProofOfHumanity";
import {
  CrossChainGateway,
  CrossChainHumanity,
  InTransfer,
  OutTransfer,
} from "../generated/schema";
import { ZERO_BI } from "../utils/constants";

export function handleGatewayAdded(ev: GatewayAdded): void {
  const gateway = new CrossChainGateway(ev.params.bridgeGateway);
  gateway.foreignProxy = ev.params.foreignProxy;
  gateway.save();
}

export function handleGatewayRemoved(ev: GatewayRemoved): void {
  store.remove("CrossChainGateway", ev.params.bridgeGateway.toHex());
}

export function handleUpdateReceived(ev: UpdateReceived): void {
  let humanity = CrossChainHumanity.load(ev.params.humanityId);
  if (humanity == null) humanity = new CrossChainHumanity(ev.params.humanityId);
  humanity.claimed = ev.params.claimed;
  humanity.owner = ev.params.owner;
  humanity.expirationTime = ev.params.expirationTime;
  humanity.lastReceivedTransferTimestamp = ev.block.timestamp;
  humanity.save();
}

export function handleTransferInitiated(ev: TransferInitiated): void {
  let humanity = CrossChainHumanity.load(ev.params.humanityId);
  if (humanity == null) humanity = new CrossChainHumanity(ev.params.humanityId);
  humanity.claimed = true;
  humanity.owner = ev.params.owner;
  humanity.expirationTime = ev.params.expirationTime;
  humanity.lastReceivedTransferTimestamp = ZERO_BI;
  humanity.save();

  let transfer = OutTransfer.load(ev.params.humanityId);
  if (transfer == null) transfer = new OutTransfer(ev.params.humanityId);
  transfer.transferHash = ev.params.transferHash;
  transfer.transferTimestamp = ev.block.timestamp;
  transfer.foreignProxy = (CrossChainGateway.load(
    ev.params.gateway
  ) as CrossChainGateway).foreignProxy;
  transfer.save();
}

export function handleTransferReceived(ev: TransferReceived): void {
  const transfer = new InTransfer(ev.params.transferHash);
  transfer.humanityId = ev.params.humanityId;
  transfer.save();
}
