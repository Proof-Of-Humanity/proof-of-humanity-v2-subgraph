import { BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
  MetaEvidence,
  ProofOfHumanity,
  VouchAdded,
  VouchRemoved,
  RequestWithdrawn,
  StateAdvanced,
  RequestChallenged,
  ChallengePeriodRestart,
  AppealCreated,
  HumanityGrantedManually,
  HumanityRevokedManually,
  Initialized,
  RequestBaseDepositChanged,
  RequiredNumberOfVouchesChanged,
  DurationsChanged,
  StakeMultipliersChanged,
  GovernorChanged,
  ArbitratorChanged,
  Ruling,
  VouchesProcessed,
  FeesAndRewardsWithdrawn,
  Evidence as EvidenceEvent,
  ClaimRequest,
  RenewalRequest,
  RevocationRequest,
  Contribution as ContributionEv,
  HumanityClaimed,
  HumanityRevoked,
  VouchRegistered,
} from "../generated/ProofOfHumanity/ProofOfHumanity";
import {
  ArbitratorData,
  Challenge,
  Claimer,
  Contribution,
  Counter,
  Evidence,
  Request,
  Round,
  Humanity,
  Vouch,
} from "../generated/schema";
import { getContract, getCounter, New } from "../utils";
import {
  ONE_BI,
  Party,
  Reason,
  Status,
  TWO_BI,
  ZERO_BI,
  ZERO,
  submitEvidenceSig,
} from "../utils/constants";
import { biToBytes, genId, genId3 } from "../utils/misc";

export function handleInitialized(ev: Initialized): void {
  const poh = ProofOfHumanity.bind(ev.address);

  const contract = getContract();
  contract.address = ev.address;
  contract.governor = poh.governor();
  contract.requestBaseDeposit = poh.requestBaseDeposit();
  contract.humanityLifespan = poh.humanityLifespan();
  contract.renewalTime = poh.renewalPeriodDuration();
  contract.challengePeriodDuration = poh.challengePeriodDuration();
  contract.requiredNumberOfVouches = poh.requiredNumberOfVouches();
  contract.sharedStakeMultiplier = poh.sharedStakeMultiplier();
  contract.winnerStakeMultiplier = poh.winnerStakeMultiplier();
  contract.loserStakeMultiplier = poh.loserStakeMultiplier();

  const arbitratorData = new ArbitratorData(ZERO);
  const arbitratorDataItem = poh.arbitratorDataList(ZERO_BI);
  arbitratorData.arbitrator = arbitratorDataItem.getArbitrator();
  arbitratorData.arbitratorExtraData = arbitratorDataItem.getArbitratorExtraData();
  arbitratorData.metaEvidenceUpdateTime = ZERO_BI;
  arbitratorData.registrationMeta = "";
  arbitratorData.clearingMeta = "";
  arbitratorData.save();

  contract.latestArbitratorData = arbitratorData.id;
  contract.save();

  const counter = new Counter(ZERO);
  counter.vouching = ZERO_BI;
  counter.pendingClaims = ZERO_BI;
  counter.challengedClaims = ZERO_BI;
  counter.registered = ZERO_BI;
  counter.pendingRevocations = ZERO_BI;
  counter.challengedRevocation = ZERO_BI;
  counter.removed = ZERO_BI;
  counter.expired = ZERO_BI;
  counter.save();

  log.warning("GGG Initialization complete", []);
}

export function handleMetaEvidence(ev: MetaEvidence): void {
  const metaEvidenceUpdates = ev.params._metaEvidenceID.div(TWO_BI);

  let arbitratorData: ArbitratorData;
  if (ev.params._metaEvidenceID.mod(TWO_BI).equals(ZERO_BI)) {
    if (metaEvidenceUpdates.equals(ZERO_BI)) {
      arbitratorData = ArbitratorData.load(ZERO) as ArbitratorData;
      arbitratorData.registrationMeta = ev.params._evidence;
    } else {
      arbitratorData = new ArbitratorData(biToBytes(metaEvidenceUpdates));
      arbitratorData.registrationMeta = ev.params._evidence;
      arbitratorData.clearingMeta = "";

      const prevArbitratorData = ArbitratorData.load(
        biToBytes(metaEvidenceUpdates.minus(ONE_BI))
      ) as ArbitratorData;
      arbitratorData.arbitrator = prevArbitratorData.arbitrator;
      arbitratorData.arbitratorExtraData =
        prevArbitratorData.arbitratorExtraData;
    }
    arbitratorData.metaEvidenceUpdateTime = ev.block.timestamp;
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

export function handleRequestBaseDepositChanged(
  ev: RequestBaseDepositChanged
): void {
  const contract = getContract();
  contract.requestBaseDeposit = ev.params.requestBaseDeposit;
  contract.save();
}

export function handleDurationsChanged(ev: DurationsChanged): void {
  const contract = getContract();
  contract.humanityLifespan = ev.params.humanityLifespan;
  contract.renewalTime = ev.params.renewalPeriodDuration;
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

export function changeStakeMultipliersChanged(
  ev: StakeMultipliersChanged
): void {
  const contract = getContract();
  contract.sharedStakeMultiplier = ev.params.sharedMultiplier;
  contract.winnerStakeMultiplier = ev.params.winnerMultiplier;
  contract.loserStakeMultiplier = ev.params.loserMultiplier;
  contract.save();
}

export function handleGovernorChanged(ev: GovernorChanged): void {
  const contract = getContract();
  contract.governor = ev.params.governor;
  contract.save();
}

export function handleArbitratorChanged(ev: ArbitratorChanged): void {
  const contract = getContract();
  let metaEvidenceUpdates = contract.metaEvidenceUpdates;
  const prevArbitratorData = ArbitratorData.load(
    contract.latestArbitratorData
  ) as ArbitratorData;

  metaEvidenceUpdates = metaEvidenceUpdates.plus(ONE_BI);

  const arbitratorData = new ArbitratorData(biToBytes(metaEvidenceUpdates));
  arbitratorData.registrationMeta = prevArbitratorData.registrationMeta;
  arbitratorData.clearingMeta = prevArbitratorData.clearingMeta;
  arbitratorData.metaEvidenceUpdateTime =
    prevArbitratorData.metaEvidenceUpdateTime;
  arbitratorData.arbitrator = ev.params.arbitrator;
  arbitratorData.arbitratorExtraData = ev.params.arbitratorExtraData;
  arbitratorData.save();

  contract.metaEvidenceUpdates = metaEvidenceUpdates;
  contract.latestArbitratorData = arbitratorData.id;
  contract.save();
}

export function handleHumanityGrantedManually(
  ev: HumanityGrantedManually
): void {
  let claimer = Claimer.load(ev.params.owner);
  if (claimer == null) claimer = New.Claimer(ev.params.owner);

  let humanity = Humanity.load(ev.params.humanityId);
  if (humanity == null) humanity = New.Humanity(ev.params.humanityId);
  humanity.owner = claimer.id;
  humanity.claimed = true;
  humanity.expirationTime = ev.params.expirationTime;
  humanity.save();

  claimer.lastRequestTime = ev.block.timestamp;
  claimer.humanity = humanity.id;
  claimer.hasHumanity = true;
  claimer.save();

  const counter = getCounter();
  counter.registered = counter.registered.plus(ONE_BI);
  counter.save();
}

export function handleHumanityRevokedManually(
  ev: HumanityRevokedManually
): void {
  const humanity = Humanity.load(ev.params.humanityId) as Humanity;
  const claimer = Claimer.load(humanity.owner as Bytes) as Claimer;
  humanity.claimed = false;
  humanity.owner = null;
  humanity.save();

  claimer.humanity = null;
  claimer.hasHumanity = false;
  claimer.save();

  if (
    // 2e20f5b8 = keccak(processVouches(bytes20,uint256,uint256))[:10]
    ev.transaction.input.toHexString().slice(0, 10) == "0x2e20f5b8" &&
    claimer.currentRequest != null
  ) {
    const request = Request.load(claimer.currentRequest) as Request;
    request.requesterLost = true;
    request.save();
  }

  const counter = getCounter();
  counter.registered = counter.registered.minus(ONE_BI);
  counter.removed = counter.removed.plus(ONE_BI);
  counter.save();
}

export function handleClaimRequest(ev: ClaimRequest): void {
  let humanity = Humanity.load(ev.params.humanityId);
  if (humanity == null) humanity = New.Humanity(ev.params.humanityId);
  humanity.nbRequests = humanity.nbRequests.plus(ONE_BI);
  humanity.save();

  let claimer = Claimer.load(ev.params.requester);
  if (claimer == null) {
    claimer = New.Claimer(ev.params.requester);
    claimer.name = ev.params.name;
    claimer.targetHumanity = humanity.id;
    claimer.lastRequestTime = ev.block.timestamp;
  }
  claimer.targetHumanity = humanity.id;

  const request = newRequest(
    humanity.id,
    claimer.id,
    humanity.nbRequests,
    ev.params.evidence,
    ev,
    false
  );

  claimer.currentRequest = request.id;
  claimer.save();

  const counter = getCounter();
  counter.vouching = counter.vouching.plus(ONE_BI);
  counter.save();
}

export function handleRenewalRequest(ev: RenewalRequest): void {
  const humanity = Humanity.load(ev.params.humanityId) as Humanity;
  const claimer = Claimer.load(ev.params.requester) as Claimer;
  claimer.targetHumanity = humanity.id;

  humanity.nbRequests = humanity.nbRequests.plus(ONE_BI);
  humanity.save();

  const request = newRequest(
    humanity.id,
    claimer.id,
    humanity.nbRequests,
    ev.params.evidence,
    ev,
    false
  );

  claimer.currentRequest = request.id;
  claimer.save();

  const counter = getCounter();
  counter.vouching = counter.vouching.plus(ONE_BI);
  counter.save();
}

export function handleRevocationRequest(ev: RevocationRequest): void {
  const humanity = Humanity.load(ev.params.humanityId) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE_BI);
  humanity.nbRequests = humanity.nbRequests.plus(ONE_BI);
  humanity.save();

  newRequest(
    humanity.id,
    humanity.owner as Bytes,
    humanity.nbRequests,
    ev.params.evidence,
    ev,
    true
  );

  const counter = getCounter();
  counter.pendingRevocations = counter.pendingRevocations.plus(ONE_BI);
  counter.save();
}

export function handleVouchAdded(ev: VouchAdded): void {
  const voucher = Claimer.load(ev.params.voucherAccount);
  const claimer = Claimer.load(ev.params.claimer);
  const humanity = Humanity.load(ev.params.humanityId);

  if (voucher == null || claimer == null || humanity == null) return;

  const vouch = new Vouch(genId3(voucher.id, claimer.id, humanity.id));
  vouch.for = claimer.id;
  vouch.from = voucher.id;
  vouch.humanity = humanity.id;
  vouch.save();

  claimer.vouchesReceived = claimer.vouchesReceived.concat([vouch.id]);
  claimer.nbVouchesReceived = claimer.nbVouchesReceived.plus(ONE_BI);
  claimer.save();
}

export function handleVouchRemoved(ev: VouchRemoved): void {
  const voucher = Claimer.load(ev.params.voucherAccount);
  const claimer = Claimer.load(ev.params.claimer);
  const humanity = Humanity.load(ev.params.humanityId);
  if (voucher == null || claimer == null || humanity == null) return;

  const vouchId = genId3(voucher.id, claimer.id, humanity.id);
  if (Vouch.load(vouchId) == null) return;

  const newVouchees = new Array<Bytes>();
  for (let i = 0; i < claimer.vouchesReceived.length; i++)
    if (claimer.vouchesReceived[i] != vouchId)
      newVouchees.push(claimer.vouchesReceived[i]);
  claimer.vouchesReceived = newVouchees;
  claimer.nbVouchesReceived = claimer.nbVouchesReceived.minus(ONE_BI);
  claimer.save();
}

export function handleRequestWithdrawn(ev: RequestWithdrawn): void {
  const request = Request.load(
    genId(ev.params.humanityId, biToBytes(ev.params.requestId))
  ) as Request;
  request.status = Status.Withdrawn;
  request.resolutionTime = ev.block.timestamp;
  request.save();

  const claimer = Claimer.load(request.requester) as Claimer;
  claimer.targetHumanity = ZERO;
  claimer.currentRequest = ZERO;
  claimer.save();

  const counter = getCounter();
  counter.vouching = counter.vouching.minus(ONE_BI);
  counter.save();
}

export function handleVouchRegistered(ev: VouchRegistered): void {
  const voucherHumanity = Humanity.load(
    ev.params.voucherHumanityId
  ) as Humanity;
  const voucher = Claimer.load(voucherHumanity.owner as Bytes) as Claimer;

  const request = Request.load(
    genId(ev.params.vouchedHumanityId, biToBytes(ev.params.requestId))
  ) as Request;

  const vouchId = genId3(
    voucher.id,
    request.claimer,
    ev.params.vouchedHumanityId
  );
  let vouch = Vouch.load(vouchId);
  if (vouch == null) {
    vouch = new Vouch(vouchId);
    vouch.for = request.claimer;
    vouch.from = voucher.id;
    vouch.humanity = ev.params.vouchedHumanityId;
    vouch.save();
  }

  voucherHumanity.usedVouch = request.id;
  voucherHumanity.save();

  request.vouches = request.vouches.concat([vouch.id]);
  request.save();
}

export function handleStateAdvanced(ev: StateAdvanced): void {
  const claimer = Claimer.load(ev.params.claimer) as Claimer;

  const humanity = Humanity.load(claimer.targetHumanity as Bytes) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE_BI);
  humanity.save();

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.lastStatusChange = ev.block.timestamp;
  request.status = Status.Resolving;
  request.save();

  const counter = getCounter();
  counter.vouching = counter.vouching.minus(ONE_BI);
  counter.pendingClaims = counter.pendingClaims.plus(ONE_BI);
  counter.save();
}

export function handleRequestChallenged(ev: RequestChallenged): void {
  const reason = Reason.parse(ev.params.reason);

  const request = Request.load(
    genId(ev.params.humanityId, biToBytes(ev.params.requestId))
  ) as Request;
  request.status = Status.Disputed;
  request.usedReasons = request.usedReasons.concat([reason]);
  request.currentReason = reason;

  if (ev.params.evidence) {
    const evidence = new Evidence(
      genId(request.id, biToBytes(request.nbEvidence))
    );
    evidence.creationTime = ev.block.timestamp;
    evidence.request = request.id;
    evidence.URI = ev.params.evidence;
    evidence.sender = ev.transaction.from;
    evidence.save();
  }

  const challenge = Challenge.load(
    genId(request.id, biToBytes(request.nbChallenges))
  ) as Challenge;
  challenge.reason = reason;
  challenge.challenger = ev.transaction.from;
  challenge.disputeId = ev.params.disputeId;
  challenge.nbRounds = ONE_BI;
  challenge.save();

  request.nbChallenges = request.nbChallenges.plus(ONE_BI);
  request.save();

  const round = New.Round(challenge.id, ONE_BI);
  round.creationTime = ev.block.timestamp;
  round.save();

  const counter = getCounter();
  counter.challengedClaims = counter.challengedClaims.plus(ONE_BI);
  counter.pendingClaims = counter.pendingClaims.minus(ONE_BI);
  counter.save();
}

export function handleChallengePeriodRestart(ev: ChallengePeriodRestart): void {
  const request = Request.load(
    genId(ev.params.humanityId, biToBytes(ev.params.requestId))
  ) as Request;
  request.status = Status.Resolving;
  request.currentReason = Reason.None;
  request.challengePeriodEnd = ev.block.timestamp.plus(
    getContract().challengePeriodDuration
  );
  request.save();
}

export function handleRuling(ev: Ruling): void {
  const poh = ProofOfHumanity.bind(ev.address);
  const ruling = Party.parse(ev.params._ruling.toI32());

  const disputeData = poh.disputeIdToData(
    ev.params._arbitrator,
    ev.params._disputeID
  );

  const humanity = Humanity.load(disputeData.getHumanityId()) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE_BI);

  const request = Request.load(
    genId(humanity.id, biToBytes(disputeData.getRequestId()))
  ) as Request;
  request.resolutionTime = ev.block.timestamp;
  request.status = Status.Resolved;

  const challenge = Challenge.load(
    genId(
      genId(humanity.id, biToBytes(disputeData.getRequestId())),
      biToBytes(disputeData.getChallengeId())
    )
  ) as Challenge;
  challenge.ruling = ruling;
  challenge.appealPeriodEnd = ZERO_BI;
  challenge.appealPeriodStart = ZERO_BI;
  challenge.save();

  const counter = getCounter();

  if (request.revocation) humanity.pendingRevocation = false;
  else {
    if (ruling == Party.Challenger)
      request.ultimateChallenger = challenge.challenger;
    else if (ruling == Party.None) request.requesterLost = true;

    counter.pendingClaims = counter.pendingClaims.minus(ONE_BI);
  }

  request.save();
  humanity.save();
  counter.save();
}

export function handleAppealCreated(ev: AppealCreated): void {
  const poh = ProofOfHumanity.bind(ev.address);

  const disputeData = poh.disputeIdToData(
    ev.params.arbitrator,
    ev.params.disputeId
  );

  const request = Request.load(
    genId(disputeData.getHumanityId(), biToBytes(disputeData.getRequestId()))
  ) as Request;

  const challenge = Challenge.load(
    genId(request.id, biToBytes(disputeData.getChallengeId()))
  ) as Challenge;
  challenge.nbRounds = challenge.nbRounds.plus(ONE_BI);
  challenge.save();

  const nxtRound = New.Round(challenge.id, challenge.nbRounds);
  nxtRound.creationTime = ev.block.timestamp;
  nxtRound.save();
}

export function handleHumanityClaimed(ev: HumanityClaimed): void {
  const contract = getContract();

  const humanity = Humanity.load(ev.params.humanityId) as Humanity;
  const request = Request.load(
    genId(humanity.id, biToBytes(ev.params.requestId))
  ) as Request;
  request.status = Status.Resolved;
  request.resolutionTime = ev.block.timestamp;
  request.save();

  const claimer = Claimer.load(request.requester) as Claimer;
  claimer.humanity = humanity.id;
  claimer.hasHumanity = true;
  claimer.lastRequestTime = ev.block.timestamp;
  claimer.save();

  humanity.claimed = true;
  humanity.owner = claimer.id;
  humanity.expirationTime = ev.block.timestamp.plus(contract.humanityLifespan);
  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE_BI);
  humanity.save();
}

export function handleHumanityRevoked(ev: HumanityRevoked): void {
  const humanity = Humanity.load(ev.params.humanityId) as Humanity;
  const request = Request.load(
    genId(humanity.id, biToBytes(ev.params.requestId))
  ) as Request;
  request.status = Status.Resolved;
  request.resolutionTime = ev.block.timestamp;
  request.save();

  const claimer = Claimer.load(request.claimer) as Claimer;
  claimer.humanity = null;
  claimer.hasHumanity = false;
  claimer.save();

  humanity.claimed = false;
  humanity.owner = null;
  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE_BI);
  humanity.save();
}

export function handleVouchesProcessed(ev: VouchesProcessed): void {
  const request = Request.load(
    genId(ev.params.humanityId, biToBytes(ev.params.requestId))
  ) as Request;

  request.lastProcessedVouchIndex = ev.params.endIndex;
  request.save();

  for (let i = 0; i < ev.params.endIndex.toI32(); i++) {
    const voucherHumanity = Humanity.load(request.vouches[i]) as Humanity;
    voucherHumanity.usedVouch = null;
    voucherHumanity.save();
  }
}

export function handleContribution(ev: ContributionEv): void {
  const round = Round.load(
    genId(
      genId(
        genId(ev.params.humanityId, biToBytes(ev.params.requestId)),
        biToBytes(ev.params.challengeId)
      ),
      biToBytes(ev.params.round)
    )
  ) as Round;

  let contribution = Contribution.load(genId(round.id, ev.params.contributor));
  if (contribution == null) {
    contribution = New.Contribution(round.id, ev.params.contributor);
    round.nbContributions = round.nbContributions.plus(ONE_BI);
  }

  if (Party.parse(ev.params.side) == Party.Requester) {
    round.requesterFunds = round.requesterFunds.plus(ev.params.contribution);
    if (ev.transaction.value >= ev.params.contribution)
      round.requesterPaid = true;
    contribution.forRequester = ev.params.contribution;
  } else {
    round.challengerFunds = round.challengerFunds.plus(ev.params.contribution);
    if (ev.transaction.value >= ev.params.contribution)
      round.challengerPaid = true;
    contribution.forChallenger = ev.params.contribution;
  }

  round.feeRewards = round.feeRewards.plus(ev.params.contribution);

  contribution.save();
  round.save();
}

export function handleFeesAndRewardsWithdrawn(
  ev: FeesAndRewardsWithdrawn
): void {
  const request = Request.load(
    genId(ev.params.humanityId, biToBytes(ev.params.requestId))
  ) as Request;

  const round = Round.load(
    genId(
      genId(request.id, biToBytes(ev.params.challengeId)),
      biToBytes(ev.params.round)
    )
  ) as Round;

  if (
    ev.params.beneficiary == request.ultimateChallenger &&
    ev.params.challengeId == ZERO_BI &&
    ev.params.round == ZERO_BI
  )
    round.feeRewards = ZERO_BI;

  const contribution = Contribution.load(
    genId(round.id, ev.params.beneficiary)
  ) as Contribution;
  contribution.forRequester = ZERO_BI;
  contribution.forChallenger = ZERO_BI;
  contribution.save();
}

export function handleEvidence(ev: EvidenceEvent): void {
  const methodInput = ev.transaction.input.toHexString();
  const functionSig = Bytes.fromHexString(methodInput.slice(0, 10));
  if (functionSig != submitEvidenceSig) return;

  const humanityId = Bytes.fromHexString("0x" + methodInput.slice(10, 50));
  const requestId = BigInt.fromString(methodInput.slice(74, 138));

  const request = Request.load(
    genId(humanityId, biToBytes(requestId))
  ) as Request;

  const evidence = new Evidence(
    genId(request.id, biToBytes(request.nbEvidence))
  );
  evidence.creationTime = ev.block.timestamp;
  evidence.request = request.id;
  evidence.URI = ev.params._evidence;
  evidence.sender = ev.transaction.from;
  evidence.save();

  request.nbEvidence = request.nbEvidence.plus(ONE_BI);
  request.save();
}

export function newRequest(
  humanityId: Bytes,
  claimer: Bytes,
  requestIndex: BigInt,
  evidenceUri: string,
  ev: ethereum.Event,
  revocation: boolean
): Request {
  const request = New.Request(humanityId, claimer, requestIndex, revocation);
  request.creationTime = ev.block.timestamp;
  request.requester = ev.transaction.from;
  request.lastStatusChange = ev.block.timestamp;
  request.nbEvidence = ONE_BI;
  request.save();

  const evidence = new Evidence(genId(request.id, ZERO));
  evidence.creationTime = ev.block.timestamp;
  evidence.URI = evidenceUri;
  evidence.request = request.id;
  evidence.sender = ev.transaction.from;
  evidence.save();

  const challenge = New.Challenge(request.id, ZERO_BI);
  challenge.creationTime = ev.block.timestamp;
  challenge.save();

  const round = New.Round(challenge.id, ZERO_BI);
  round.creationTime = ev.block.timestamp;
  round.save();

  return request;
}
