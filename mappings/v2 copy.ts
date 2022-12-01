// import {
//   Address,
//   BigInt,
//   Bytes,
//   ethereum,
//   log,
//   store,
// } from "@graphprotocol/graph-ts";
// import {
//   MetaEvidence,
//   ProofOfHumanity,
//   ChangeRequestBaseDepositCall,
//   ChangeDurationsCall,
//   ChangeRequiredNumberOfVouchesCall,
//   ChangeWinnerStakeMultiplierCall,
//   ChangeSharedStakeMultiplierCall,
//   ChangeLoserStakeMultiplierCall,
//   ChangeGovernorCall,
//   ChangeArbitratorCall,
//   FundRequestCall,
//   VouchAdded,
//   VouchRemoved,
//   SubmitEvidenceCall,
//   SoulClaim,
//   SoulRenewal,
//   SoulRevokal,
//   RequestWithdrawn,
//   StateAdvanced,
//   RequestChallenged,
//   RequestExecuted,
//   ChallengePeriodRestart,
//   ChallengeResolved,
//   AppealCreated,
//   SoulGrantedManually,
//   SoulRevokedManually,
//   WithdrawFeesAndRewardsCall,
//   ProcessVouchesCall,
//   Initialized,
// } from "../generated/ProofOfHumanity/ProofOfHumanity";
// import {
//   ArbitratorData,
//   Challenge,
//   Claimer,
//   Contract,
//   Contribution,
//   Counter,
//   Evidence,
//   Request,
//   Round,
//   Soul,
//   Vouch,
// } from "../generated/schema";
// import { getContract, getCounter, CallParser } from "../utils";
// import {
//   ONE,
//   ONE_BI,
//   Party,
//   Reason,
//   Status,
//   TWO_BI,
//   ZERO,
//   ZERO_ADDRESS,
//   ZERO_BI,
// } from "../utils/constants";

// export function handleInitialized(ev: Initialized): void {
//   const poh = ProofOfHumanity.bind(ev.address);

//   let contract = Contract.load(ZERO);
//   if (contract == null) contract = new Contract(ZERO);
//   contract.address = ev.address;
//   contract.governor = poh.governor();
//   contract.requestBaseDeposit = poh.requestBaseDeposit();
//   contract.soulLifespan = poh.soulLifespan();
//   contract.renewalTime = poh.renewalPeriodDuration();
//   contract.challengePeriodDuration = poh.challengePeriodDuration();
//   contract.requiredNumberOfVouches = poh.requiredNumberOfVouches();
//   contract.sharedStakeMultiplier = poh.sharedStakeMultiplier();
//   contract.winnerStakeMultiplier = poh.winnerStakeMultiplier();
//   contract.loserStakeMultiplier = poh.loserStakeMultiplier();
//   contract.save();

//   new Counter(ZERO).save();

//   log.info("GGG Initialization complete", []);
// }

// export function handleMetaEvidence(ev: MetaEvidence): void {
//   const caller = new CallParser(ProofOfHumanity.bind(ev.address));

//   const metaEvidenceUpdates = ev.params._metaEvidenceID.div(TWO_BI);

//   let arbitratorData: ArbitratorData;
//   if (ev.params._metaEvidenceID.mod(TWO_BI).equals(ZERO_BI)) {
//     arbitratorData = new ArbitratorData(metaEvidenceUpdates.toHexString());
//     arbitratorData.registrationMeta = ev.params._evidence;

//     if (metaEvidenceUpdates.equals(ZERO_BI)) {
//       const arbitratorDataItem = caller.arbitratorDataList(ZERO_BI);
//       arbitratorData.arbitrator = arbitratorDataItem.arbitrator;
//       arbitratorData.arbitratorExtraData =
//         arbitratorDataItem.arbitratorExtraData;
//     } else {
//       const prevArbitratorData = ArbitratorData.load(
//         metaEvidenceUpdates.minus(ONE_BI).toHexString()
//       ) as ArbitratorData;
//       arbitratorData.arbitrator = prevArbitratorData.arbitrator;
//       arbitratorData.arbitratorExtraData =
//         prevArbitratorData.arbitratorExtraData;
//     }
//   } else {
//     arbitratorData = ArbitratorData.load(
//       metaEvidenceUpdates.toHexString()
//     ) as ArbitratorData;
//     arbitratorData.clearingMeta = ev.params._evidence;
//   }
//   arbitratorData.save();

//   const contract = getContract();
//   contract.metaEvidenceUpdates = metaEvidenceUpdates;
//   contract.latestArbitratorData = arbitratorData.id;
//   contract.save();

//   log.info("GGG MetaEvidence update | idx: {} | uri: {}", [
//     metaEvidenceUpdates.toString(),
//     ev.params._evidence,
//   ]);
// }

// export function changeRequestBaseDeposit(
//   call: ChangeRequestBaseDepositCall
// ): void {
//   const contract = getContract();
//   contract.requestBaseDeposit = call.inputs._requestBaseDeposit;
//   contract.save();
// }

// export function changeDurations(call: ChangeDurationsCall): void {
//   const contract = getContract();
//   contract.soulLifespan = call.inputs._soulLifespan;
//   contract.renewalTime = call.inputs._renewalPeriodDuration;
//   contract.challengePeriodDuration = call.inputs._challengePeriodDuration;
//   contract.save();
// }

// export function changeRequiredNumberOfVouches(
//   call: ChangeRequiredNumberOfVouchesCall
// ): void {
//   const contract = getContract();
//   contract.requiredNumberOfVouches = call.inputs._requiredNumberOfVouches;
//   contract.save();
// }

// export function changeSharedStakeMultiplier(
//   call: ChangeSharedStakeMultiplierCall
// ): void {
//   const contract = getContract();
//   contract.sharedStakeMultiplier = call.inputs._sharedStakeMultiplier;
//   contract.save();
// }

// export function changeWinnerStakeMultiplier(
//   call: ChangeWinnerStakeMultiplierCall
// ): void {
//   const contract = getContract();
//   contract.winnerStakeMultiplier = call.inputs._winnerStakeMultiplier;
//   contract.save();
// }

// export function changeLoserStakeMultiplier(
//   call: ChangeLoserStakeMultiplierCall
// ): void {
//   const contract = getContract();
//   contract.loserStakeMultiplier = call.inputs._loserStakeMultiplier;
//   contract.save();
// }

// export function changeGovernor(call: ChangeGovernorCall): void {
//   const contract = getContract();
//   contract.governor = call.inputs._governor;
//   contract.save();
// }

// export function changeArbitrator(call: ChangeArbitratorCall): void {
//   const contract = getContract();
//   let metaEvidenceUpdates = contract.metaEvidenceUpdates;
//   const prevArbitratorData = ArbitratorData.load(
//     metaEvidenceUpdates.toHexString()
//   ) as ArbitratorData;
//   metaEvidenceUpdates = metaEvidenceUpdates.plus(ONE_BI);

//   const arbitratorData = new ArbitratorData(metaEvidenceUpdates.toHexString());
//   arbitratorData.registrationMeta = prevArbitratorData.registrationMeta;
//   arbitratorData.clearingMeta = prevArbitratorData.clearingMeta;
//   arbitratorData.arbitrator = call.inputs._arbitrator;
//   arbitratorData.arbitratorExtraData = call.inputs._arbitratorExtraData;
//   arbitratorData.save();

//   contract.metaEvidenceUpdates = metaEvidenceUpdates;
//   contract.latestArbitratorData = arbitratorData.id;
//   contract.save();
// }

// export function handleSoulGrantedManually(ev: SoulGrantedManually): void {
//   let claimer = Claimer.load(ev.params.owner.toHexString());
//   if (claimer == null) claimer = new Claimer(ev.params.owner.toHexString());

//   let soul = Soul.load(ev.params.soulId.toHexString());
//   if (soul == null) soul = new Soul(ev.params.soulId.toHexString());
//   soul.owner = claimer.id;
//   soul.claimed = true;
//   soul.expirationTime = ev.params.expirationTime;

//   claimer.lastRequestTime = ev.block.timestamp;
//   claimer.soul = soul.id;
//   claimer.hasSoul = true;
//   claimer.save();

//   const request = new Request(
//     soul.id
//       .concat("#")
//       .concat(soul.nbRequests.toString())
//       .concat("v1")
//   );
//   request.creationTime = ev.block.timestamp;
//   request.soul = soul.id;
//   request.requester = ev.address;
//   request.registration = true;
//   request.status = Status.Resolved;
//   request.currentReason = Reason.None;
//   request.lastStatusChange = ev.block.timestamp;
//   request.arbitratorData = getContract().metaEvidenceUpdates.toString();
//   request.nbEvidence = ONE_BI;
//   request.save();

//   soul.nbRequests = soul.nbRequests.plus(ONE_BI);
//   soul.save();

//   log.info("GGG Granted soul manually {}", [soul.id]);

//   const counter = getCounter();
//   counter.registered = counter.registered.plus(ONE_BI);
//   counter.save();
// }

// export function handleSoulRevokedManually(ev: SoulRevokedManually): void {
//   log.info("GGG Removing submissions manually {}", [
//     ev.params.human.toHexString(),
//   ]);

//   const claimerID = ev.params.human.toHexString();
//   const claimer = Claimer.load(claimerID) as Claimer;
//   const soul = Soul.load(claimer.soul as string) as Soul;
//   soul.owner = null;
//   soul.claimed = false;
//   soul.save();

//   claimer.hasSoul = false;
//   claimer.soul = null;
//   claimer.save();

//   log.info("GGG Soul revoked manually {}", [ev.params.human.toHexString()]);

//   const counter = getCounter();
//   counter.registered = counter.registered.minus(ONE_BI);
//   counter.removed = counter.removed.plus(ONE_BI);
//   counter.save();
// }

// export function handleSoulClaim(ev: SoulClaim): void {
//   log.info("GGG Soul Claim {} | {} | {}", [
//     ev.params.soulId.toString(),
//     ev.params.requester.toHexString(),
//     ev.params.name,
//   ]);

//   let soul = Soul.load(ev.params.soulId.toString());
//   if (soul == null) soul = new Soul(ev.params.soulId.toString());
//   soul.nbRequests = soul.nbRequests.plus(ONE_BI);
//   soul.save();

//   let claimer = Claimer.load(ev.params.requester.toHexString());
//   if (claimer == null) {
//     claimer = new Claimer(ev.params.requester.toHexString());
//     claimer.name = ev.params.name;
//     claimer.targetSoul = soul.id;
//     claimer.lastRequestTime = ev.block.timestamp;
//   }
//   claimer.targetSoul = soul.id;

//   const request = newRequest(
//     soul.id,
//     soul.nbRequests,
//     ev.params.evidence,
//     ev,
//     true
//   );

//   claimer.currentRequest = request.id;
//   claimer.save();

//   const counter = getCounter();
//   counter.vouching = counter.vouching.plus(ONE_BI);
//   counter.save();

//   log.info("GGG Claim soul: {} -> {}", [claimer.id, soul.id]);
// }

// export function handleSoulRenewal(ev: SoulRenewal): void {
//   const soul = Soul.load(ev.params.soulId.toHexString()) as Soul;
//   const claimer = Claimer.load(ev.params.requester.toHexString()) as Claimer;
//   claimer.targetSoul = soul.id;

//   const request = newRequest(
//     soul.id,
//     soul.nbRequests,
//     ev.params.evidence,
//     ev,
//     true
//   );

//   soul.nbRequests = soul.nbRequests.plus(ONE_BI);
//   soul.save();
//   claimer.currentRequest = request.id;
//   claimer.save();

//   const counter = getCounter();
//   counter.vouching = counter.vouching.plus(ONE_BI);
//   counter.save();

//   log.info("GGG Renew soul: {} -> {}", [claimer.id, soul.id]);
// }

// export function handleSoulRevokal(ev: SoulRevokal): void {
//   const soul = Soul.load(ev.params.soulId.toHexString()) as Soul;

//   newRequest(soul.id, soul.nbRequests, ev.params.evidence, ev, false);

//   soul.nbPendingRequests = soul.nbPendingRequests.plus(ONE_BI);
//   soul.nbRequests = soul.nbRequests.plus(ONE_BI);
//   soul.save();

//   const counter = getCounter();
//   counter.pendingRevokals = counter.pendingRevokals.plus(ONE_BI);
//   counter.save();

//   log.info("GGG Revoke soul: {}", [ev.params.soulId.toHexString()]);
// }

// export function handleVouchAdded(event: VouchAdded): void {
//   const voucher = Claimer.load(event.params.voucher.toHexString());
//   const vouchedClaimer = Claimer.load(event.params.vouched.toHexString());
//   const vouchedSoul = Soul.load(event.params.soulId.toHexString());
//   if (voucher == null || vouchedClaimer == null || vouchedSoul == null) return;

//   const vouch = new Vouch(
//     voucher.id
//       .concat("#")
//       .concat(vouchedClaimer.id)
//       .concat("#")
//       .concat(vouchedSoul.id)
//   );
//   vouch.for = vouchedClaimer.id;
//   vouch.from = voucher.id;
//   vouch.soul = vouchedSoul.id;
//   vouch.save();

//   vouchedClaimer.nbVouchesReceived = vouchedClaimer.nbVouchesReceived.plus(
//     ONE_BI
//   );
//   vouchedClaimer.save();
// }

// export function handleVouchRemoved(event: VouchRemoved): void {
//   const voucher = Claimer.load(event.params.voucher.toHexString());
//   const vouchedClaimer = Claimer.load(event.params.vouched.toHexString());
//   const vouchedSoul = Soul.load(event.params.soulId.toHexString());
//   if (voucher == null || vouchedClaimer == null || vouchedSoul == null) return;

//   const vouchId = voucher.id
//     .concat("#")
//     .concat(vouchedClaimer.id)
//     .concat("#")
//     .concat(vouchedSoul.id);
//   if (Vouch.load(vouchId) == null) return;

//   store.remove("Vouch", vouchId);

//   vouchedClaimer.nbVouchesReceived = vouchedClaimer.nbVouchesReceived.minus(
//     ONE_BI
//   );
//   vouchedClaimer.save();
// }

// export function handleRequestWithdrawn(ev: RequestWithdrawn): void {
//   const caller = new CallParser(ProofOfHumanity.bind(ev.address));

//   const request = Request.load(
//     ev.params.soulId
//       .toHexString()
//       .concat("#")
//       .concat(ev.params.requestId.toString())
//   ) as Request;
//   request.status = "Resolved";
//   request.resolutionTime = ev.block.timestamp;
//   request.save();

//   const claimer = Claimer.load(request.requester.toHexString()) as Claimer;
//   claimer.targetSoul = ZERO;
//   claimer.currentRequest = ZERO;
//   claimer.save();

//   const roundInfo = caller.getRoundInfo(
//     BigInt.fromString(request.soul),
//     request.realIndex,
//     ZERO_BI,
//     ZERO_BI
//   );
//   const round = Round.load(
//     request.id
//       .concat("#")
//       .concat(ZERO)
//       .concat("#")
//       .concat(ZERO)
//   ) as Round;
//   round.requesterFunds = roundInfo.paidFees[1];
//   round.requesterPaid = Party.parse(roundInfo.sideFunded) == Party.Requester;
//   round.feeRewards = roundInfo.feeRewards;

//   const contributions = caller.getContributions(
//     BigInt.fromString(request.soul),
//     request.realIndex,
//     ZERO_BI,
//     ZERO_BI,
//     ev.transaction.from
//   );

//   const contribution = Contribution.load(
//     round.id.concat("#").concat(ev.transaction.from.toHexString())
//   ) as Contribution;
//   contribution.forRequester = contributions[1];
//   contribution.save();
//   round.save();

//   for (let i = 0; i < round.contributions.length; i++) {
//     const contribution = Contribution.load(
//       round.contributions[i]
//     ) as Contribution;
//     contribution.requestResolved = true;
//     contribution.save();
//   }

//   const counter = getCounter();
//   counter.vouching = counter.vouching.minus(ONE_BI);
//   counter.save();
// }

// export function handleStateAdvanced(ev: StateAdvanced): void {
//   const claimer = Claimer.load(ev.params.claimer.toHexString()) as Claimer;

//   if (claimer.targetSoul && claimer.currentRequest) {
//     const soul = Soul.load(claimer.targetSoul as string) as Soul;
//     soul.nbPendingRequests = soul.nbPendingRequests.plus(ONE_BI);
//     soul.save();

//     const request = Request.load(claimer.currentRequest as string) as Request;
//     request.lastStatusChange = ev.block.timestamp;

//     const vouches = claimer.vouchesReceived;
//     for (let i = 0; i < vouches.length; i++) {
//       const vouch = Vouch.load(vouches[i]) as Vouch;
//       const voucher = Claimer.load(vouch.from) as Claimer;
//       const voucherSoul = Soul.load(vouch.soul) as Soul;

//       if (
//         voucherSoul.usedVouch ||
//         voucherSoul.owner != voucher.id ||
//         !voucher.hasSoul ||
//         !voucherSoul.claimed ||
//         ev.block.timestamp.gt(voucherSoul.expirationTime)
//       )
//         continue;

//       vouch.processedFor = soul.id;
//       vouch.save();

//       voucherSoul.usedVouch = claimer.id;
//       voucherSoul.save();
//     }

//     request.status = "Resolving";
//     request.save();

//     const counter = getCounter();
//     counter.vouching = counter.vouching.minus(ONE_BI);
//     counter.pendingClaims = counter.pendingClaims.plus(ONE_BI);
//     counter.save();
//   }
// }

// export function handleRequestChallenged(ev: RequestChallenged): void {
//   const caller = new CallParser(ProofOfHumanity.bind(ev.address));

//   const reason = Reason.parse(ev.params.reason);

//   const request = Request.load(
//     ev.params.soulId
//       .toString()
//       .concat("#")
//       .concat(ev.params.requestId.toString())
//   ) as Request;
//   request.status = "Disputed";
//   request.usedReasons = request.usedReasons.concat([reason]);
//   request.currentReason = reason;

//   if (!ev.params.evidence) {
//     const evidence = new Evidence(
//       request.id.concat("#").concat(request.evidence.length.toString())
//     );
//     evidence.creationTime = ev.block.timestamp;
//     evidence.request = request.id;
//     evidence.URI = ev.params.evidence;
//     evidence.sender = ev.transaction.from;
//     evidence.save();
//   }

//   const challengeInfo = caller.getChallengeInfo(
//     BigInt.fromString(request.soul),
//     request.realIndex,
//     request.nbChallenges
//   );

//   const challenge = Challenge.load(
//     request.id.concat("#").concat(request.nbChallenges.toString())
//   ) as Challenge;
//   challenge.reason = reason;
//   challenge.challenger = ev.transaction.from;
//   challenge.disputeId = challengeInfo.disputeID;
//   challenge.nbRounds = ONE_BI;
//   challenge.save();

//   const roundInfo = caller.getRoundInfo(
//     BigInt.fromString(request.soul),
//     request.realIndex,
//     request.nbChallenges,
//     ZERO_BI
//   );
//   const contributions = caller.getContributions(
//     BigInt.fromString(request.soul),
//     request.realIndex,
//     request.nbChallenges,
//     ZERO_BI,
//     ev.transaction.from
//   );

//   let round = Round.load(challenge.id.concat("#").concat(ZERO)) as Round;
//   round.challengerFunds = roundInfo.paidFees[2];
//   round.challengerPaid = Party.parse(roundInfo.sideFunded) == Party.Challenger;
//   round.feeRewards = roundInfo.feeRewards;
//   round.nbContributions = round.nbContributions.plus(ONE_BI);
//   round.save();

//   const contribution = new Contribution(
//     round.id.concat("#").concat(ev.transaction.from.toHexString())
//   );
//   contribution.requestIndex = request.realIndex;
//   contribution.roundIndex = ZERO_BI;
//   contribution.round = round.id;
//   contribution.contributor = ev.transaction.from;
//   contribution.requestResolved = false;
//   contribution.forRequester = contributions[1];
//   contribution.forChallenger = contributions[2];
//   contribution.save();

//   round = new Round(challenge.id.concat("#").concat(ONE));
//   round.creationTime = ev.block.timestamp;
//   round.challenge = challenge.id;
//   round.requesterFunds = ZERO_BI;
//   round.challengerFunds = ZERO_BI;
//   round.requesterPaid = false;
//   round.challengerPaid = false;
//   round.feeRewards = ZERO_BI;
//   round.nbContributions = ZERO_BI;
//   round.save();

//   request.nbChallenges = request.nbChallenges.plus(ONE_BI);
//   request.save();

//   const counter = getCounter();
//   counter.challengedClaims = counter.challengedClaims.plus(ONE_BI);
//   counter.pendingClaims = counter.pendingClaims.minus(ONE_BI);
//   counter.save();
// }

// export function handleChallengePeriodRestart(ev: ChallengePeriodRestart): void {
//   const request = Request.load(
//     ev.params.soulId
//       .toString()
//       .concat("#")
//       .concat(ev.params.requestId.toString())
//   ) as Request;
//   request.status = Status.Resolving;
//   request.currentReason = Reason.None;
//   // request.challengePeriodEnd = uint64(block.timestamp) + challengePeriodDuration;
//   request.save();
// }

// export function handleChallengeResolved(ev: ChallengeResolved): void {
//   const ruling = Party.parse(ev.params.ruling);

//   const soul = Soul.load(ev.params.soulId.toString()) as Soul;
//   soul.nbPendingRequests = soul.nbPendingRequests.minus(ONE_BI);

//   const request = Request.load(
//     soul.id.concat("#").concat(ev.params.requestId.toString())
//   ) as Request;
//   request.resolutionTime = ev.block.timestamp;
//   request.status = Status.Resolved;

//   const challenge = Challenge.load(
//     soul.id
//       .concat("#")
//       .concat(ev.params.requestId.toString())
//       .concat("#")
//       .concat(ev.params.challengeId.toString())
//   ) as Challenge;
//   challenge.ruling = ruling;
//   challenge.appealPeriodEnd = ZERO_BI;
//   challenge.appealPeriodStart = ZERO_BI;
//   challenge.save();

//   const counter = getCounter();
//   const constract = getContract();

//   if (request.registration) {
//     if (ruling == Party.Requester) {
//       if (!request.requesterLost && request.usedReasons.length == 4) {
//         const claimer = Claimer.load(
//           request.requester.toHexString()
//         ) as Claimer;
//         claimer.hasSoul = true;
//         claimer.soul = soul.id;
//         claimer.targetSoul = ZERO;
//         claimer.currentRequest = ZERO;
//         claimer.save();

//         soul.owner = claimer.id;
//         soul.claimed = true;
//         soul.expirationTime = ev.block.timestamp.plus(constract.soulLifespan);

//         counter.registered = counter.registered.plus(ONE_BI);
//       }
//     } else {
//       if (ruling == Party.Challenger)
//         request.ultimateChallenger = challenge.challenger;
//       request.requesterLost = true;
//     }

//     request.vouchReleaseReady = true;
//     counter.pendingClaims = counter.pendingClaims.minus(ONE_BI);
//   } else {
//     soul.pendingRevokal = false;
//     if (ruling == Party.Requester) {
//       const claimer = Claimer.load(soul.owner as string) as Claimer;
//       claimer.hasSoul = true;
//       claimer.soul = soul.id;
//       claimer.save();

//       soul.owner = null;
//       soul.claimed = false;

//       counter.registered = counter.registered.minus(ONE_BI);
//       counter.removed = counter.removed.plus(ONE_BI);
//     }

//     counter.pendingRevokals = counter.pendingRevokals.minus(ONE_BI);
//   }

//   request.save();
//   soul.save();
//   counter.save();

//   for (let i = 0; i < challenge.nbRounds.toI32(); i++) {
//     const round = Round.load(challenge.rounds[i]) as Round;
//     for (let j = 0; j < round.nbContributions.toI32(); j++) {
//       const contribution = Contribution.load(
//         round.contributions[j]
//       ) as Contribution;
//       contribution.requestResolved = true;
//       contribution.save();
//     }
//   }
// }

// export function handleAppealContribution(ev: AppealCreated): void {
//   const caller = new CallParser(ProofOfHumanity.bind(ev.address));

//   const challenge = Challenge.load(
//     ev.params.soulId
//       .toString()
//       .concat("#")
//       .concat(ev.params.requestId.toString())
//       .concat("#")
//       .concat(ev.params.challengeId.toString())
//   ) as Challenge;

//   const roundInfo = caller.getRoundInfo(
//     ev.params.soulId,
//     ev.params.requestId,
//     ev.params.challengeId,
//     challenge.nbRounds
//   );

//   const round = Round.load(
//     challenge.id.concat("#").concat(challenge.nbRounds.toString())
//   ) as Round;
//   round.creationTime = ev.block.timestamp;
//   round.challenge = challenge.id;
//   round.requesterFunds = roundInfo.paidFees[2];
//   round.challengerFunds = roundInfo.paidFees[1];
//   round.requesterPaid = Party.parse(roundInfo.sideFunded) == Party.None;
//   round.challengerPaid = Party.parse(roundInfo.sideFunded) == Party.None;
//   round.feeRewards = roundInfo.feeRewards;
//   round.nbContributions = ZERO_BI;

//   const contributions = caller.getContributions(
//     ev.params.soulId,
//     ev.params.requestId,
//     ev.params.challengeId,
//     challenge.nbRounds,
//     ev.transaction.from
//   );

//   const contributionID = round.id
//     .concat("#")
//     .concat(ev.transaction.from.toHexString());
//   let contribution = Contribution.load(contributionID);
//   if (contribution == null) {
//     round.nbContributions = round.nbContributions.plus(ONE_BI);
//     contribution = new Contribution(contributionID);
//     contribution.requestIndex = ev.params.requestId;
//     contribution.roundIndex = challenge.nbRounds;
//     contribution.round = round.id;
//     contribution.contributor = ev.transaction.from;
//     contribution.requestResolved = false;
//   }
//   contribution.forRequester = contributions[1];
//   contribution.forChallenger = contributions[2];
//   contribution.save();
//   round.save();
// }

// export function handleAppealCreated(ev: AppealCreated): void {
//   const request = Request.load(
//     ev.params.soulId
//       .toString()
//       .concat("#")
//       .concat(ev.params.requestId.toString())
//   ) as Request;

//   const challenge = Challenge.load(
//     request.id.concat("#").concat(ev.params.challengeId.toString())
//   ) as Challenge;

//   challenge.nbRounds = challenge.nbRounds.plus(ONE_BI);
//   challenge.save();

//   const nxtRound = new Round(
//     challenge.id.concat("#").concat(challenge.nbRounds.toString())
//   );
//   nxtRound.creationTime = ev.block.timestamp;
//   nxtRound.challenge = challenge.id;
//   nxtRound.requesterFunds = ZERO_BI;
//   nxtRound.challengerFunds = ZERO_BI;
//   nxtRound.requesterPaid = false;
//   nxtRound.challengerPaid = false;
//   nxtRound.feeRewards = ZERO_BI;
//   nxtRound.nbContributions = ZERO_BI;
//   nxtRound.save();
// }

// export function handleRequestExecuted(ev: RequestExecuted): void {
//   const caller = new CallParser(ProofOfHumanity.bind(ev.address));

//   const contract = getContract();

//   const soul = Soul.load(ev.params.soulId.toString()) as Soul;
//   const request = Request.load(
//     soul.id.concat("#").concat(ev.params.requestId.toString())
//   ) as Request;
//   request.status = "Resolved";
//   request.resolutionTime = ev.block.timestamp;
//   request.save();

//   if (request.registration && !request.requesterLost) {
//     const claimer = Claimer.load(request.requester.toHexString()) as Claimer;
//     claimer.soul = soul.id;
//     claimer.hasSoul = true;
//     claimer.lastRequestTime = ev.block.timestamp;
//     claimer.save();

//     soul.claimed = true;
//     soul.owner = claimer.id;
//     soul.expirationTime = ev.block.timestamp.plus(contract.soulLifespan);
//   }
//   soul.nbPendingRequests = soul.nbPendingRequests.minus(ONE_BI);
//   soul.save();

//   const roundInfo = caller.getRoundInfo(
//     ev.params.soulId,
//     ev.params.requestId,
//     ZERO_BI,
//     ZERO_BI
//   );

//   const round = Round.load(
//     request.id
//       .concat("#")
//       .concat(ZERO)
//       .concat("#")
//       .concat(ZERO)
//   ) as Round;
//   round.requesterFunds = roundInfo.paidFees[1];
//   round.feeRewards = roundInfo.feeRewards;
//   round.save();

//   const contributions = caller.getContributions(
//     ev.params.soulId,
//     ev.params.requestId,
//     ZERO_BI,
//     ZERO_BI,
//     request.requester as Address
//   );

//   const contribution = Contribution.load(
//     round.id.concat("#").concat(request.requester.toHexString())
//   ) as Contribution;
//   contribution.forRequester = contributions[1];
//   contribution.forChallenger = contributions[2];
//   contribution.save();

//   markVouchesAsProcessed(
//     soul.id.concat("#").concat(ev.params.requestId.toString()),
//     BigInt.fromI32(10)
//   );

//   const challenge = Challenge.load(
//     request.id.concat("#").concat(ZERO)
//   ) as Challenge;
//   for (let i = 0; i < challenge.nbRounds.toI32(); i++) {
//     const round = Round.load(challenge.rounds[i]) as Round;
//     for (let j = 0; j < round.nbContributions.toI32(); j++) {
//       const contribution = Contribution.load(
//         round.contributions[j]
//       ) as Contribution;
//       contribution.requestResolved = true;
//       contribution.save();
//     }
//   }
// }

// export function markVouchesAsProcessed(
//   requestId: string,
//   iterations: BigInt
// ): void {
//   const request = Request.load(requestId) as Request;

//   const endIndex = request.lastProcessedVouchIndex.plus(
//     iterations
//       .plus(request.lastProcessedVouchIndex)
//       .le(BigInt.fromI32(request.vouches.length))
//       ? iterations
//       : BigInt.fromI32(request.vouches.length).minus(
//           request.lastProcessedVouchIndex
//         )
//   );

//   request.lastProcessedVouchIndex = endIndex;
//   request.vouchReleaseReady = false;
//   request.save();

//   for (let i = 0; i < endIndex.toI32(); i++) {
//     const voucher = Claimer.load(request.vouches[i]) as Claimer;
//     const voucherSoul = Soul.load(request.vouches[i]) as Soul;
//     voucherSoul.usedVouch = null;
//     voucherSoul.save();

//     if (
//       request.ultimateChallenger != Bytes.empty() &&
//       voucher.currentRequest != null &&
//       voucher.currentRequest
//     ) {
//       const voucherRequest = Request.load(
//         voucher.currentRequest as string
//       ) as Request;
//       if (
//         request.usedReasons[request.usedReasons.length - 1] == "Duplicate" ||
//         request.usedReasons[request.usedReasons.length - 1] == "DoesNotExist"
//       ) {
//         if (
//           voucherRequest.status == "Vouching" ||
//           voucherRequest.status == "Resolving"
//         ) {
//           voucherRequest.requesterLost = true;
//           voucherRequest.save();
//         }

//         voucher.hasSoul = false;
//         voucher.soul = ZERO_ADDRESS;
//         voucher.save();
//       }
//     }
//   }
// }

// export function fundRequest(call: FundRequestCall): void {
//   const caller = new CallParser(ProofOfHumanity.bind(call.to));

//   const claimer = Claimer.load(call.inputs._claimer.toHexString()) as Claimer;

//   if (claimer.currentRequest != null && claimer.targetSoul != null) {
//     const request = Request.load(claimer.currentRequest as string) as Request;

//     let roundInfo = caller.getRoundInfo(
//       BigInt.fromString(claimer.targetSoul as string),
//       request.realIndex,
//       ZERO_BI,
//       ZERO_BI
//     );

//     const round = Round.load(
//       request.id
//         .concat("#")
//         .concat(ZERO)
//         .concat("#")
//         .concat(ZERO)
//     ) as Round;
//     round.requesterFunds = roundInfo.paidFees[1];
//     round.requesterPaid = Party.parse(roundInfo.sideFunded) == Party.Requester;
//     round.feeRewards = roundInfo.feeRewards;

//     const contributions = caller.getContributions(
//       BigInt.fromString(claimer.targetSoul as string),
//       request.realIndex,
//       ZERO_BI,
//       ZERO_BI,
//       call.from
//     );

//     const contributionID = round.id.concat("#").concat(call.from.toHexString());
//     let contribution = Contribution.load(contributionID);
//     if (contribution == null) {
//       contribution = new Contribution(contributionID);
//       contribution.requestIndex = request.realIndex;
//       contribution.roundIndex = ZERO_BI;
//       contribution.round = round.id;
//       contribution.contributor = call.from;
//       contribution.requestResolved = false;

//       round.nbContributions = round.nbContributions.plus(ONE_BI);
//     }

//     contribution.forRequester = contributions[1];
//     contribution.save();
//     round.save();
//   } else
//     log.info("GGG No current request: {}", [
//       call.inputs._claimer.toHexString(),
//     ]);
// }

// export function processVouches(call: ProcessVouchesCall): void {
//   markVouchesAsProcessed(
//     call.inputs._soulId
//       .toHexString()
//       .concat("#")
//       .concat(call.inputs._requestId.toString()),
//     call.inputs._iterations
//   );
// }

// export function withdrawFeesAndRewards(call: WithdrawFeesAndRewardsCall): void {
//   const caller = new CallParser(ProofOfHumanity.bind(call.to));

//   const request = Request.load(
//     call.inputs._soulId
//       .toHexString()
//       .concat("#")
//       .concat(call.inputs._requestId.toString())
//   ) as Request;
//   const round = Round.load(
//     request.id
//       .concat("#")
//       .concat(call.inputs._challengeId.toString())
//       .concat("#")
//       .concat(call.inputs._round.toString())
//   );

//   if (round == null) {
//     log.warning("Could not find round | tx {}", [
//       call.transaction.hash.toHexString(),
//     ]);
//     return;
//   }

//   const roundInfo = caller.getRoundInfo(
//     call.inputs._soulId,
//     call.inputs._requestId,
//     call.inputs._challengeId,
//     call.inputs._round
//   );
//   const contributions = caller.getContributions(
//     call.inputs._soulId,
//     call.inputs._requestId,
//     call.inputs._challengeId,
//     call.inputs._round,
//     call.inputs._beneficiary
//   );
//   round.requesterFunds = roundInfo.paidFees[1];
//   round.challengerFunds = roundInfo.paidFees[2];
//   if (roundInfo.appealed) {
//     round.requesterPaid = Party.parse(roundInfo.sideFunded) == Party.None;
//     round.challengerPaid = Party.parse(roundInfo.sideFunded) == Party.None;
//   } else {
//     round.requesterPaid = Party.parse(roundInfo.sideFunded) == Party.Requester;
//     round.challengerPaid =
//       Party.parse(roundInfo.sideFunded) == Party.Challenger;
//   }
//   round.feeRewards = roundInfo.feeRewards;
//   round.save();

//   const contribution = Contribution.load(
//     round.id.concat("#").concat(call.inputs._beneficiary.toString())
//   ) as Contribution;

//   if (contribution != null) {
//     contribution.forRequester = contributions[1];
//     contribution.forChallenger = contributions[2];
//     contribution.save();
//   }
// }

// export function submitEvidence(call: SubmitEvidenceCall): void {
//   const request = Request.load(
//     call.inputs._soulId
//       .toHexString()
//       .concat("#")
//       .concat(call.inputs._requestId.toString())
//   ) as Request;

//   const evidence = new Evidence(
//     request.id.concat("#").concat(request.evidence.length.toString())
//   );
//   evidence.creationTime = call.block.timestamp;
//   evidence.request = request.id;
//   evidence.URI = call.inputs._evidence;
//   evidence.sender = call.from;
//   evidence.save();
// }

// export function newRequest(
//   soulId: string,
//   requestIndex: BigInt,
//   evidenceUri: string,
//   event: ethereum.Event,
//   registration: boolean
// ): Request {
//   const caller = new CallParser(ProofOfHumanity.bind(event.address));

//   const request = new Request(
//     soulId.concat("#").concat(requestIndex.toString())
//   );
//   request.creationTime = event.block.timestamp;
//   request.realIndex = requestIndex;
//   request.soul = soulId;
//   request.requester = event.transaction.from;
//   request.registration = registration;
//   request.status = registration ? Status.Vouching : Status.Resolving;
//   request.currentReason = Reason.None;
//   request.lastStatusChange = event.block.timestamp;
//   request.arbitratorData = getContract().metaEvidenceUpdates.toString();
//   request.nbEvidence = ONE_BI;
//   request.save();

//   const evidence = new Evidence(request.id.concat("#").concat(ZERO));
//   evidence.creationTime = event.block.timestamp;
//   evidence.URI = evidenceUri;
//   evidence.request = request.id;
//   evidence.sender = event.transaction.from;
//   evidence.save();

//   const challenge = new Challenge(request.id.concat("#").concat(ZERO));
//   challenge.request = request.id;
//   challenge.creationTime = event.block.timestamp;
//   challenge.reason = Reason.None;
//   challenge.ruling = Party.None;
//   challenge.save();

//   const roundInfo = caller.getRoundInfo(
//     BigInt.fromString(soulId),
//     requestIndex,
//     ZERO_BI,
//     ZERO_BI
//   );

//   const round = new Round(challenge.id.concat("#").concat(ZERO));
//   round.challenge = challenge.id;
//   round.creationTime = event.block.timestamp;
//   round.requesterFunds = roundInfo.paidFees[1];
//   round.requesterPaid = Party.parse(roundInfo.sideFunded) == Party.Requester;
//   round.challengerFunds = roundInfo.paidFees[2];
//   round.feeRewards = roundInfo.feeRewards;
//   round.nbContributions = ONE_BI;
//   round.save();

//   const contribution = new Contribution(
//     round.id.concat("#").concat(event.transaction.from.toHexString())
//   );
//   contribution.round = round.id;
//   contribution.contributor = event.transaction.from;
//   contribution.requestIndex = requestIndex;
//   contribution.forRequester = roundInfo.paidFees[1];
//   contribution.forChallenger = roundInfo.paidFees[2];
//   contribution.save();

//   return request;
// }
