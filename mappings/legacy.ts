import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
  RemovedForTransfer,
  RemovedFromRequest,
} from "../generated/ForkModule/ForkModule";
import {
  ProofOfHumanityOld,
  AddSubmissionManuallyCall,
  RemoveSubmissionManuallyCall,
  MetaEvidence,
  VouchAdded,
  VouchRemoved,
  AddSubmissionCall,
  WithdrawSubmissionCall,
  ReapplySubmissionCall,
  RemoveSubmissionCall,
  ChangeStateToPendingCall,
  ChallengeRequestCall,
  ExecuteRequestCall,
  SubmitEvidenceCall,
  RuleCall,
  ProcessVouchesCall,
} from "../generated/ProofOfHumanityOld/ProofOfHumanityOld";
import {
  ArbitratorData,
  Claimer,
  Evidence,
  Request,
  Humanity,
  Vouch,
} from "../generated/schema";
import { getContract, New } from "../utils";
import {
  Reason,
  ONE_BI,
  TWO_BI,
  ZERO,
  ZERO_ADDRESS,
  ZERO_BI,
  Status,
  SubmissionStatusOld,
} from "../utils/constants";
import { biToBytes, genId } from "../utils/misc";

export function handleMetaEvidenceLegacy(ev: MetaEvidence): void {
  const poh = ProofOfHumanityOld.bind(ev.address);

  const metaEvidenceUpdates = ev.params._metaEvidenceID.div(TWO_BI);

  let arbitratorData: ArbitratorData;
  if (ev.params._metaEvidenceID.mod(TWO_BI).equals(ZERO_BI)) {
    arbitratorData = new ArbitratorData(biToBytes(metaEvidenceUpdates));
    arbitratorData.registrationMeta = ev.params._evidence;
    arbitratorData.metaEvidenceUpdateTime = ev.block.timestamp;
    arbitratorData.clearingMeta = "";

    if (metaEvidenceUpdates.equals(ZERO_BI)) {
      const arbitratorDataItem = poh.arbitratorDataList(ZERO_BI);
      arbitratorData.arbitrator = arbitratorDataItem.getArbitrator();
      arbitratorData.arbitratorExtraData = arbitratorDataItem.getArbitratorExtraData();
    } else {
      const prevArbitratorData = ArbitratorData.load(
        biToBytes(metaEvidenceUpdates.minus(ONE_BI))
      ) as ArbitratorData;
      arbitratorData.arbitrator = prevArbitratorData.arbitrator;
      arbitratorData.arbitratorExtraData =
        prevArbitratorData.arbitratorExtraData;
    }
  } else {
    arbitratorData = ArbitratorData.load(
      biToBytes(metaEvidenceUpdates)
    ) as ArbitratorData;
    arbitratorData.clearingMeta = ev.params._evidence;
  }
  arbitratorData.save();

  const contract = getContract();
  contract.metaEvidenceUpdates = metaEvidenceUpdates;
  contract.latestArbitratorData = arbitratorData.id;
  contract.save();
}

export function addSubmissionManuallyLegacy(
  call: AddSubmissionManuallyCall
): void {
  const poh = ProofOfHumanityOld.bind(call.to);
  const submissionIDs = call.inputs._submissionIDs;
  const evidences = call.inputs._evidence;
  const names = call.inputs._names;

  for (let i = 0; i < submissionIDs.length; i++) {
    let claimer = Claimer.load(submissionIDs[i]);
    if (claimer == null) claimer = New.Claimer(submissionIDs[i]);

    let humanity = Humanity.load(submissionIDs[i]);
    if (humanity == null) humanity = New.Humanity(submissionIDs[i]);
    humanity.owner = claimer.id;
    humanity.claimed = true;
    humanity.claimTime = call.block.timestamp;
    humanity.expirationTime = call.block.timestamp.plus(
      poh.submissionDuration()
    );
    humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE_BI);
    humanity.save();

    claimer.name = names[i];
    claimer.lastRequestTime = call.block.timestamp;
    claimer.nbVouchesReceived = ZERO_BI;
    claimer.hasHumanity = true;
    claimer.save();

    const request = newLegacyRequest(
      submissionIDs[i],
      humanity.nbLegacyRequests,
      evidences[i],
      call,
      false
    );

    request.requester = submissionIDs[i];
    request.status = Status.Resolved;
    request.save();
  }
}

export function removeSubmissionManuallyLegacy(
  call: RemoveSubmissionManuallyCall
): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;
  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.owner = null;
  humanity.claimed = false;
  humanity.save();

  claimer.hasHumanity = false;
  claimer.save();
}

export function addSubmissionLegacy(call: AddSubmissionCall): void {
  let humanity = Humanity.load(call.from);
  if (humanity == null) humanity = New.Humanity(call.from);

  let claimer = Claimer.load(call.from);
  if (claimer == null) {
    claimer = New.Claimer(call.from);
    claimer.name = call.inputs._name;
    claimer.nbVouchesReceived = ZERO_BI;
    claimer.targetHumanity = humanity.id;
    claimer.lastRequestTime = call.block.timestamp;
  }
  claimer.targetHumanity = humanity.id;

  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE_BI);
  humanity.save();

  const request = newLegacyRequest(
    call.from,
    humanity.nbLegacyRequests,
    call.inputs._evidence,
    call,
    false
  );

  claimer.currentRequest = request.id;
  claimer.save();
}

export function reapplySubmissionLegacy(call: ReapplySubmissionCall): void {
  const humanity = Humanity.load(call.from) as Humanity;
  const claimer = Claimer.load(humanity.id) as Claimer;
  claimer.targetHumanity = humanity.id;

  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE_BI);
  humanity.save();

  const request = newLegacyRequest(
    call.from,
    humanity.nbLegacyRequests,
    call.inputs._evidence,
    call,
    false
  );

  claimer.currentRequest = request.id;
  claimer.save();
}

export function removeSubmissionLegacy(call: RemoveSubmissionCall): void {
  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE_BI);
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE_BI);
  humanity.save();

  newLegacyRequest(
    call.inputs._submissionID,
    humanity.nbLegacyRequests,
    call.inputs._evidence,
    call,
    true
  );
}

export function handleVouchAddedLegacy(event: VouchAdded): void {
  const voucher = Claimer.load(event.params._voucher);
  const vouched = Claimer.load(event.params._submissionID);
  if (voucher == null || vouched == null) return;

  const vouchId = genId(voucher.id, vouched.id);
  if (Vouch.load(vouchId) == null) {
    const vouch = new Vouch(vouchId);
    vouch.from = voucher.id;
    vouch.for = vouched.id;
    vouch.humanity = vouched.id;
    vouch.save();
  }

  vouched.vouchesReceived = voucher.vouchesReceived.concat([vouchId]);
  vouched.nbVouchesReceived = vouched.nbVouchesReceived.plus(ONE_BI);
  vouched.save();
}

export function handleVouchRemovedLegacy(event: VouchRemoved): void {
  const voucher = Claimer.load(event.params._voucher);
  const vouched = Claimer.load(event.params._submissionID);
  if (voucher == null || vouched == null) return;

  const vouchId = genId(voucher.id, vouched.id);

  if (Vouch.load(vouchId) == null) return;

  const newVouchees = new Array<Bytes>();
  for (let i = 0; i < vouched.vouchesReceived.length; i++)
    if (vouched.vouchesReceived[i] != vouchId)
      newVouchees.push(vouched.vouchesReceived[i]);
  vouched.vouchesReceived = newVouchees;
  vouched.nbVouchesReceived = vouched.nbVouchesReceived.minus(ONE_BI);
  vouched.save();
}

export function withdrawSubmissionLegacy(call: WithdrawSubmissionCall): void {
  const claimer = Claimer.load(call.from) as Claimer;

  if (!claimer.currentRequest) return;

  const request = Request.load(claimer.currentRequest as Bytes) as Request;

  if (request.status != Status.Vouching) return;

  request.status = Status.Withdrawn;
  request.resolutionTime = call.block.timestamp;
  request.save();

  claimer.targetHumanity = null;
  claimer.currentRequest = null;
  claimer.save();
}

export function changeStateToPendingLegacy(
  call: ChangeStateToPendingCall
): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

  if (!claimer.currentRequest) return;

  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE_BI);
  humanity.save();

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.lastStatusChange = call.block.timestamp;
  request.status = Status.Resolving;

  for (let i = 0; i < claimer.vouchesReceived.length; i++) {
    const vouch = Vouch.load(claimer.vouchesReceived[i]) as Vouch;
    const voucher = Claimer.load(vouch.from) as Claimer;
    const voucherHumanity = Humanity.load(vouch.humanity) as Humanity;

    if (
      voucherHumanity.usedVouch ||
      voucherHumanity.owner != voucher.id ||
      !voucher.hasHumanity ||
      !voucherHumanity.claimed ||
      call.block.timestamp.gt(voucherHumanity.expirationTime)
    )
      continue;

    voucherHumanity.usedVouch = claimer.id;
    voucherHumanity.save();

    request.vouches = request.vouches.concat([vouch.id]);
  }
  request.save();
}

export function challengeRequestLegacy(call: ChallengeRequestCall): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

  if (!claimer.currentRequest) return;

  claimer.disputed = true;
  claimer.save();

  const reason = Reason.parse(call.inputs._reason);
  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.status = Status.Disputed;
  request.usedReasons = request.usedReasons.concat([reason]);
  request.currentReason = reason;

  if (call.inputs._evidence) {
    const evidence = new Evidence(
      genId(request.id, biToBytes(request.nbEvidence))
    );
    evidence.request = request.id;
    evidence.creationTime = call.block.timestamp;
    evidence.URI = call.inputs._evidence;
    evidence.sender = call.from;
    evidence.save();

    request.nbEvidence = request.nbEvidence.plus(ONE_BI);
  }
  request.save();
}

export function executeRequestLegacy(call: ExecuteRequestCall): void {
  const poh = ProofOfHumanityOld.bind(call.to);

  const submissionInfo = poh.getSubmissionInfo(call.inputs._submissionID);

  // If the status of the submission is not 0 (None), the call must have reverted.
  if (
    SubmissionStatusOld.parse(submissionInfo.getStatus()) !=
    SubmissionStatusOld.None
  )
    return;

  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

  if (!claimer.currentRequest) {
    log.debug("No current request {}", [
      call.inputs._submissionID.toHexString(),
    ]);
    return;
  }

  const humanity = Humanity.load(claimer.targetHumanity as Bytes) as Humanity;

  if (submissionInfo.getRegistered()) {
    claimer.hasHumanity = submissionInfo.getRegistered();
    humanity.claimed = true;
    humanity.owner = claimer.id;
    humanity.claimTime = submissionInfo.getSubmissionTime();
    humanity.expirationTime = submissionInfo
      .getSubmissionTime()
      .plus(poh.submissionDuration());
    humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE_BI);
    humanity.save();
  }

  claimer.lastRequestTime = call.block.timestamp;
  claimer.save();

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.status = Status.Resolved;
  request.resolutionTime = call.block.timestamp;
  request.save();
}

export function ruleLegacy(call: RuleCall): void {
  const poh = ProofOfHumanityOld.bind(call.to);

  const disputeData = poh.arbitratorDisputeIDToDisputeData(
    call.from,
    call.inputs._disputeID
  );

  const humanity = Humanity.load(disputeData.getSubmissionID()) as Humanity;
  const claimer = Claimer.load(disputeData.getSubmissionID()) as Claimer;

  if (!claimer.currentRequest) return;

  const submissionInfo = poh.getSubmissionInfo(disputeData.getSubmissionID());

  if (submissionInfo.getRegistered()) {
    humanity.owner = claimer.id;
    humanity.claimed = true;
    humanity.claimTime = submissionInfo.getSubmissionTime();
    humanity.expirationTime = submissionInfo
      .getSubmissionTime()
      .plus(poh.submissionDuration());
    humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE_BI);
    humanity.save();

    claimer.hasHumanity = submissionInfo.getRegistered();
    claimer.targetHumanity = ZERO_ADDRESS;
  }

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  const requestInfo = poh.getRequestInfo(
    disputeData.getSubmissionID(),
    request.index.minus(ONE_BI)
  );
  request.lastStatusChange = call.block.timestamp;
  if (requestInfo.getDisputed()) request.status = Status.Disputed;
  if (requestInfo.getResolved()) request.status = Status.Resolved;
  request.currentReason = Reason.parse(requestInfo.getCurrentReason());
  request.ultimateChallenger = requestInfo.getUltimateChallenger();
  request.requesterLost = requestInfo.getRequesterLost();

  claimer.disputed = false;
  claimer.save();

  if (requestInfo.getResolved()) request.resolutionTime = call.block.timestamp;
  request.save();
}

export function processVouchesLegacy(call: ProcessVouchesCall): void {
  const request = Request.load(
    genId(
      call.inputs._submissionID,
      biToBytes(call.inputs._requestID.plus(ONE_BI))
    )
  ) as Request;
  let actualIterations: BigInt;

  if (
    call.inputs._iterations
      .plus(request.lastProcessedVouchIndex)
      .le(BigInt.fromI32(request.vouches.length))
  )
    actualIterations = call.inputs._iterations;
  else
    actualIterations = BigInt.fromI32(request.vouches.length).minus(
      request.lastProcessedVouchIndex
    );
  const endIndex = actualIterations.plus(request.lastProcessedVouchIndex);
  request.lastProcessedVouchIndex = endIndex;
  request.save();

  for (let i = 0; i < endIndex.toI32(); i++) {
    const vouch = Vouch.load(request.vouches[i]) as Vouch;
    const voucher = Claimer.load(vouch.from) as Claimer;
    const voucherHumanity = Humanity.load(vouch.humanity) as Humanity;
    voucherHumanity.usedVouch = null;
    voucherHumanity.save();

    if (
      request.ultimateChallenger &&
      voucher.currentRequest &&
      (request.usedReasons[request.usedReasons.length - 1] ==
        Reason.Duplicate ||
        request.usedReasons[request.usedReasons.length - 1] ==
          Reason.DoesNotExist)
    ) {
      const voucherRequest = Request.load(
        voucher.currentRequest as Bytes
      ) as Request;

      if (
        voucherRequest.status == Status.Vouching ||
        voucherRequest.status == Status.Resolving
      ) {
        voucherRequest.requesterLost = true;
        voucherRequest.save();
      }
      voucher.hasHumanity = false;
      voucher.humanity = ZERO_ADDRESS;
      voucher.save();
    }
  }
}

export function submitEvidenceLegacy(call: SubmitEvidenceCall): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

  if (!claimer.currentRequest) return;

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  const evidence = new Evidence(
    genId(request.id, biToBytes(request.nbEvidence))
  );
  evidence.request = request.id;
  evidence.creationTime = call.block.timestamp;
  evidence.URI = call.inputs._evidence;
  evidence.sender = call.from;
  evidence.save();

  request.nbEvidence = request.nbEvidence.plus(ONE_BI);
  request.save();
}

export function newLegacyRequest(
  claimer: Address,
  requestIndex: BigInt,
  evidenceUri: string,
  call: ethereum.Call,
  revocation: boolean
): Request {
  const request = New.Request(claimer, claimer, requestIndex, revocation, true);
  request.creationTime = call.block.timestamp;
  request.requester = call.from;
  request.lastStatusChange = call.block.timestamp;
  request.nbEvidence = ONE_BI;
  request.save();

  const evidence = new Evidence(genId(request.id, ZERO));
  evidence.request = request.id;
  evidence.creationTime = call.block.timestamp;
  evidence.URI = evidenceUri;
  evidence.sender = call.transaction.from;
  evidence.save();

  return request;
}

export function handleRemovedForTransfer(ev: RemovedForTransfer): void {
  const claimer = Claimer.load(ev.params.submissionID) as Claimer;
  claimer.humanity = null;
  claimer.hasHumanity = false;
  claimer.save();

  const humanity = Humanity.load(ev.params.submissionID) as Humanity;
  humanity.owner = null;
  humanity.claimed = false;
  humanity.save();
}

export function handleRemovedFromRequest(ev: RemovedFromRequest): void {
  const humanity = Humanity.load(ev.params.submissionID) as Humanity;
  const request = Request.load(
    genId(humanity.id, biToBytes(humanity.nbRequests.minus(ONE_BI)))
  ) as Request;
  request.status = Status.Resolved;
  request.resolutionTime = ev.block.timestamp;
  request.save();

  const claimer = Claimer.load(ev.params.submissionID) as Claimer;
  claimer.humanity = null;
  claimer.hasHumanity = false;
  claimer.save();

  humanity.owner = null;
  humanity.claimed = false;
  humanity.save();
}
