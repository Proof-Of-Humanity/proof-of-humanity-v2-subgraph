import { Address, ByteArray, Bytes, log, store } from "@graphprotocol/graph-ts";
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
import { Factory, LEGACY_FLAG } from "../utils";
import { biToBytes, hash } from "../utils/misc";
import { ZERO, ONE, TWO } from "../utils/constants";
import { PartyUtil, ReasonUtil, StatusUtil } from "../utils/enums";

export function handleMetaEvidence(ev: MetaEvidence): void {
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

    const request = Factory.Request(humanity.id, ONE.neg());
    request.claimer = claimer.id;
    request.requester = submissionId;
    request.creationTime = call.block.timestamp;
    request.lastStatusChange = call.block.timestamp;
    request.status = StatusUtil.resolved;
    request.winnerParty = PartyUtil.requester;
    request.save();

    const registration = Factory.Registration(humanity.id, submissionId);
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
}

export function reapplySubmissionLegacy(call: ReapplySubmissionCall): void {
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
  const humanity = Humanity.load(call.inputs._submissionID) as Humanity;
  humanity.nbLegacyRequests = humanity.nbLegacyRequests.plus(ONE);
  humanity.save();

  const registration = Registration.load(humanity.id) as Registration;
  const request = Factory.Request(humanity.id, humanity.nbLegacyRequests.neg());
  request.claimer = registration.claimer;
  request.revocation = true;
  request.status = StatusUtil.resolving;
  request.creationTime = call.block.timestamp;
  request.requester = call.from;
  request.lastStatusChange = call.block.timestamp;
  request.save();
}

export function handleVouchAdded(event: VouchAdded): void {
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
  const claimer = Claimer.load(call.inputs._submissionID) as Claimer;
  if (!claimer.currentRequest) return;

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.lastStatusChange = call.block.timestamp;
  request.status = StatusUtil.resolving;
  request.save();

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
  const request = Request.load(
    hash(
      humanity.id
      .concat(
        biToBytes(humanity.nbLegacyRequests.minus(ONE))
      ).concat(LEGACY_FLAG)
    )
  ) as Request;
  request.resolutionTime = ev.block.timestamp;
  request.status = StatusUtil.resolved;

  const challenge = Challenge.load(
    hash(request.id.concat(biToBytes(disputeData.getChallengeID())))
  ) as Challenge | null;

  if (challenge != null) { 
    challenge.ruling = ruling;
    challenge.save();
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
  const evGroupId = Bytes.fromUint8Array(
    ByteArray.fromBigInt(ev.params._evidenceGroupID)
      .slice(0, 20)
      .reverse()
  );
  let group = EvidenceGroup.load(evGroupId);
  if (group == null) {
    group = new EvidenceGroup(evGroupId);
    group.length = ZERO;
  }
  /* group.length = group.length.plus(ONE); // CON ESTO ACA ES LA v1.0.0
  group.save();
 */
  const evidence = new Evidence(hash(group.id.concat(biToBytes(group.length))));
  evidence.creationTime = ev.block.timestamp;
  evidence.group = group.id;
  evidence.uri = ev.params._evidence;
  evidence.submitter = ev.transaction.from;
  evidence.save();

  group.length = group.length.plus(ONE); // CON ESTO ACA ES LA v1.0.5 (con el index.ts modificado) y la v1.0.6 (index mod sin reverse())
  group.save();

}
