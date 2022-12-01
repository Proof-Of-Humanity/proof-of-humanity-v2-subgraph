import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
  MetaEvidence,
  ProofOfHumanity,
  VouchAdded,
  VouchRemoved,
  HumanityClaim,
  HumanityRenewal,
  HumanityRevocation,
  RequestWithdrawn,
  StateAdvanced,
  RequestChallenged,
  RequestExecuted,
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
  RequestContribution,
  VouchesProcessed,
  // EvidenceAppended,
  FeesAndRewardsWithdrawn,
  Evidence as EvidenceEvent,
  AppealContribution,
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

  claimer.lastRequestTime = ev.block.timestamp;
  claimer.humanity = humanity.id;
  claimer.hasHumanity = true;
  claimer.save();

  // const request = New.Request(
  //   humanity.id,
  //   claimer.id,
  //   humanity.nbRequests,
  //   true
  // );
  // request.creationTime = ev.block.timestamp;
  // request.requester = ev.address;
  // request.status = Status.Resolved;
  // request.lastStatusChange = ev.block.timestamp;
  // request.nbEvidence = ONE_BI;
  // request.save();

  // humanity.nbRequests = humanity.nbRequests.plus(ONE_BI);
  humanity.save();

  const counter = getCounter();
  counter.registered = counter.registered.plus(ONE_BI);
  counter.save();
}

export function handleHumanityRevokedManually(
  ev: HumanityRevokedManually
): void {
  const claimer = Claimer.load(ev.params.human) as Claimer;
  const humanity = Humanity.load(claimer.humanity as Bytes) as Humanity;
  humanity.claimed = false;
  humanity.owner = null;
  humanity.save();

  claimer.humanity = null;
  claimer.hasHumanity = false;
  claimer.save();

  const counter = getCounter();
  counter.registered = counter.registered.minus(ONE_BI);
  counter.removed = counter.removed.plus(ONE_BI);
  counter.save();
}

export function handleHumanityClaim(ev: HumanityClaim): void {
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
    true
  );

  claimer.currentRequest = request.id;
  claimer.save();

  const counter = getCounter();
  counter.vouching = counter.vouching.plus(ONE_BI);
  counter.save();

  log.info("GGG Claim humanity: {} -> {}", [
    claimer.id.toHexString(),
    humanity.id.toString(),
  ]);
}

export function handleHumanityRenewal(ev: HumanityRenewal): void {
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
    true
  );

  claimer.currentRequest = request.id;
  claimer.save();

  const counter = getCounter();
  counter.vouching = counter.vouching.plus(ONE_BI);
  counter.save();
}

export function handleHumanityRevocation(ev: HumanityRevocation): void {
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
    false
  );

  const counter = getCounter();
  counter.pendingRevocations = counter.pendingRevocations.plus(ONE_BI);
  counter.save();
}

export function handleVouchAdded(ev: VouchAdded): void {
  const voucher = Claimer.load(ev.params.voucher);
  const vouchedClaimer = Claimer.load(ev.params.vouched);
  const vouchedHumanity = Humanity.load(ev.params.humanityId);

  if (voucher == null || vouchedClaimer == null || vouchedHumanity == null)
    return;

  const vouch = new Vouch(
    genId3(voucher.id, vouchedClaimer.id, vouchedHumanity.id)
  );
  vouch.for = vouchedClaimer.id;
  vouch.from = voucher.id;
  vouch.humanity = vouchedHumanity.id;
  vouch.save();

  vouchedClaimer.vouchesReceived = vouchedClaimer.vouchesReceived.concat([
    vouch.id,
  ]);
  vouchedClaimer.save();
}

export function handleVouchRemoved(ev: VouchRemoved): void {
  const voucher = Claimer.load(ev.params.voucher);
  const vouchedClaimer = Claimer.load(ev.params.vouched);
  const vouchedHumanity = Humanity.load(ev.params.humanityId);
  if (voucher == null || vouchedClaimer == null || vouchedHumanity == null)
    return;

  const vouchId = genId3(voucher.id, vouchedClaimer.id, vouchedHumanity.id);
  if (Vouch.load(vouchId) == null) return;

  const newVouchees = new Array<Bytes>();
  for (let i = 0; i < vouchedClaimer.vouchesReceived.length; i++)
    if (vouchedClaimer.vouchesReceived[i] != vouchId)
      newVouchees.push(vouchedClaimer.vouchesReceived[i]);
  vouchedClaimer.vouchesReceived = newVouchees;
  vouchedClaimer.save();
}

export function handleRequestWithdrawn(ev: RequestWithdrawn): void {
  const poh = ProofOfHumanity.bind(ev.address);

  const request = Request.load(
    genId(ev.params.humanityId, biToBytes(ev.params.requestId))
  ) as Request;
  request.status = "Resolved";
  request.resolutionTime = ev.block.timestamp;
  request.save();

  const claimer = Claimer.load(request.requester) as Claimer;
  claimer.targetHumanity = ZERO;
  claimer.currentRequest = ZERO;
  claimer.save();

  const roundInfo = poh.getRoundInfo(
    request.humanity,
    request.index,
    ZERO_BI,
    ZERO_BI
  );

  const round = Round.load(genId(genId(request.id, ZERO), ZERO)) as Round;
  round.requesterFunds = roundInfo.getPaidFeesRequester();
  round.requesterPaid =
    Party.parse(roundInfo.getSideFunded()) == Party.Requester;
  round.feeRewards = roundInfo.getFeeRewards();

  const contributions = poh.getContributions(
    request.humanity,
    request.index,
    ZERO_BI,
    ZERO_BI,
    ev.transaction.from
  );

  const contribution = Contribution.load(
    genId(round.id, ev.transaction.from)
  ) as Contribution;
  contribution.forRequester = contributions.getForRequester();
  contribution.save();
  round.save();

  const counter = getCounter();
  counter.vouching = counter.vouching.minus(ONE_BI);
  counter.save();
}

export function handleStateAdvanced(ev: StateAdvanced): void {
  const claimer = Claimer.load(ev.params.claimer) as Claimer;

  const humanity = Humanity.load(claimer.targetHumanity as Bytes) as Humanity;
  humanity.nbPendingRequests = humanity.nbPendingRequests.plus(ONE_BI);
  humanity.save();

  const request = Request.load(claimer.currentRequest as Bytes) as Request;
  request.lastStatusChange = ev.block.timestamp;

  for (let i = 0; i < 0; i++) {
    const vouch = Vouch.load(claimer.vouchesReceived[i]) as Vouch;
    const voucher = Claimer.load(vouch.from) as Claimer;
    const voucherHumanity = Humanity.load(vouch.humanity) as Humanity;

    if (
      voucherHumanity.usedVouch ||
      voucherHumanity.owner != voucher.id ||
      !voucher.hasHumanity ||
      !voucherHumanity.claimed ||
      ev.block.timestamp.gt(voucherHumanity.expirationTime)
    )
      continue;

    voucherHumanity.usedVouch = claimer.id;
    voucherHumanity.save();
  }

  request.status = "Resolving";
  request.save();

  const counter = getCounter();
  counter.vouching = counter.vouching.minus(ONE_BI);
  counter.pendingClaims = counter.pendingClaims.plus(ONE_BI);
  counter.save();
}

export function handleRequestChallenged(ev: RequestChallenged): void {
  const poh = ProofOfHumanity.bind(ev.address);

  const reason = Reason.parse(ev.params.reason);

  const request = Request.load(
    genId(ev.params.humanityId, biToBytes(ev.params.requestId))
  ) as Request;
  request.status = "Disputed";
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

  const challengeInfo = poh.getChallengeInfo(
    request.humanity,
    request.index,
    request.nbChallenges
  );

  // log.warning("Number of challenges: {}", [request.nbChallenges.toString()]);
  // log.warning("Is challenge there? {}", [(Challenge.load(genId(request.id, biToBytes(request.nbChallenges))) == null).toString()]);

  const challenge = Challenge.load(
    genId(request.id, biToBytes(request.nbChallenges))
  ) as Challenge;
  challenge.reason = reason;
  challenge.challenger = ev.transaction.from;
  challenge.disputeId = challengeInfo.getDisputeId();
  challenge.nbRounds = ONE_BI;
  challenge.save();

  request.nbChallenges = request.nbChallenges.plus(ONE_BI);
  request.save();

  const roundInfo = poh.getRoundInfo(
    request.humanity,
    request.index,
    request.nbChallenges,
    ZERO_BI
  );

  log.warning("Is round there? {}", [
    (Round.load(genId(challenge.id, ZERO)) == null).toString(),
  ]);

  let round = Round.load(genId(challenge.id, ZERO)) as Round;
  round.challengerFunds = roundInfo.getPaidFeesChallenger();
  round.challengerPaid =
    Party.parse(roundInfo.getSideFunded()) == Party.Challenger;
  round.feeRewards = roundInfo.getFeeRewards();
  round.nbContributions = round.nbContributions.plus(ONE_BI);
  round.save();

  const contributions = poh.getContributions(
    request.humanity,
    request.index,
    request.nbChallenges,
    ZERO_BI,
    ev.transaction.from
  );

  const contribution = New.Contribution(round.id, ev.transaction.from);
  contribution.forRequester = contributions.getForRequester();
  contribution.forChallenger = contributions.getForChallenger();
  contribution.save();

  round = New.Round(challenge.id, ONE_BI);
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
  const constract = getContract();

  if (request.registration) {
    if (ruling == Party.Requester) {
      if (!request.requesterLost && request.usedReasons.length == 4) {
        const claimer = Claimer.load(request.requester) as Claimer;
        claimer.humanity = humanity.id;
        claimer.hasHumanity = true;
        claimer.targetHumanity = ZERO;
        claimer.currentRequest = ZERO;
        claimer.save();

        humanity.owner = claimer.id;
        humanity.claimed = true;
        humanity.expirationTime = ev.block.timestamp.plus(
          constract.humanityLifespan
        );

        counter.registered = counter.registered.plus(ONE_BI);
      }
    } else {
      if (ruling == Party.Challenger)
        request.ultimateChallenger = challenge.challenger;
      request.requesterLost = true;
    }

    counter.pendingClaims = counter.pendingClaims.minus(ONE_BI);
  } else {
    humanity.pendingRevocation = false;
    if (ruling == Party.Requester) {
      const claimer = Claimer.load(humanity.owner as Bytes) as Claimer;
      claimer.humanity = humanity.id;
      claimer.hasHumanity = true;
      claimer.save();

      humanity.owner = null;
      humanity.claimed = false;

      counter.registered = counter.registered.minus(ONE_BI);
      counter.removed = counter.removed.plus(ONE_BI);
    }

    counter.pendingRevocations = counter.pendingRevocations.minus(ONE_BI);
  }

  request.save();
  humanity.save();
  counter.save();
}

export function handleAppealContribution(ev: AppealContribution): void {
  const poh = ProofOfHumanity.bind(ev.address);

  const disputeData = poh.disputeIdToData(
    ev.params.arbitrator,
    ev.params.disputeId
  );

  const challenge = Challenge.load(
    genId(
      genId(disputeData.getHumanityId(), biToBytes(disputeData.getRequestId())),
      biToBytes(disputeData.getChallengeId())
    )
  ) as Challenge;

  const roundInfo = poh.getRoundInfo(
    disputeData.getHumanityId(),
    disputeData.getRequestId(),
    disputeData.getChallengeId(),
    challenge.nbRounds
  );

  const round = Round.load(
    genId(challenge.id, biToBytes(challenge.nbRounds))
  ) as Round;
  round.creationTime = ev.block.timestamp;
  round.requesterFunds = roundInfo.getPaidFeesRequester();
  round.challengerFunds = roundInfo.getPaidFeesChallenger();
  round.requesterPaid = Party.parse(roundInfo.getSideFunded()) == Party.None;
  round.challengerPaid = Party.parse(roundInfo.getSideFunded()) == Party.None;
  round.feeRewards = roundInfo.getFeeRewards();

  const contributions = poh.getContributions(
    disputeData.getHumanityId(),
    disputeData.getRequestId(),
    disputeData.getChallengeId(),
    challenge.nbRounds,
    ev.transaction.from
  );

  let contribution = Contribution.load(genId(round.id, ev.transaction.from));
  if (contribution == null) {
    round.nbContributions = round.nbContributions.plus(ONE_BI);
    contribution = New.Contribution(round.id, ev.transaction.from);
  }
  contribution.forRequester = contributions.getForRequester();
  contribution.forChallenger = contributions.getForChallenger();
  contribution.save();
  round.save();
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

export function handleRequestExecuted(ev: RequestExecuted): void {
  const poh = ProofOfHumanity.bind(ev.address);

  const contract = getContract();

  const humanity = Humanity.load(ev.params.humanityId) as Humanity;
  const request = Request.load(
    genId(humanity.id, biToBytes(ev.params.requestId))
  ) as Request;
  request.status = "Resolved";
  request.resolutionTime = ev.block.timestamp;
  request.save();

  if (!request.requesterLost) {
    if (request.registration) {
      const claimer = Claimer.load(request.requester) as Claimer;
      claimer.humanity = humanity.id;
      claimer.hasHumanity = true;
      claimer.lastRequestTime = ev.block.timestamp;
      claimer.save();

      humanity.claimed = true;
      humanity.owner = claimer.id;
      humanity.expirationTime = ev.block.timestamp.plus(
        contract.humanityLifespan
      );
    } else {
      const claimer = Claimer.load(request.claimer) as Claimer;
      claimer.humanity = null;
      claimer.hasHumanity = false;
      claimer.save();

      humanity.claimed = false;
      humanity.owner = null;
    }
  }
  humanity.nbPendingRequests = humanity.nbPendingRequests.minus(ONE_BI);
  humanity.save();

  const roundInfo = poh.getRoundInfo(
    ev.params.humanityId,
    ev.params.requestId,
    ZERO_BI,
    ZERO_BI
  );

  const round = Round.load(genId(genId(request.id, ZERO), ZERO)) as Round;
  round.requesterFunds = roundInfo.getPaidFeesRequester();
  round.feeRewards = roundInfo.getFeeRewards();
  round.save();

  const contributions = poh.getContributions(
    ev.params.humanityId,
    ev.params.requestId,
    ZERO_BI,
    ZERO_BI,
    changetype<Address>(request.requester)
  );

  const contribution = Contribution.load(
    genId(round.id, request.requester)
  ) as Contribution;
  contribution.forRequester = contributions.getForRequester();
  contribution.forChallenger = contributions.getForChallenger();
  contribution.save();

  log.info("GGG markVouchesAsProcessed", []);
}

export function handleRequestContribution(ev: RequestContribution): void {
  const poh = ProofOfHumanity.bind(ev.address);

  const claimer = Claimer.load(ev.params.claimer) as Claimer;
  const request = Request.load(claimer.currentRequest as Bytes) as Request;

  let roundInfo = poh.getRoundInfo(
    claimer.targetHumanity as Bytes,
    request.index,
    ZERO_BI,
    ZERO_BI
  );

  const round = Round.load(genId(genId(request.id, ZERO), ZERO)) as Round;
  round.requesterFunds = roundInfo.getPaidFeesRequester();
  round.requesterPaid =
    Party.parse(roundInfo.getSideFunded()) == Party.Requester;
  round.feeRewards = roundInfo.getFeeRewards();

  const contributions = poh.getContributions(
    claimer.targetHumanity as Bytes,
    request.index,
    ZERO_BI,
    ZERO_BI,
    ev.transaction.from
  );

  let contribution = Contribution.load(genId(round.id, ev.transaction.from));
  if (contribution == null) {
    contribution = New.Contribution(round.id, ev.transaction.from);
    round.nbContributions = round.nbContributions.plus(ONE_BI);
  }

  contribution.forRequester = contributions.getForRequester();
  contribution.save();
  round.save();
}

export function handleVouchesProcessed(ev: VouchesProcessed): void {
  const request = Request.load(
    genId(ev.params.humanityId, biToBytes(ev.params.requestId))
  ) as Request;

  request.lastProcessedVouchIndex = ev.params.endIndex;
  request.save();

  for (let i = 0; i < ev.params.endIndex.toI32(); i++) {
    const voucher = Claimer.load(request.vouches[i]) as Claimer;
    const voucherHumanity = Humanity.load(request.vouches[i]) as Humanity;
    voucherHumanity.usedVouch = null;

    if (
      request.ultimateChallenger &&
      voucher.currentRequest &&
      (request.usedReasons[request.usedReasons.length - 1] == "Duplicate" ||
        request.usedReasons[request.usedReasons.length - 1] == "DoesNotExist")
    ) {
      const voucherRequest = Request.load(
        voucher.currentRequest as Bytes
      ) as Request;

      if (
        voucherRequest.status == "Vouching" ||
        voucherRequest.status == "Resolving"
      ) {
        voucherRequest.requesterLost = true;
        voucherRequest.save();
      }

      voucher.humanity = null;
      voucher.hasHumanity = false;
      voucher.save();

      voucherHumanity.owner = null;
      voucherHumanity.claimed = false;
    }
    voucherHumanity.save();
  }
}

export function handleFeesAndRewardsWithdrawn(
  ev: FeesAndRewardsWithdrawn
): void {
  // const poh = ProofOfHumanity.bind(ev.address);
  // const request = Request.load(
  //   ev.params.humanityId
  //     .toHexString()
  //     .concat("#")
  //     .concat(ev.params.requestId.toString())
  // ) as Request;
  // const round = Round.load(
  //   request.id
  //     .concat("#")
  //     .concat(ev.params.challengeId.toString())
  //     .concat("#")
  //     .concat(ev.params.round.toString())
  // );
  // if (round == null) {
  //   log.warning("Could not find round | tx {}", [
  //     ev.transaction.hash.toHexString(),
  //   ]);
  //   return;
  // }
  // const roundInfo = poh.getRoundInfo(
  //   ev.params.humanityId,
  //   ev.params.requestId,
  //   ev.params.challengeId,
  //   ev.params.round
  // );
  // const contributions = poh.getContributions(
  //   ev.params.humanityId,
  //   ev.params.requestId,
  //   ev.params.challengeId,
  //   ev.params.round,
  //   ev.params.beneficiary
  // );
  // round.requesterFunds = roundInfo.getPaidFeesRequester();
  // round.challengerFunds = roundInfo.getPaidFeesChallenger();
  // if (roundInfo.appealed) {
  //   round.requesterPaid = Party.parse(roundInfo.getSideFunded()) == Party.None;
  //   round.challengerPaid = Party.parse(roundInfo.getSideFunded()) == Party.None;
  // } else {
  //   round.requesterPaid = Party.parse(roundInfo.getSideFunded()) == Party.Requester;
  //   round.challengerPaid =
  //     Party.parse(roundInfo.getSideFunded()) == Party.Challenger;
  // }
  // round.feeRewards = roundInfo.getFeeRewards();
  // round.save();
  // const contribution = Contribution.load(
  //   round.id.concat("#").concat(ev.params.beneficiary.toString())
  // ) as Contribution;
  // if (contribution != null) {
  //   contribution.forRequester = contributions.forRequester;
  //   contribution.forChallenger = contributions.forChallenger;
  //   contribution.save();
  // }
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
  registration: boolean
): Request {
  const poh = ProofOfHumanity.bind(ev.address);

  const request = New.Request(humanityId, claimer, requestIndex, registration);
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

  const roundInfo = poh.getRoundInfo(
    humanityId,
    requestIndex,
    ZERO_BI,
    ZERO_BI
  );

  const round = New.Round(challenge.id, ZERO_BI);
  round.creationTime = ev.block.timestamp;
  round.requesterFunds = roundInfo.getPaidFeesRequester();
  round.requesterPaid =
    Party.parse(roundInfo.getSideFunded()) == Party.Requester;
  round.challengerFunds = roundInfo.getPaidFeesChallenger();
  round.feeRewards = roundInfo.getFeeRewards();
  round.nbContributions = ONE_BI;
  round.save();

  const contribution = New.Contribution(round.id, ev.transaction.from);
  contribution.forRequester = roundInfo.getPaidFeesRequester();
  contribution.forChallenger = roundInfo.getPaidFeesChallenger();
  contribution.save();

  return request;
}
