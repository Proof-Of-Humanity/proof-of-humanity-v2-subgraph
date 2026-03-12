import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { HumanityEvent, Request } from "../generated/schema";

export namespace HumanityEventTypeUtil {
  export const requestCreated = "REQUEST_CREATED";
  export const requestEnteredReview = "REQUEST_ENTERED_REVIEW";
  export const requestVouchAdded = "REQUEST_VOUCH_ADDED";
  export const requestVouchRemoved = "REQUEST_VOUCH_REMOVED";
  export const requestChallenged = "REQUEST_CHALLENGED";
  export const requestAppealCreated = "REQUEST_APPEAL_CREATED";
  export const requestResolvedAccepted = "REQUEST_RESOLVED_ACCEPTED";
  export const requestResolvedRejected = "REQUEST_RESOLVED_REJECTED";
  export const requestWithdrawn = "REQUEST_WITHDRAWN";
  export const transferInitiated = "TRANSFER_INITIATED";
  export const transferReceived = "TRANSFER_RECEIVED";
}

const getEventId = (ev: ethereum.Event): string =>
  ev.transaction.hash.toHexString() + ":" + ev.logIndex.toString();

const getCallId = (
  call: ethereum.Call,
  type: string,
  request: Request | null,
): string =>
  call.transaction.hash.toHexString() +
  ":" +
  type +
  ":" +
  (request ? request.index.toString() : "none");

export const createHumanityEvent = (
  ev: ethereum.Event,
  type: string,
  humanityId: Bytes,
  request: Request | null = null,
  transferHash: Bytes | null = null,
  voucher: Bytes | null = null,
  appealRound: BigInt | null = null,
  includeRevocation: boolean = false,
  revocation: boolean = false,
  disputeId: BigInt | null = null,
): void => {
  const event = new HumanityEvent(getEventId(ev));
  event.humanityId = humanityId;
  event.timestamp = ev.block.timestamp;
  event.type = type;

  if (request) {
    event.requestIndex = request.index;
  }

  if (transferHash) {
    event.transferHash = transferHash;
  }

  if (voucher) {
    event.voucher = voucher;
  }

  if (appealRound) {
    event.appealRound = appealRound;
  }

  if (includeRevocation) {
    event.revocation = revocation;
  }

  if (disputeId) {
    event.disputeId = disputeId;
  }

  event.save();
};

export const createHumanityCallEvent = (
  call: ethereum.Call,
  type: string,
  humanityId: Bytes,
  request: Request | null = null,
  transferHash: Bytes | null = null,
  voucher: Bytes | null = null,
  appealRound: BigInt | null = null,
  includeRevocation: boolean = false,
  revocation: boolean = false,
  disputeId: BigInt | null = null,
): void => {
  const event = new HumanityEvent(getCallId(call, type, request));
  event.humanityId = humanityId;
  event.timestamp = call.block.timestamp;
  event.type = type;

  if (request) {
    event.requestIndex = request.index;
  }

  if (transferHash) {
    event.transferHash = transferHash;
  }

  if (voucher) {
    event.voucher = voucher;
  }

  if (appealRound) {
    event.appealRound = appealRound;
  }

  if (includeRevocation) {
    event.revocation = revocation;
  }

  if (disputeId) {
    event.disputeId = disputeId;
  }

  event.save();
};
