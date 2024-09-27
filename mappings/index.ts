import { Address, BigInt, Bytes, log, store } from "@graphprotocol/graph-ts";
import {
  MetaEvidence,
  VouchAdded,
  VouchRemoved,
  RequestWithdrawn,
  StateAdvanced,
  RequestChallenged,
  ChallengePeriodRestart,
  AppealCreated,
  Initialized,
  DurationsChanged,
  ArbitratorChanged,
  Ruling,
  VouchesProcessed,
  FeesAndRewardsWithdrawn,
  Evidence as EvidenceEv,
  ClaimRequest,
  RevocationRequest,
  Contribution as ContributionEv,
  HumanityClaimed,
  HumanityRevoked,
  VouchRegistered,
  HumanityGrantedDirectly,
  HumanityDischargedDirectly,
  RequestBaseDepositChanged,
  RenewalRequest,
  RequiredNumberOfVouchesChanged,
} from "../generated/ProofOfHumanity/ProofOfHumanity";
import {
  Challenge,
  Claimer,
  Evidence,
  Request,
  Round,
  Humanity,
  Vouch,
  ArbitratorHistory,
  Registration,
  EvidenceGroup,
  VouchInProcess,
  Contribution,
  RequesterFund,
  ChallengerFund,
  Challenger,
} from "../generated/schema";
import { getContract, Factory, getPreviousNonRevoked } from "../utils";
import { ONE, ONE_B, TWO, TWO_B, ZERO } from "../utils/constants";
import { biToBytes, hash } from "../utils/misc";
import { ProofOfHumanity } from "../utils/hardcoded";
import { PartyUtil, ReasonUtil, StatusUtil } from "../utils/enums";

export function handleInitialized(ev: Initialized): void {
  const contract = getContract();
  contract.humanityLifespan = ProofOfHumanity.humanityLifespan();
  contract.renewalPeriodDuration = ProofOfHumanity.renewalPeriodDuration();
  contract.challengePeriodDuration = ProofOfHumanity.challengePeriodDuration();
  contract.requiredNumberOfVouches = ProofOfHumanity.requiredNumberOfVouches();
  contract.baseDeposit = ProofOfHumanity.requestBaseDeposit();

  const arbitratorHistory = new ArbitratorHistory(ZERO.toString());
  const arbitratorHistoryItem = ProofOfHumanity.arbitratorDataHistory(ZERO);
  arbitratorHistory.arbitrator = arbitratorHistoryItem.getArbitrator();
  arbitratorHistory.extraData = arbitratorHistoryItem.getArbitratorExtraData();
  arbitratorHistory.updateTime = ev.block.timestamp;
  arbitratorHistory.registrationMeta = "";
  arbitratorHistory.clearingMeta = "";
  arbitratorHistory.save();

  contract.latestArbitratorHistory = arbitratorHistory.id;
  contract.save();

  new ReasonUtil();
  new StatusUtil();
  new PartyUtil();
}

export function handleMetaEvidence(ev: MetaEvidence): void {
  const metaEvidenceUpdates = ev.params._metaEvidenceID.div(TWO);

  let arbitratorHistory: ArbitratorHistory;
  if (ev.params._metaEvidenceID.mod(TWO).equals(ZERO)) {
    if (metaEvidenceUpdates.equals(ZERO)) {
      arbitratorHistory = ArbitratorHistory.load(
        ZERO.toString()
      ) as ArbitratorHistory;
      arbitratorHistory.registrationMeta = ev.params._evidence;
    } else {
      arbitratorHistory = new ArbitratorHistory(metaEvidenceUpdates.toString());
      arbitratorHistory.registrationMeta = ev.params._evidence;
      arbitratorHistory.clearingMeta = "";

      const prevArbitratorHistory = ArbitratorHistory.load(
        metaEvidenceUpdates.minus(ONE).toString()
      ) as ArbitratorHistory;
      arbitratorHistory.arbitrator = prevArbitratorHistory.arbitrator;
      arbitratorHistory.extraData = prevArbitratorHistory.extraData;
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

export function handleRequestBaseDepositChanged(
  ev: RequestBaseDepositChanged
): void {
  const contract = getContract();
  contract.baseDeposit = ev.params.requestBaseDeposit;
  contract.save();
}

export function handleDurationsChanged(ev: DurationsChanged): void {
  const contract = getContract();
  contract.humanityLifespan = ev.params.humanityLifespan;
  contract.renewalPeriodDuration = ev.params.renewalPeriodDuration;
  contract.challengePeriodDuration = ev.params.challengePeriodDuration;
  contract.save();
}

export function handleRequiredNumberOfVouchesChanged(
  ev: RequiredNumberOfVouchesChanged
): void {
  const contract = getContract();
  contract.requiredNumberOfVouches = ev.params.requiredNumberOfVouches;
  contract.save();
}

export function handleArbitratorChanged(ev: ArbitratorChanged): void {
  const contract = getContract();
  const prevArbitratorHistory = ArbitratorHistory.load(
    contract.latestArbitratorHistory as string
  ) as ArbitratorHistory;

  const arbitratorHistory = new ArbitratorHistory(
    BigInt.fromString(prevArbitratorHistory.id)
      .plus(ONE)
      .toString()
  );
  arbitratorHistory.registrationMeta = prevArbitratorHistory.registrationMeta;
  arbitratorHistory.clearingMeta = prevArbitratorHistory.clearingMeta;
  arbitratorHistory.updateTime = prevArbitratorHistory.updateTime;
  arbitratorHistory.arbitrator = ev.params.arbitrator;
  arbitratorHistory.extraData = ev.params.arbitratorExtraData;
  arbitratorHistory.save();

  contract.latestArbitratorHistory = arbitratorHistory.id;
  contract.save();
}

export function handleHumanityGrantedDirectly(
  ev: HumanityGrantedDirectly
): void {
  const claimer = Factory.Claimer(ev.params.owner, null);
  claimer.save();

  const humanity = Factory.Humanity(ev.params.humanityId);
  humanity.save();

  const registration = Factory.Registration(
    humanity.id,
    Address.fromBytes(claimer.id)
  );
  registration.expirationTime = ev.params.expirationTime;
  registration.save();
}

export function handleHumanityDischargedDirectly(
  ev: HumanityDischargedDirectly
): void {
  store.remove("Registration", ev.params.humanityId.toHex());
}

export function handleClaimRequest(ev: ClaimRequest): void {
  const humanity = Factory.Humanity(ev.params.humanityId);
  const claimer = Factory.Claimer(ev.params.requester, ev.params.name);

  const request = Factory.Request(humanity.id, humanity.nbRequests);
  request.claimer = claimer.id;
  request.requester = claimer.id;
  request.creationTime = ev.block.timestamp;
  request.lastStatusChange = ev.block.timestamp;
  request.save();

  claimer.currentRequest = request.id;
  claimer.save();

  humanity.nbRequests = humanity.nbRequests.plus(ONE);
  humanity.save();
}

export function handleRenewalRequest(ev: RenewalRequest): void {
  const humanity = Humanity.load(ev.params.humanityId) as Humanity | null;
  if (!humanity) return;
  const claimer = Claimer.load(ev.params.requester) as Claimer;

  const request = Factory.Request(humanity.id, humanity.nbRequests);
  request.claimer = claimer.id;
  request.requester = claimer.id;
  request.creationTime = ev.block.timestamp;
  request.lastStatusChange = ev.block.timestamp;
  request.save();

  claimer.currentRequest = request.id;
  claimer.save();

  humanity.nbRequests = humanity.nbRequests.plus(ONE);
  humanity.save();
}

export function handleRevocationRequest(ev: RevocationRequest): void {
  const humanity = Humanity.load(ev.params.humanityId) as Humanity | null;
  if (!humanity) return;
  const registration = Registration.load(ev.params.humanityId) as Registration;

  const request = Factory.Request(humanity.id, humanity.nbRequests);
  request.claimer = registration.claimer;
  request.revocation = true;
  request.status = StatusUtil.resolving;
  request.creationTime = ev.block.timestamp;
  request.requester = ev.transaction.from;
  request.lastStatusChange = ev.block.timestamp;

  const revokedReqHomeChain = getPreviousNonRevoked(humanity.id, humanity.nbRequests);
  const revokedReqLegacy = getPreviousNonRevoked(humanity.id, humanity.nbLegacyRequests.neg());
  var revokedReq: Request | null = null;
  // Value of indexRevokedReqHomeChain could be -1 if the revoke in this chain was the first 
  // request after a legacy profile or a bridged profile. In case the legacy one is present, 
  // that should be checked against a revokedReqForeignChain. If it is present, then it was 
  // created after the legacy and, in that case, revokedReq would be null bacause we should
  // refer to the registration of the transferring profile which is missing at this chain.
  // Then we don't have reference to the registration evidence which will be handled 
  // straightforwardly by the frontend. 
  if (revokedReqHomeChain) {
    if (!revokedReqLegacy || revokedReqHomeChain.creationTime.gt(revokedReqLegacy.creationTime)) {
      revokedReq = revokedReqHomeChain;
    } else {
      revokedReq = revokedReqLegacy;
    }
  } else if (revokedReqLegacy) {
    revokedReq = revokedReqLegacy;
  }

  if (revokedReq) { // This cannot fail
    const revokedReqForeignChain = getPreviousNonRevoked(humanity.id, humanity.nbBridgedRequests.neg());
    // If revokedReqForeignChain exists, we need to make sure (and it shouldn't be the opposit) that 
    // the creation time of revokedReqHomeChain is more recent than the one from revokedReqForeignChain
    // to refer to its registration evidence. If the revoke is done to the transferred request, then 
    // we cannot get the registration ev and it will be handled by the frontend 
    if (!revokedReqForeignChain || revokedReq.creationTime.gt(revokedReqForeignChain.creationTime)) {
      const evidence = Evidence.load(hash(revokedReq.evidenceGroup.concat(biToBytes(ZERO))));
      // The first (ZERO) piece of evidence is the registration one
      request.registrationEvidenceRevokedReq = evidence!.uri;
    }
  }

  request.save();

  humanity.pendingRevocation = true; // Check!
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE);
  humanity.nbRequests = humanity.nbRequests.plus(ONE);
  humanity.save();
}

export function handleVouchAdded(ev: VouchAdded): void {
  const voucher = Claimer.load(ev.params.voucherAccount);
  const claimer = Claimer.load(ev.params.claimer);
  const humanity = Humanity.load(ev.params.humanityId);

  if (voucher == null || claimer == null || humanity == null) return;

  const vouchId = hash(voucher.id.concat(claimer.id).concat(humanity.id));
  if (Vouch.load(vouchId) != null) return;

  const vouch = new Vouch(
    hash(voucher.id.concat(claimer.id).concat(humanity.id))
  );
  vouch.for = claimer.id;
  vouch.from = voucher.id;
  vouch.humanity = humanity.id;
  vouch.save();

  claimer.nbVouchesReceived = claimer.nbVouchesReceived.plus(ONE);
  claimer.save();
}

export function handleVouchRemoved(ev: VouchRemoved): void {
  const voucher = Claimer.load(ev.params.voucherAccount);
  const claimer = Claimer.load(ev.params.claimer);
  const humanity = Humanity.load(ev.params.humanityId);
  if (voucher == null || claimer == null || humanity == null) return;

  const vouchId = hash(voucher.id.concat(claimer.id).concat(humanity.id));
  const vouch = Vouch.load(vouchId);
  if (!vouch) return;
  store.remove("Vouch", vouch.id.toHex());

  claimer.nbVouchesReceived = claimer.nbVouchesReceived.minus(ONE);
  claimer.save();
}

export function handleRequestWithdrawn(ev: RequestWithdrawn): void {
  const request = Request.load(
    hash(ev.params.humanityId.concat(biToBytes(ev.params.requestId)))
  ) as Request | null;
  if (!request) return ;
  request.status = StatusUtil.withdrawn;
  request.resolutionTime = ev.block.timestamp;
  request.save();

  const claimer = Claimer.load(request.requester) as Claimer;
  claimer.currentRequest = null;
  claimer.save();
}

export function handleVouchRegistered(ev: VouchRegistered): void {
  const voucher = Registration.load(
    ev.params.voucherHumanityId
  ) as Registration | null;
  if (!voucher) return;

  const request = Request.load(
    hash(ev.params.vouchedHumanityId.concat(biToBytes(ev.params.requestId)))
  ) as Request | null;
  if (!request) return;

  const vouchId = hash(
    voucher.claimer.concat(request.claimer).concat(ev.params.vouchedHumanityId)
  );
  let vouch = Vouch.load(vouchId);
  if (vouch == null) {
    vouch = new Vouch(vouchId);
    vouch.for = request.claimer;
    vouch.from = voucher.id;
    vouch.humanity = ev.params.vouchedHumanityId;
    vouch.save();
  }

  const vouchInProcess = new VouchInProcess(vouchId);
  vouchInProcess.vouch = vouchId;
  vouchInProcess.request = request.id;
  vouchInProcess.processed = false;
  vouchInProcess.voucher = voucher.id;
  vouchInProcess.save();
}

export function handleStateAdvanced(ev: StateAdvanced): void {
  const claimer = Claimer.load(ev.params.claimer as Bytes) as Claimer;

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.lastStatusChange = ev.block.timestamp;
  request.status = StatusUtil.resolving;
  request.save();

  const humanity = Humanity.load(request.humanity) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE);
  humanity.save();
}

export function handleRequestChallenged(ev: RequestChallenged): void {
  const reason = ReasonUtil.parse(ev.params.reason);

  const request = Request.load(
    hash(ev.params.humanityId.concat(biToBytes(ev.params.requestId)))
  ) as Request;
  request.status = StatusUtil.disputed;

  var challenger = Challenger.load(ev.transaction.from);
  if (challenger == null) {
    challenger = new Challenger(ev.transaction.from);
    challenger.save();
  }
  
  const challenge = Challenge.load(
    hash(request.id.concat(biToBytes(request.nbChallenges)))
  ) as Challenge;
  challenge.reason = reason;
  challenge.challenger = challenger.id;
  challenge.disputeId = ev.params.disputeId;
  challenge.creationTime = ev.block.timestamp;
  challenge.nbRounds = ONE;
  challenge.save();

  request.nbChallenges = request.nbChallenges.plus(ONE);
  request.save();

  // const round = challenge.rounds.load().at(-1);
  // round.creationTime = ev.block.timestamp;
  // round.save();
}

export function handleChallengePeriodRestart(ev: ChallengePeriodRestart): void {
  const request = Request.load(
    hash(ev.params.humanityId.concat(biToBytes(ev.params.requestId)))
  ) as Request;
  request.status = StatusUtil.resolving;
  request.save();
}

export function handleRuling(ev: Ruling): void {
  const ruling = PartyUtil.parse(ev.params._ruling.toI32());

  const disputeData = ProofOfHumanity.disputeIdToData(
    ev.params._arbitrator,
    ev.params._disputeID
  );

  const humanity = Humanity.load(disputeData.getHumanityId()) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE);

  const request = Request.load(
    hash(humanity.id.concat(biToBytes(disputeData.getRequestId())))
  ) as Request;
  request.resolutionTime = ev.block.timestamp;
  request.status = StatusUtil.resolved;
  request.winnerParty = ruling;

  const challenge = Challenge.load(
    hash(request.id.concat(biToBytes(disputeData.getChallengeId())))
  ) as Challenge;
  challenge.ruling = ruling;
  challenge.save();

  if (request.revocation) humanity.pendingRevocation = false;
  else if (ruling == PartyUtil.challenger)
    request.ultimateChallenger = challenge.challenger;

  request.save();
  humanity.save();
}

export function handleAppealCreated(ev: AppealCreated): void {
  const disputeData = ProofOfHumanity.disputeIdToData(
    ev.params.arbitrator,
    ev.params.disputeId
  );

  const request = Request.load(
    hash(
      disputeData.getHumanityId().concat(biToBytes(disputeData.getRequestId()))
    )
  ) as Request;

  const challenge = Challenge.load(
    hash(request.id.concat(biToBytes(disputeData.getChallengeId())))
  ) as Challenge;
  const round = Round.load(
    hash(challenge.id.concat(biToBytes(challenge.nbRounds)))
  ) as Round;
  round.creationTime = ev.block.timestamp;
  round.save();

  challenge.nbRounds = challenge.nbRounds.plus(ONE);
  challenge.save();
}

export function handleHumanityClaimed(ev: HumanityClaimed): void {
  const humanity = Humanity.load(ev.params.humanityId) as Humanity | null;
  if (!humanity) return;
  const request = Request.load(
    hash(humanity.id.concat(biToBytes(ev.params.requestId)))
  ) as Request | null;
  if (!request) return;
  request.status = StatusUtil.resolved;
  request.winnerParty = PartyUtil.requester;
  request.resolutionTime = ev.block.timestamp;
  request.save();

  const claimer = Claimer.load(request.requester) as Claimer;
  const registration = Factory.Registration(
    ev.params.humanityId,
    Address.fromBytes(claimer.id)
  );
  registration.expirationTime = ev.block.timestamp.plus(
    getContract().humanityLifespan
  );
  registration.save();

  claimer.currentRequest = null;
  claimer.save();

  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE);
  humanity.save();
}

export function handleHumanityRevoked(ev: HumanityRevoked): void {
  const humanity = Humanity.load(ev.params.humanityId) as Humanity | null;
  if (!humanity) return;
  const request = Request.load(
    hash(humanity.id.concat(biToBytes(ev.params.requestId)))
  ) as Request | null;
  if (!request) return;
  request.status = StatusUtil.resolved;
  request.winnerParty = PartyUtil.requester;
  request.resolutionTime = ev.block.timestamp;
  request.save();

  store.remove("Registration", ev.params.humanityId.toHex());

  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE);
  humanity.save();
}

export function handleVouchesProcessed(ev: VouchesProcessed): void {
  const vouches = store.loadRelated(
    "Request",
    hash(
      ev.params.humanityId.concat(biToBytes(ev.params.requestId))
    ).toHex(),
    "vouches"
  );

  for (let i = 0; i < vouches.length; i++) {
    const vouch = changetype<VouchInProcess>(vouches[i]);
    vouch.processed = true;
    vouch.save();
  }
}

export function handleContribution(ev: ContributionEv): void {
  const request = Factory.Request(ev.params.humanityId, ev.params.requestId);

  //----------------------------------------------------------------------------------------
  /* const humanity = Humanity.load(ev.params.humanityId) as Humanity;
  humanity.nbRequests = humanity.nbRequests.plus(ONE);
  humanity.save(); */
  //----------------------------------------------------------------------------------------

  const challengeId = hash(request.id.concat(biToBytes(ev.params.challengeId)));
  let challenge = Challenge.load(challengeId);
  if (challenge == null) {
    challenge = new Challenge(challengeId);
    challenge.index = ev.params.challengeId;
    challenge.request = request.id;
    challenge.reason = ReasonUtil.none;
    challenge.challenger = Address.zero();
    challenge.creationTime = ZERO;
    challenge.disputeId = ZERO;
    challenge.ruling = PartyUtil.none;
    challenge.nbRounds = ZERO;
    challenge.save();
  }

  const roundId = hash(challenge.id.concat(biToBytes(ev.params.round)));
  let round = Round.load(roundId);
  if (round == null) {
    round = new Round(roundId);
    round.index = ev.params.round;
    round.challenge = challenge.id;
    round.creationTime = ZERO;
  }

  let fundId: Bytes;
  if (PartyUtil.parse(ev.params.side) == PartyUtil.requester) {
    fundId = hash(round.id.concat(ONE_B));
    let fund = RequesterFund.load(fundId);
    if (fund == null) {
      fund = new RequesterFund(fundId);
      fund.amount = ZERO;
      fund.feeRewards = ZERO;
      round.requesterFund = fundId;
    }
    fund.amount = fund.amount.plus(ev.params.contribution);
    fund.save();
  } else {
    fundId = hash(round.id.concat(TWO_B));
    let fund = ChallengerFund.load(fundId);
    if (fund == null) {
      fund = new ChallengerFund(fundId);
      fund.amount = ZERO;
      fund.feeRewards = ZERO;
      round.challengerFund = fundId;
    }
    fund.amount = fund.amount.plus(ev.params.contribution);
    fund.save();
  }
  round.save();

  const contributionId = hash(fundId.concat(ev.params.contributor));
  let contribution = Contribution.load(contributionId);
  if (contribution == null) {
    contribution = new Contribution(contributionId);
    contribution.contributor = ev.params.contributor;
    contribution.amount = ev.params.contribution;
  } else contribution.amount = contribution.amount.plus(ev.params.contribution);
  contribution.fund = fundId;
  contribution.save();
}

export function handleFeesAndRewardsWithdrawn(
  ev: FeesAndRewardsWithdrawn
): void {
  const requestId = hash(
    ev.params.humanityId.concat(biToBytes(ev.params.requestId))
  );
  const challengeId = hash(requestId.concat(biToBytes(ev.params.challengeId)));
  const roundId = hash(challengeId.concat(biToBytes(ev.params.round)));

  const requesterFundContribution = Contribution.load(
    hash(hash(roundId.concat(ONE_B)).concat(ev.params.beneficiary))
  );
  if (requesterFundContribution != null)
    requesterFundContribution.amount = ZERO;

  const challengerFundContribution = Contribution.load(
    hash(hash(roundId.concat(TWO_B)).concat(ev.params.beneficiary))
  );
  if (challengerFundContribution != null)
    challengerFundContribution.amount = ZERO;
}

export function handleEvidence(ev: EvidenceEv): void {
  let group = EvidenceGroup.load(
    Bytes.fromUint8Array(
      biToBytes(ev.params._evidenceGroupID)
        .slice(0, 32)
        .reverse()
    )
  );

  if (group == null) {
    group = new EvidenceGroup(biToBytes(ev.params._evidenceGroupID));
    group.length = ZERO;
    log.info("evidence group {} not found", [
      ev.params._evidenceGroupID.toHex(),
    ]);
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
