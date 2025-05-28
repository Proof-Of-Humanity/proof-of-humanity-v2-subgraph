import { Address, BigInt, ByteArray, Bytes, log, store } from "@graphprotocol/graph-ts";
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
  Registration,
  VouchInProcess,
  Challenge,
  EvidenceGroup,
} from "../generated/schema";
import { Factory, LEGACY_FLAG, getPreviousNonRevoked } from "../utils";
import { biToBytes, hash } from "../utils/misc";
import { ZERO, ONE, TWO } from "../utils/constants";
import { PartyUtil, ReasonUtil, StatusUtil } from "../utils/enums";

// V1 end block - after this block, only process withdrawSubmissionLegacy
const V1_END_BLOCK = BigInt.fromI32(20685121);

function shouldProcessEvent(blockNumber: BigInt, isWithdrawSubmission: boolean = false): boolean {
  return isWithdrawSubmission || blockNumber.le(V1_END_BLOCK);
}

export function handleMetaEvidence(ev: MetaEvidence): void {
  if (!shouldProcessEvent(ev.block.number)) {
    return;
  }
  const metaEvidenceUpdates = ev.params._metaEvidenceID.div(TWO);

  let arbitratorHistory: ArbitratorHistory;
  if (ev.params._metaEvidenceID.mod(TWO).equals(ZERO)) {
    if (metaEvidenceUpdates.equals(ZERO)) {
      arbitratorHistory = new ArbitratorHistory("legacy#" + ZERO.toString());
      arbitratorHistory.arbitrator = Address.zero();
      arbitratorHistory.extraData = new Bytes(32);
    } else {
      arbitratorHistory = new ArbitratorHistory(
        "legacy#" + metaEvidenceUpdates.toString()
      );
      const prevArbitratorHistory = ArbitratorHistory.load(
        "legacy#" + metaEvidenceUpdates.minus(ONE).toString()
      ) as ArbitratorHistory;
      arbitratorHistory.arbitrator = prevArbitratorHistory.arbitrator;
      arbitratorHistory.extraData = prevArbitratorHistory.extraData;
    }
    arbitratorHistory.registrationMeta = ev.params._evidence;
    arbitratorHistory.clearingMeta = "";
  } else {
    arbitratorHistory = ArbitratorHistory.load(
      "legacy#" + metaEvidenceUpdates.toString()
    ) as ArbitratorHistory;
    arbitratorHistory.clearingMeta = ev.params._evidence;
  }
  arbitratorHistory.updateTime = ev.block.timestamp;
  arbitratorHistory.save();

  new ReasonUtil();
  new StatusUtil();
  new PartyUtil();
}

export function addSubmissionManuallyLegacy(
  call: AddSubmissionManuallyCall
): void {
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  const poh = ProofOfHumanityOld.bind(call.to);
  const submissionIDs = call.inputs._submissionIDs;
  const names = call.inputs._names;

  const submissionDuration = poh.submissionDuration();
  for (let i = 0; i < submissionIDs.length; i++) {
    const submissionId = submissionIDs[i];

    const claimer = Factory.Claimer(submissionId, names[i]);

    const humanity = Factory.Humanity(submissionId);
    humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE);
    humanity.save();

    const request = Factory.Request(humanity.id, ONE.neg());
    request.claimer = claimer.id;
    request.requester = submissionId;
    request.creationTime = call.block.timestamp;
    request.lastStatusChange = call.block.timestamp;
    request.status = StatusUtil.resolved;
    request.winnerParty = PartyUtil.requester;
    request.save();

    claimer.currentRequest = request.id;
    claimer.save();

    const registration = Factory.Registration(humanity.id, submissionId);
    registration.expirationTime = call.block.timestamp.plus(submissionDuration);
    registration.save();
  }
}

export function removeSubmissionManuallyLegacy(
  call: RemoveSubmissionManuallyCall
): void {
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  store.remove("Registration", call.inputs._submissionID.toHex());
}

export function addSubmissionLegacy(call: AddSubmissionCall): void {
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  const humanity = Factory.Humanity(call.from);
  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE);
  humanity.save();

  const claimer = Factory.Claimer(call.from, call.inputs._name);
  const request = Factory.Request(humanity.id, humanity.nbLegacyRequests.neg());
  request.claimer = claimer.id;
  request.requester = call.from;
  request.creationTime = call.block.timestamp;
  request.lastStatusChange = call.block.timestamp;
  request.save();

  claimer.currentRequest = request.id;
  claimer.save();

  /* const poh = ProofOfHumanityOld.bind(call.to);
  const submissionDuration = poh.submissionDuration();
  const registration = Factory.Registration(humanity.id, call.from);
  registration.expirationTime = call.block.timestamp.plus(submissionDuration);
  registration.save(); */
}

export function reapplySubmissionLegacy(call: ReapplySubmissionCall): void {
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  const humanity = Humanity.load(call.from) as Humanity;
  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE);
  humanity.save();

  const claimer = Claimer.load(call.from) as Claimer;
  const request = Factory.Request(humanity.id, humanity.nbLegacyRequests.neg());
  request.claimer = claimer.id;
  request.requester = call.from;
  request.creationTime = call.block.timestamp;
  request.lastStatusChange = call.block.timestamp;
  request.save();

  claimer.currentRequest = request.id;
  claimer.save();
}

export function removeSubmissionLegacy(call: RemoveSubmissionCall): void {
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE);
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE);
  humanity.pendingRevocation = true;
  humanity.save();

  const registration = Registration.load(humanity.id) as Registration | null;

  const request = Factory.Request(humanity.id, humanity.nbLegacyRequests.neg());
  if (registration) {
    request.claimer = registration.claimer;
  } else {
    log.warning("Remove submmission no-registration. SubmissionId: {}. ", [
      call.inputs._submissionID.toHex(),
    ])
  }

  request.revocation = true;
  request.status = StatusUtil.resolving;
  request.creationTime = call.block.timestamp;
  request.requester = call.from;
  request.lastStatusChange = call.block.timestamp;

  const revokedReq = getPreviousNonRevoked(humanity.id, humanity.nbLegacyRequests.minus(ONE).neg());
  const evidence = Evidence.load(hash(revokedReq!.evidenceGroup.concat(biToBytes(ZERO)))); 
  // The first (ZERO) piece of evidence is the registration one
  
  request.registrationEvidenceRevokedReq = evidence!.uri;

  request.save();
}

export function handleVouchAdded(event: VouchAdded): void {
  if (!shouldProcessEvent(event.block.number)) {
    return;
  }
  const voucher = Claimer.load(event.params._voucher) as Claimer | null;
  const claimer = Claimer.load(event.params._submissionID) as Claimer | null;
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

export function handleVouchRemoved(event: VouchRemoved): void {
  if (!shouldProcessEvent(event.block.number)) {
    return;
  }
  const voucher = Claimer.load(event.params._voucher) as Claimer | null;
  const claimer = Claimer.load(event.params._submissionID) as Claimer | null;
  if (voucher == null || claimer == null) return;

  const vouchId = hash(voucher.id.concat(claimer.id));
  if (Vouch.load(vouchId) == null) return;

  store.remove("Vouch", vouchId.toHexString());
  claimer.nbVouchesReceived = claimer.nbVouchesReceived.minus(ONE);
  claimer.save();
}

export function withdrawSubmissionLegacy(call: WithdrawSubmissionCall): void {
  // Always process withdraw submissions regardless of block number
  if (!shouldProcessEvent(call.block.number, true)) {
    return;
  }
  const claimer = Claimer.load(call.from) as Claimer | null;
  if (!claimer) return;
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
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer | null;
  if (!claimer || !claimer.currentRequest) return;

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.lastStatusChange = call.block.timestamp;
  request.status = StatusUtil.resolving;
  request.save();

  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE);
  humanity.save();

  const vouchesReceived = claimer.vouchesReceived.load();
  for (let i = 0; i < vouchesReceived.length; i++) {
    const vouch = vouchesReceived[i];
    if (vouch !== null) {
      const voucher = Humanity.load(vouch.humanity) as Humanity;

      const voucherRegistration = Registration.load(
        vouch.humanity
      ) as Registration | null;

      if (
        voucherRegistration != null &&
        voucher.usedVouch == null &&
        voucherRegistration.claimer.notEqual(voucher.id) &&
        call.block.timestamp.lt(voucherRegistration.expirationTime)
      ) {
        const vouchInProcess = new VouchInProcess(vouch.id);
        vouchInProcess.vouch = vouch.id;
        vouchInProcess.request = request.id;
        vouchInProcess.voucher = voucherRegistration.id;
        vouchInProcess.processed = false;
        vouchInProcess.save();
      }
    }
  }
}

export function challengeRequestLegacy(call: ChallengeRequestCall): void {
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer | null;
  if (!claimer || !claimer.currentRequest) {
    log.warning("ChallengeReq empty claimer request. SubmissionId: {}. ", [
      call.inputs._submissionID.toHex(),
    ])
    return;
  }

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.status = StatusUtil.disputed;

  const reason = ReasonUtil.parse(call.inputs._reason);  
  var challenge: Challenge | null = null;
  const challengedReqId = claimer.currentRequest as Bytes;
  const challengeId = hash(challengedReqId.concat(biToBytes(request.nbChallenges)));
  challenge = Challenge.load(challengeId) as Challenge | null;

  log.warning("ChallengeRequest x CurrentReq: ReqID: {}. ", [
    request.id.toHex()
  ])

  if (challenge == null) {
    challenge = new Challenge(challengeId);
    challenge.request = request.id;
    log.warning("Challenge null. NEW. ReqID: {}. ", [
      request.id.toHex()
    ]);
  } else {
    log.warning("Challenge NOT null. ReqID: {}. ", [
      request.id.toHex()
    ]);
  }

  const poh = ProofOfHumanityOld.bind(call.to);

  const challengeInfo = poh.getChallengeInfo(call.inputs._submissionID, request.index.plus(ONE).abs(), request.nbChallenges); 

  challenge.index = request.nbChallenges;
  challenge.ruling = PartyUtil.parse(challengeInfo.getRuling());
  //challenge.ruling = PartyUtil.none;
  challenge.reason = reason;
  challenge.challenger = challengeInfo.getChallenger();
  //challenge.challenger = call.inputs._submissionID;
  challenge.disputeId = challengeInfo.getDisputeID();
  challenge.creationTime = call.block.timestamp;
  challenge.nbRounds = ONE;
  challenge.save();

  request.nbChallenges = request.nbChallenges.plus(ONE);
  
  request.save();
}

export function executeRequestLegacy(call: ExecuteRequestCall): void {
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  const poh = ProofOfHumanityOld.bind(call.to);

  const submissionInfo = poh.getSubmissionInfo(call.inputs._submissionID);

  // If the status of the submission is not 0 (None), the call must have reverted.
  if (submissionInfo.getStatus() != 0) return;

  const claimer = Claimer.load(call.inputs._submissionID) as Claimer | null;

  if (!claimer || !claimer.currentRequest) {
    log.debug("No current request {}", [
      call.inputs._submissionID.toHexString(),
    ]);
    return;
  }

  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE);
  humanity.save();

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.status = StatusUtil.resolved;
  request.winnerParty = PartyUtil.requester;
  request.resolutionTime = call.block.timestamp;
  request.save();

  if (submissionInfo.getRegistered()) {
    const registration = Factory.Registration(
      claimer.id,
      call.inputs._submissionID
    );
    registration.expirationTime = submissionInfo
      .getSubmissionTime()
      .plus(poh.submissionDuration());
    registration.save();
  } else {
    const revocationRequest = Request.load(
      hash(
        humanity.id
        .concat(
          biToBytes(
            humanity.nbLegacyRequests.minus(ONE)
          )
        ).concat(LEGACY_FLAG)
      )
    ) as Request;
    revocationRequest.status = StatusUtil.resolved;
    revocationRequest.winnerParty = PartyUtil.requester;
    revocationRequest.resolutionTime = call.block.timestamp;
    revocationRequest.save();
    store.remove("Registration", humanity.id.toHex());
    log.warning("Execute Req revoking. Humanity ID: {}. CurrentReqID: {}. RevocationReqID: {}. ", [
      humanity.id.toHex(),
      request.id.toHex(),
      revocationRequest.id.toHex()
    ])
  }
}

export function handleRuling(ev: RulingEv): void {
  if (!shouldProcessEvent(ev.block.number)) {
    return;
  }
  const poh = ProofOfHumanityOld.bind(ev.address);

  const ruling = PartyUtil.parse(ev.params._ruling.toI32());

  const disputeData = poh.arbitratorDisputeIDToDisputeData(
    ev.params._arbitrator,
    ev.params._disputeID
  );

  const humanity = Humanity.load(disputeData.getSubmissionID()) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE);
  const request = Request.load(
    hash(
      humanity.id
      .concat(
        biToBytes(
          humanity.nbLegacyRequests.minus(ONE)
        )
      ).concat(LEGACY_FLAG)
    )
  ) as Request;
  request.resolutionTime = ev.block.timestamp;
  request.status = StatusUtil.resolved;
  request.winnerParty = ruling; 

  const claimer = Claimer.load(request.claimer) as Claimer | null;
  var challenge: Challenge | null = null;
  if (claimer && claimer.currentRequest) {
    const challengedReqId = claimer.currentRequest as Bytes;
    const challengeId = hash(challengedReqId.concat(biToBytes(disputeData.getChallengeID())));
    challenge = Challenge.load(challengeId) as Challenge | null;

    const disputedRequest = Request.load(challengedReqId) as Request;
    disputedRequest.resolutionTime = ev.block.timestamp;
    disputedRequest.status = StatusUtil.resolved;
    disputedRequest.winnerParty = ruling;
    disputedRequest.save();
    
    log.warning("DisputeID x CurrentReq: Humanity ID: {}. ReqID: {}. ", [
      humanity.id.toHex(),
      request.id.toHex()
    ])
  }

  if (challenge != null) { 
    challenge.ruling = ruling;
    challenge.save();
  } else {
    log.warning("DisputeID: {}. Dispute Data submission: {}. Dispute Data challenge: {}. Dispute Data value0: {}. Dispute Data value1: {}. Humanity ID: {}. ReqID: {}. ", [
      ev.params._disputeID.toHex(),
      disputeData.getSubmissionID().toHex(),
      disputeData.getChallengeID().toHex(),
      disputeData.value0.toHex(),
      disputeData.value1.toHex(),
      humanity.id.toHex(),
      request.id.toHex()
    ])
  }

  const submissionInfo = poh.getSubmissionInfo(disputeData.getSubmissionID());
  if (request.revocation) {
    humanity.pendingRevocation = false;

    if (!submissionInfo.getRegistered()) {
      store.remove("Registration", humanity.id.toHex());
      request.winnerParty = PartyUtil.requester;
    }
  } else if (ruling == PartyUtil.challenger) {
      if (challenge != null) {
        request.ultimateChallenger = challenge.challenger;
      }
    request.winnerParty = PartyUtil.challenger;
  } else if (submissionInfo.getRegistered()) {
    const registration = Factory.Registration(
      humanity.id,
      Address.fromBytes(request.claimer)
    );
    registration.expirationTime = submissionInfo
      .getSubmissionTime()
      .plus(poh.submissionDuration());
    registration.save();
    request.winnerParty = PartyUtil.requester;
  }

  request.save();
  humanity.save();
}

export function processVouchesLegacy(call: ProcessVouchesCall): void {
  if (!shouldProcessEvent(call.block.number)) {
    return;
  }
  const request = Request.load( 
    hash(
      call.inputs._submissionID
      .concat(
        biToBytes(call.inputs._requestID.abs())
      ).concat(LEGACY_FLAG)
    )
  ) as Request;
  const vouches = request.vouches.load();

  for (let i = 0; i < vouches.length; i++) {
    const vouch = vouches[i];
    vouch.processed = true;
    vouch.save();

    const voucherRegistration = Registration.load(
      vouch.voucher
    ) as Registration;

    if (
      !request.ultimateChallenger ||
      !(Claimer.load(voucherRegistration.claimer) as Claimer).currentRequest
    )
      continue;

    // const reason = request.challenges.load().at(-1).reason;
    // if (reason == ReasonUtil.duplicate || reason == ReasonUtil.doesNotExist)
    //   store.remove("Registration", voucherRegistration.id.toHex());
  }
}

export function handleEvidence(ev: EvidenceEv): void {
  if (!shouldProcessEvent(ev.block.number)) {
    return;
  }
  const evGroupIdRaw = BigInt.fromByteArray(
    Bytes.fromUint8Array(
      ByteArray.fromBigInt(ev.params._evidenceGroupID)
      .slice(0, 20)
      .reverse()
    )
  );
  const evGroupId = Bytes.fromUint8Array( 
    biToBytes(
      evGroupIdRaw, 
      20
    )
  );
  let group = EvidenceGroup.load(evGroupId);
  if (group == null) {
    group = new EvidenceGroup(evGroupId);
    group.length = ZERO;
  }
  const evidence = new Evidence(hash(group.id.concat(biToBytes(group.length))));
  evidence.creationTime = ev.block.timestamp;
  evidence.group = group.id;
  evidence.uri = ev.params._evidence;
  evidence.submitter = ev.transaction.from;
  evidence.save();

  group.length = group.length.plus(ONE); 
  group.save();

}
