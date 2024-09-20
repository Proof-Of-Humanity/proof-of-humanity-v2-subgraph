import { Bytes, store } from "@graphprotocol/graph-ts";
import {
  UpdateReceived,
  TransferInitiated,
  TransferReceived,
  GatewayAdded,
  GatewayRemoved,
  UpdateInitiated,
} from "../generated/CrossChainProofOfHumanity/CrossChainProofOfHumanity";
import {
  Claimer,
  CrossChainGateway,
  CrossChainRegistration,
  Humanity,
  InTransfer,
  OutTransfer,
  Request,
} from "../generated/schema";
import { ONE, ZERO } from "../utils/constants";
import { Factory } from "../utils";
import { PartyUtil, StatusUtil } from "../utils/enums";

export function handleGatewayAdded(ev: GatewayAdded): void {
  const gateway = new CrossChainGateway(ev.params.bridgeGateway);
  gateway.foreignProxy = ev.params.foreignProxy;
  gateway.save();
}

export function handleGatewayRemoved(ev: GatewayRemoved): void {
  store.remove("CrossChainGateway", ev.params.bridgeGateway.toHex());
}

export function handleUpdateInitiated(ev: UpdateInitiated): void {
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

  //--------------------------------- Transfer initiated -------------------
  let humanity = Humanity.load(ev.params.humanityId as Bytes);
  if (humanity) {
    let reqArray = humanity.requests.load();
    if (reqArray.length > 0) {
      let iReqOut = -1;

      for (let i = 0; i < reqArray.length; i++) {
        let currentReq = Request.load(reqArray[i].id);
        let referredReq = (iReqOut >= 0)? Request.load(reqArray[iReqOut].id): null;
        if (currentReq!.requester.toHex() == currentReq!.claimer.toHex() && currentReq!.requester.toHex() == ev.params.owner.toHex()) {
          if (
            !currentReq!.revocation && 
            currentReq!.status == StatusUtil.resolved
          ) {
            if (
              (!!referredReq && 
              currentReq!.lastStatusChange.ge(referredReq.lastStatusChange)) || 
              (iReqOut == -1)
            ) {
              iReqOut = i;
            }
          }
        }
      }
      const request = Request.load(reqArray[iReqOut].id);
      if (request) {
        request.lastStatusChange = ev.block.timestamp;
        request.status = StatusUtil.transferred;
        request.save();
      }
    }
  }
}

export function handleTransferReceived(ev: TransferReceived): void {
  const transfer = new InTransfer(ev.params.transferHash);
  transfer.humanityId = ev.params.humanityId;
  transfer.save();

  const humanity = Humanity.load(ev.params.humanityId as Bytes);
  if (!humanity) return ;
  
  const request = Factory.Request(humanity.id, humanity.nbBridgedRequests.neg());
  const claimer = Claimer.load(ev.params.owner) as Claimer;
  request.claimer = claimer.id;
  request.requester = claimer.id;
  request.creationTime = ev.block.timestamp;
  request.lastStatusChange = ev.block.timestamp;
  request.status = StatusUtil.resolved;
  request.winnerParty = PartyUtil.requester;
  request.resolutionTime = ev.block.timestamp;
  
  request.save();

  claimer.currentRequest = request.id;
  claimer.save();

  humanity.nbBridgedRequests = humanity.nbBridgedRequests.plus(ONE);
  humanity.inTransfer = false;
  humanity.save(); 
}
