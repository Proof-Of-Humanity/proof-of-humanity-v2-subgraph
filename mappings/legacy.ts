import { BigInt, Bytes, log, store } from "@graphprotocol/graph-ts";
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
  ProcessVouchesCall,
  Evidence as EvidenceEv,
  Ruling as RulingEv,
} from "../generated/ProofOfHumanityOld/ProofOfHumanityOld";
import {
  Claimer,
  Evidence,
  Request,
  Humanity,
  Vouch,
  ArbitratorHistory,
  EvidenceGroup,
  Registration,
  VouchInProcess,
  Challenge,
} from "../generated/schema";
import { getContract, Factory } from "../utils";
import { biToBytes, hash } from "../utils/misc";
import { ZERO, ONE, TWO } from "../utils/constants";
import { PartyUtil, ReasonUtil, StatusUtil } from "../utils/enums";

export function handleMetaEvidenceLegacy(ev: MetaEvidence): void {
  const poh = ProofOfHumanityOld.bind(ev.address);

  const metaEvidenceUpdates = ev.params._metaEvidenceID.div(TWO);

  let arbitratorHistory: ArbitratorHistory;
  if (ev.params._metaEvidenceID.mod(TWO).equals(ZERO)) {
    if (metaEvidenceUpdates.equals(ZERO)) {
      arbitratorHistory = new ArbitratorHistory(ZERO.toString());
      arbitratorHistory.registrationMeta = ev.params._evidence;
    } else {
      arbitratorHistory = new ArbitratorHistory(metaEvidenceUpdates.toString());
      arbitratorHistory.registrationMeta = ev.params._evidence;
      arbitratorHistory.clearingMeta = "";

      const prevArbitratorHistory = ArbitratorHistory.load(
        metaEvidenceUpdates.minus(ONE).toString()
      ) as ArbitratorHistory;
      arbitratorHistory.arbitrator = prevArbitratorHistory.arbitrator;
    }
  } else {
    arbitratorHistory = ArbitratorHistory.load(
      metaEvidenceUpdates.toString()
    ) as ArbitratorHistory;
    arbitratorHistory.clearingMeta = ev.params._evidence;
  }
  arbitratorHistory.updateTime = ev.block.timestamp;
  arbitratorHistory.save();

  const contract = getContract();
  contract.latestArbitratorHistory = arbitratorHistory.id;
  contract.save();
}

export function addSubmissionManuallyLegacy(
  call: AddSubmissionManuallyCall
): void {
  const poh = ProofOfHumanityOld.bind(call.to);
  const submissionIDs = call.inputs._submissionIDs;
  const names = call.inputs._names;

  const submissionDuration = poh.submissionDuration();
  for (let i = 0; i < submissionIDs.length; i++) {
    const submissionId = submissionIDs[i];

    const claimer = Factory.Claimer(submissionId, names[i]);
    claimer.save();

    const humanity = Factory.Humanity(submissionId);
    humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE);
    humanity.save();

    const registration = Factory.Registration(humanity.id, claimer.id);
    registration.expirationTime = call.block.timestamp.plus(submissionDuration);
    registration.save();
  }
}

export function removeSubmissionManuallyLegacy(
  call: RemoveSubmissionManuallyCall
): void {
  store.remove("Registration", call.inputs._submissionID.toHex());
}

export function addSubmissionLegacy(call: AddSubmissionCall): void {
  const humanity = Factory.Humanity(call.from);
  const claimer = Factory.Claimer(call.from, call.inputs._name);

  const request = Factory.Request(
    humanity.id,
    call.from,
    humanity.nbLegacyRequests,
    false,
    true
  );
  request.creationTime = call.block.timestamp;
  request.lastStatusChange = call.block.timestamp;
  request.save();

  const evidenceGroup = new EvidenceGroup(
    hash(
      biToBytes(BigInt.fromByteArray(call.from).plus(humanity.nbLegacyRequests))
    )
  );
  evidenceGroup.request = request.id;
  evidenceGroup.length = ZERO;
  evidenceGroup.save();

  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE);
  humanity.save();

  claimer.currentRequest = request.id;
  claimer.save();
}

export function reapplySubmissionLegacy(call: ReapplySubmissionCall): void {
  addSubmissionLegacy(call);
}

export function removeSubmissionLegacy(call: RemoveSubmissionCall): void {
  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  const registration = Registration.load(humanity.id) as Registration;

  const request = Factory.Request(
    humanity.id,
    registration.claimer,
    humanity.nbLegacyRequests,
    true,
    true
  );
  request.creationTime = call.block.timestamp;
  request.requester = call.from;
  request.lastStatusChange = call.block.timestamp;
  request.save();

  const evidenceGroup = new EvidenceGroup(
    hash(
      biToBytes(
        BigInt.fromByteArray(registration.claimer).plus(
          humanity.nbLegacyRequests
        )
      )
    )
  );
  evidenceGroup.request = request.id;
  evidenceGroup.length = ZERO;
  evidenceGroup.save();

  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE);
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE);
  humanity.save();
}

export function handleVouchAddedLegacy(event: VouchAdded): void {
  const voucher = Claimer.load(event.params._voucher);
  const claimer = Claimer.load(event.params._submissionID);
  if (voucher == null || claimer == null) return;

  const vouchId = hash(voucher.id.concat(claimer.id));
  if (Vouch.load(vouchId) != null) return;

  const vouch = new Vouch(vouchId);
  vouch.for = claimer.id;
  vouch.from = voucher.id;
  vouch.humanity = claimer.id;
  vouch.save();

  claimer.nbVouchesReceived = claimer.nbVouchesReceived.plus(ONE);
  claimer.save();
}

export function handleVouchRemovedLegacy(event: VouchRemoved): void {
  const voucher = Claimer.load(event.params._voucher);
  const claimer = Claimer.load(event.params._submissionID);
  if (voucher == null || claimer == null) return;

  const vouchId = hash(voucher.id.concat(claimer.id));
  if (Vouch.load(vouchId) == null) return;

  store.remove("Vouch", vouchId.toString());
  claimer.nbVouchesReceived = claimer.nbVouchesReceived.minus(ONE);
  claimer.save();
}

export function withdrawSubmissionLegacy(call: WithdrawSubmissionCall): void {
  const claimer = Claimer.load(call.from) as Claimer;
  if (!claimer.currentRequest) return;

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  if (request.status != StatusUtil.vouching) return;

  request.status = StatusUtil.withdrawn;
  request.resolutionTime = call.block.timestamp;
  request.save();

  claimer.currentRequest = null;
  claimer.save();
}

export function changeStateToPendingLegacy(
  call: ChangeStateToPendingCall
): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;
  if (!claimer.currentRequest) return;

  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE);
  humanity.save();

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.lastStatusChange = call.block.timestamp;
  request.status = StatusUtil.resolving;
  request.save();

  claimer.vouchesReceived.load().forEach(function(vouch) {
    const voucher = Humanity.load(vouch.humanity) as Humanity;
    const voucherRegistration = Registration.load(
      vouch.humanity
    ) as Registration;

    if (
      voucherRegistration != null &&
      voucher.usedVouch == null &&
      voucherRegistration.claimer.notEqual(voucher.id) &&
      call.block.timestamp.lt(voucherRegistration.expirationTime)
    ) {
      const vouchInProcess = new VouchInProcess(vouch.id);
      vouchInProcess.vouch = vouch.id;
      vouchInProcess.request = request.id;
      vouchInProcess.save();
    }
  });
}

export function challengeRequestLegacy(call: ChallengeRequestCall): void {
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;
  if (!claimer.currentRequest) return;

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.status = StatusUtil.disputed;
  request.save();
}

export function executeRequestLegacy(call: ExecuteRequestCall): void {
  const poh = ProofOfHumanityOld.bind(call.to);

  const submissionInfo = poh.getSubmissionInfo(call.inputs._submissionID);

  // If the status of the submission is not 0 (None), the call must have reverted.
  if (submissionInfo.getStatus() != 0) return;

  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

  if (!claimer.currentRequest) {
    log.debug("No current request {}", [
      call.inputs._submissionID.toHexString(),
    ]);
    return;
  }

  const request = Request.load(claimer.currentRequest) as Request;
  request.status = StatusUtil.resolved;
  request.resolutionTime = call.block.timestamp;
  request.save();

  if (submissionInfo.getRegistered()) {
    const registration = Factory.Registration(claimer.id, claimer.id);
    registration.expirationTime = submissionInfo
      .getSubmissionTime()
      .plus(poh.submissionDuration());
    registration.save();

    const humanity = Humanity.load(request.humanity) as Humanity;
    humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE);
    humanity.save();
  }
}

export function handleRuling(ev: RulingEv): void {
  const poh = ProofOfHumanityOld.bind(ev.address);

  const ruling = PartyUtil.parse(ev.params._ruling.toI32());

  const disputeData = poh.arbitratorDisputeIDToDisputeData(
    ev.params._arbitrator,
    ev.params._disputeID
  );

  const humanity = Humanity.load(disputeData.getSubmissionID()) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE);

  const request = Request.load(
    hash(humanity.id.concat(biToBytes(humanity.nbRequests.minus(ONE))))
  ) as Request;
  request.resolutionTime = ev.block.timestamp;
  request.status = StatusUtil.resolved;

  const challenge = Challenge.load(
    hash(request.id.concat(biToBytes(disputeData.getChallengeID())))
  ) as Challenge;
  challenge.ruling = ruling;
  challenge.save();

  if (request.revocation) humanity.pendingRevocation = false;
  else if (ruling == PartyUtil.challenger)
    request.ultimateChallenger = challenge.challenger;

  const submissionInfo = poh.getSubmissionInfo(disputeData.getSubmissionID());
  if (submissionInfo.getRegistered()) {
    const registration = Factory.Registration(humanity.id, humanity.id);
    registration.expirationTime = submissionInfo
      .getSubmissionTime()
      .plus(poh.submissionDuration());

    humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE);
    humanity.save();
  }

  request.save();
  humanity.save();
}

export function processVouchesLegacy(call: ProcessVouchesCall): void {
  const request = Request.load(
    hash(call.inputs._submissionID.concat(biToBytes(call.inputs._requestID)))
  ) as Request;
  const vouches = request.vouches.load();

  for (let i = 0; i < vouches.length; i++) {
    const vouch = vouches[i];
    store.remove(
      "VouchInProcess",
      (Humanity.load(vouch.humanity) as Humanity).usedVouch
        .load()
        .at(0)
        .id.toHex()
    );

    const voucher = Humanity.load(vouch.humanity) as Humanity;
    const voucherRegistration = Registration.load(
      vouch.humanity
    ) as Registration;

    if (
      request.ultimateChallenger == null ||
      (Claimer.load(voucherRegistration.claimer) as Claimer).currentRequest ==
        null
    )
      continue;

    const reason = request.challenges.load().at(-1).reason;
    if (reason == ReasonUtil.duplicate || reason == ReasonUtil.doesNotExist)
      store.remove("Registration", voucherRegistration.id.toHex());
  }
}

export function handleEvidenceLegacy(ev: EvidenceEv): void {
  const group = EvidenceGroup.load(
    biToBytes(ev.params._evidenceGroupID)
  ) as EvidenceGroup;

  const evidence = new Evidence(hash(group.id.concat(biToBytes(group.length))));
  evidence.creationTime = ev.block.timestamp;
  evidence.group = group.id;
  evidence.uri = ev.params._evidence;
  evidence.submitter = ev.transaction.from;
  evidence.save();

  group.length = group.length.plus(ONE);
  group.save();
}
