import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
  ArbitratorComplete,
  ProofOfHumanityOld,
  ChangeSubmissionBaseDepositCall,
  ChangeDurationsCall,
  ChangeRequiredNumberOfVouchesCall,
  ChangeSharedStakeMultiplierCall,
  ChangeWinnerStakeMultiplierCall,
  ChangeGovernorCall,
  ChangeLoserStakeMultiplierCall,
  AddSubmissionManuallyCall,
  ChangeArbitratorCall,
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
} from "../../generated/ProofOfHumanityOld/ProofOfHumanityOld";
import {
  ArbitratorData,
  Claimer,
  Evidence,
  Request,
  Humanity,
  Vouch,
} from "../../generated/schema";
import { getContract, New } from "../../utils";
import {
  Reason,
  ONE_BI,
  TWO_BI,
  ZERO,
  ZERO_ADDRESS,
  ZERO_BI,
  Status,
  SubmissionStatusOld,
} from "../../utils/constants";
import { biToBytes, genId } from "../../utils/misc";

export function handleArbitratorComplete(event: ArbitratorComplete): void {
  const contract = getContract();
  contract.address = event.address;
  contract.governor = event.params._governor;
  contract.requestBaseDeposit = event.params._submissionBaseDeposit;
  contract.humanityLifespan = event.params._submissionDuration;
  contract.renewalTime = ProofOfHumanityOld.bind(
    event.address
  ).renewalPeriodDuration();
  contract.challengePeriodDuration = event.params._challengePeriodDuration;
  contract.requiredNumberOfVouches = event.params._requiredNumberOfVouches;
  contract.sharedStakeMultiplier = event.params._sharedStakeMultiplier;
  contract.winnerStakeMultiplier = event.params._winnerStakeMultiplier;
  contract.loserStakeMultiplier = event.params._loserStakeMultiplier;
  contract.save();
}

export function handleMetaEvidence(ev: MetaEvidence): void {
  const poh = ProofOfHumanityOld.bind(ev.address);

  const metaEvidenceUpdates = ev.params._metaEvidenceID.div(TWO_BI);

  let arbitratorData: ArbitratorData;
  if (ev.params._metaEvidenceID.mod(TWO_BI).equals(ZERO_BI)) {
    arbitratorData = new ArbitratorData(biToBytes(metaEvidenceUpdates));
    arbitratorData.registrationMeta = ev.params._evidence;
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

export function changeSubmissionBaseDeposit(
  call: ChangeSubmissionBaseDepositCall
): void {
  const contract = getContract();
  contract.requestBaseDeposit = call.inputs._submissionBaseDeposit;
  contract.save();
}

export function changeDurations(call: ChangeDurationsCall): void {
  const contract = getContract();
  contract.humanityLifespan = call.inputs._submissionDuration;
  contract.renewalTime = call.inputs._renewalPeriodDuration;
  contract.challengePeriodDuration = call.inputs._challengePeriodDuration;
  contract.save();
}

export function changeRequiredNumberOfVouches(
  call: ChangeRequiredNumberOfVouchesCall
): void {
  const contract = getContract();
  contract.requiredNumberOfVouches = call.inputs._requiredNumberOfVouches;
  contract.save();
}

export function changeSharedStakeMultiplier(
  call: ChangeSharedStakeMultiplierCall
): void {
  const contract = getContract();
  contract.sharedStakeMultiplier = call.inputs._sharedStakeMultiplier;
  contract.save();
}

export function changeWinnerStakeMultiplier(
  call: ChangeWinnerStakeMultiplierCall
): void {
  const contract = getContract();
  contract.winnerStakeMultiplier = call.inputs._winnerStakeMultiplier;
  contract.save();
}

export function changeLoserStakeMultiplier(
  call: ChangeLoserStakeMultiplierCall
): void {
  const contract = getContract();
  contract.loserStakeMultiplier = call.inputs._loserStakeMultiplier;
  contract.save();
}

export function changeGovernor(call: ChangeGovernorCall): void {
  const contract = getContract();
  contract.governor = call.inputs._governor;
  contract.save();
}

export function changeArbitrator(call: ChangeArbitratorCall): void {
  const contract = getContract();
  let metaEvidenceUpdates = contract.metaEvidenceUpdates;
  const prevArbitratorData = ArbitratorData.load(
    biToBytes(metaEvidenceUpdates)
  ) as ArbitratorData;

  metaEvidenceUpdates = metaEvidenceUpdates.plus(ONE_BI);

  const arbitratorData = new ArbitratorData(biToBytes(metaEvidenceUpdates));
  arbitratorData.registrationMeta = prevArbitratorData.registrationMeta;
  arbitratorData.clearingMeta = prevArbitratorData.clearingMeta;
  arbitratorData.arbitrator = call.inputs._arbitrator;
  arbitratorData.arbitratorExtraData = call.inputs._arbitratorExtraData;
  arbitratorData.save();

  contract.metaEvidenceUpdates = metaEvidenceUpdates;
  contract.save();
}

export function addSubmissionManually(call: AddSubmissionManuallyCall): void {
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
    humanity.nbRequests = humanity.nbRequests.plus(ONE_BI);
    humanity.save();

    claimer.name = names[i];
    claimer.lastRequestTime = call.block.timestamp;
    claimer.hasHumanity = true;
    claimer.save();

    const request = newRequest(
      submissionIDs[i],
      humanity.nbRequests,
      evidences[i],
      call,
      true
    );

    request.status = Status.Resolved;
    request.save();
  }
}

export function removeSubmissionManually(
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

export function addSubmission(call: AddSubmissionCall): void {
  let humanity = Humanity.load(call.from);
  if (humanity == null) humanity = New.Humanity(call.from);

  let claimer = Claimer.load(call.from);
  if (claimer == null) {
    claimer = New.Claimer(call.from);
    claimer.name = call.inputs._name;
    claimer.targetHumanity = humanity.id;
    claimer.lastRequestTime = call.block.timestamp;
  }
  claimer.targetHumanity = humanity.id;

  humanity.nbRequests = humanity.nbRequests.plus(ONE_BI);
  humanity.save();

  const request = newRequest(
    call.from,
    humanity.nbRequests,
    call.inputs._evidence,
    call,
    true
  );

  claimer.currentRequest = request.id;
  claimer.save();
}

export function reapplySubmission(call: ReapplySubmissionCall): void {
  const humanity = Humanity.load(call.from) as Humanity;
  const claimer = Claimer.load(humanity.id) as Claimer;
  claimer.targetHumanity = humanity.id;

  humanity.nbRequests = humanity.nbRequests.plus(ONE_BI);
  humanity.save();

  const request = newRequest(
    call.from,
    humanity.nbRequests,
    call.inputs._evidence,
    call,
    true
  );

  claimer.currentRequest = request.id;
  claimer.save();
}

export function removeSubmission(call: RemoveSubmissionCall): void {
  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.nbRequests = humanity.nbRequests.plus(ONE_BI);
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE_BI);
  humanity.save();

  newRequest(
    call.inputs._submissionID,
    humanity.nbRequests,
    call.inputs._evidence,
    call,
    false
  );
}

export function handleVouchAdded(event: VouchAdded): void {
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
  vouched.save();
}

export function handleVouchRemoved(event: VouchRemoved): void {
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
  vouched.save();
}

export function withdrawSubmission(call: WithdrawSubmissionCall): void {
  const claimer = Claimer.load(call.from) as Claimer;

  if (!claimer.currentRequest) {
    log.debug("No current request: {}", [call.from.toHexString()]);
    return;
  }

  const request = Request.load(claimer.currentRequest as Bytes) as Request;

  if (request.status != Status.Vouching) return;

  request.status = Status.Withdrawn;
  request.resolutionTime = call.block.timestamp;
  request.save();

  claimer.targetHumanity = null;
  claimer.currentRequest = null;
  claimer.save();
}

export function changeStateToPending(call: ChangeStateToPendingCall): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

  if (!claimer.currentRequest) {
    log.debug("No current request: {}", [call.from.toHexString()]);
    return;
  }

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

export function challengeRequest(call: ChallengeRequestCall): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

  if (!claimer.currentRequest) {
    log.debug("No current request: {}", [call.from.toHexString()]);
    return;
  }

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

export function executeRequest(call: ExecuteRequestCall): void {
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

export function rule(call: RuleCall): void {
  const poh = ProofOfHumanityOld.bind(call.to);

  const disputeData = poh.arbitratorDisputeIDToDisputeData(
    call.from,
    call.inputs._disputeID
  );

  const humanity = Humanity.load(disputeData.getSubmissionID()) as Humanity;
  const claimer = Claimer.load(disputeData.getSubmissionID()) as Claimer;

  if (!claimer.currentRequest) {
    log.debug("No current request: {}", [
      disputeData.getSubmissionID().toHexString(),
    ]);
    return;
  }

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

export function processVouches(call: ProcessVouchesCall): void {
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

export function submitEvidence(call: SubmitEvidenceCall): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

  if (!claimer.currentRequest) {
    log.debug("No current request: {}", [
      call.inputs._submissionID.toHexString(),
    ]);
    return;
  }

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

export function newRequest(
  claimer: Address,
  requestIndex: BigInt,
  evidenceUri: string,
  call: ethereum.Call,
  registration: boolean
): Request {
  const request = New.Request(claimer, claimer, requestIndex, registration);
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
