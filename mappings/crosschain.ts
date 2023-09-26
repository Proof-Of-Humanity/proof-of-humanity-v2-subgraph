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
  CrossChainRegistration,
  InTransfer,
  OutTransfer,
} from "../generated/schema";
import { ZERO } from "../utils/constants";
import { Factory } from "../utils";

export function handleGatewayAdded(ev: GatewayAdded): void {
  const gateway = new CrossChainGateway(ev.params.bridgeGateway);
  gateway.foreignProxy = ev.params.foreignProxy;
  gateway.save();
}

export function handleGatewayRemoved(ev: GatewayRemoved): void {
  store.remove("CrossChainGateway", ev.params.bridgeGateway.toHex());
}

export function handleUpdateReceived(ev: UpdateReceived): void {
  let registration = CrossChainRegistration.load(ev.params.humanityId);
  if (registration == null)
    registration = new CrossChainRegistration(ev.params.humanityId);
  if (ev.params.claimed) {
    const claimer = Factory.Claimer(ev.params.owner, null);
    claimer.save();

    registration.claimer = claimer.id;
    registration.expirationTime = ev.params.expirationTime;
    registration.lastReceivedTransferTimestamp = ev.block.timestamp;
    registration.save();
  } else {
    store.remove("CrossChainRegistration", ev.params.humanityId.toHex());
  }
}

export function handleTransferInitiated(ev: TransferInitiated): void {
  let registration = CrossChainRegistration.load(ev.params.humanityId);
  if (registration == null)
    registration = new CrossChainRegistration(ev.params.humanityId);

  const claimer = Factory.Claimer(ev.params.owner, null);
  claimer.save();

  registration.claimer = claimer.id;
  registration.expirationTime = ev.params.expirationTime;
  registration.lastReceivedTransferTimestamp = ZERO;
  registration.save();

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
