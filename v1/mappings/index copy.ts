// import {
//   Address,
//   BigInt,
//   Bytes,
//   ethereum,
//   log,
//   store,
// } from "@graphprotocol/graph-ts";
// import {
//   ArbitratorComplete,
//   ProofOfHumanityOld,
//   ChangeSubmissionBaseDepositCall,
//   ChangeDurationsCall,
//   ChangeRequiredNumberOfVouchesCall,
//   ChangeSharedStakeMultiplierCall,
//   ChangeWinnerStakeMultiplierCall,
//   ChangeGovernorCall,
//   ChangeLoserStakeMultiplierCall,
//   AddSubmissionManuallyCall,
//   ChangeArbitratorCall,
//   RemoveSubmissionManuallyCall,
//   MetaEvidence,
//   VouchAdded,
//   VouchRemoved,
//   AddSubmissionCall,
//   WithdrawSubmissionCall,
//   ReapplySubmissionCall,
//   RemoveSubmissionCall,
//   FundSubmissionCall,
//   ChangeStateToPendingCall,
//   ChallengeRequestCall,
//   FundAppealCall,
//   ExecuteRequestCall,
//   ProcessVouchesCall,
//   WithdrawFeesAndRewardsCall,
//   SubmitEvidenceCall,
//   RuleCall,
// } from "../../generated/ProofOfHumanityOld/ProofOfHumanityOld";
// import {
//   ArbitratorData,
//   Challenge,
//   Claimer,
//   Contribution,
//   Counter,
//   Evidence,
//   Request,
//   Round,
//   Soul,
//   Vouch,
// } from "../../generated/schema";
// import { getContract, getCounter, New } from "../../utils";
// import {
//   Party,
//   Reason,
//   ONE_BI,
//   TWO_BI,
//   ZERO,
//   ZERO_ADDRESS,
//   ZERO_BI,
//   Status,
// } from "../../utils/constants";
// import { biToBytes, genId } from "../../utils/misc";

// export function handleArbitratorComplete(event: ArbitratorComplete): void {
//   const contract = getContract();
//   contract.address = event.address;
//   contract.governor = event.params._governor;
//   contract.requestBaseDeposit = event.params._submissionBaseDeposit;
//   contract.soulLifespan = event.params._submissionDuration;
//   contract.renewalTime = ProofOfHumanityOld.bind(
//     event.address
//   ).renewalPeriodDuration();
//   contract.challengePeriodDuration = event.params._challengePeriodDuration;
//   contract.requiredNumberOfVouches = event.params._requiredNumberOfVouches;
//   contract.sharedStakeMultiplier = event.params._sharedStakeMultiplier;
//   contract.winnerStakeMultiplier = event.params._winnerStakeMultiplier;
//   contract.loserStakeMultiplier = event.params._loserStakeMultiplier;
//   contract.save();

//   const counter = new Counter(ZERO);
//   counter.vouching = ZERO_BI;
//   counter.pendingClaims = ZERO_BI;
//   counter.challengedClaims = ZERO_BI;
//   counter.registered = ZERO_BI;
//   counter.pendingRevokals = ZERO_BI;
//   counter.challengedRevokal = ZERO_BI;
//   counter.removed = ZERO_BI;
//   counter.expired = ZERO_BI;
//   counter.save();

//   log.warning("Initialization complete", []);
// }

// export function handleMetaEvidence(ev: MetaEvidence): void {
//   const poh = ProofOfHumanityOld.bind(ev.address);

//   const metaEvidenceUpdates = ev.params._metaEvidenceID.div(TWO_BI);

//   log.warning("META {}", [ev.params._metaEvidenceID.toString()]);

//   let arbitratorData: ArbitratorData;
//   if (ev.params._metaEvidenceID.mod(TWO_BI).equals(ZERO_BI)) {
//     arbitratorData = new ArbitratorData(biToBytes(metaEvidenceUpdates));
//     arbitratorData.registrationMeta = ev.params._evidence;
//     arbitratorData.clearingMeta = "";

//     if (metaEvidenceUpdates.equals(ZERO_BI)) {
//       const arbitratorDataItem = poh.arbitratorDataList(ZERO_BI);
//       arbitratorData.arbitrator = arbitratorDataItem.getArbitrator();
//       arbitratorData.arbitratorExtraData = arbitratorDataItem.getArbitratorExtraData();
//     } else {
//       const prevArbitratorData = ArbitratorData.load(
//         biToBytes(metaEvidenceUpdates.minus(ONE_BI))
//       ) as ArbitratorData;
//       arbitratorData.arbitrator = prevArbitratorData.arbitrator;
//       arbitratorData.arbitratorExtraData =
//         prevArbitratorData.arbitratorExtraData;
//     }
//   } else {
//     arbitratorData = ArbitratorData.load(
//       biToBytes(metaEvidenceUpdates)
//     ) as ArbitratorData;
//     arbitratorData.clearingMeta = ev.params._evidence;
//   }
//   arbitratorData.save();

//   const contract = getContract();
//   contract.metaEvidenceUpdates = metaEvidenceUpdates;
//   contract.latestArbitratorData = arbitratorData.id;
//   contract.save();
// }

// export function changeSubmissionBaseDeposit(
//   call: ChangeSubmissionBaseDepositCall
// ): void {
//   const contract = getContract();
//   contract.requestBaseDeposit = call.inputs._submissionBaseDeposit;
//   contract.save();
// }

// export function changeDurations(call: ChangeDurationsCall): void {
//   const contract = getContract();
//   contract.soulLifespan = call.inputs._submissionDuration;
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
//     biToBytes(metaEvidenceUpdates)
//   ) as ArbitratorData;

//   metaEvidenceUpdates = metaEvidenceUpdates.plus(ONE_BI);

//   const arbitratorData = new ArbitratorData(biToBytes(metaEvidenceUpdates));
//   arbitratorData.registrationMeta = prevArbitratorData.registrationMeta;
//   arbitratorData.clearingMeta = prevArbitratorData.clearingMeta;
//   arbitratorData.arbitrator = call.inputs._arbitrator;
//   arbitratorData.arbitratorExtraData = call.inputs._arbitratorExtraData;
//   arbitratorData.save();

//   contract.metaEvidenceUpdates = metaEvidenceUpdates;
//   contract.save();
// }

// export function addSubmissionManually(call: AddSubmissionManuallyCall): void {
//   const poh = ProofOfHumanityOld.bind(call.to);
//   const submissionIDs = call.inputs._submissionIDs;
//   const evidences = call.inputs._evidence;
//   const names = call.inputs._names;

//   for (let i = 0; i < submissionIDs.length; i++) {
//     let claimer = Claimer.load(submissionIDs[i]);
//     if (claimer == null) claimer = New.Claimer(submissionIDs[i]);

//     let soul = Soul.load(submissionIDs[i]);
//     if (soul == null) soul = New.Soul(submissionIDs[i]);
//     soul.owner = claimer.id;
//     soul.claimed = true;
//     soul.expirationTime = call.block.timestamp.plus(poh.submissionDuration());

//     claimer.name = names[i];
//     claimer.lastRequestTime = call.block.timestamp;
//     claimer.hasSoul = true;
//     claimer.save();

//     const request = New.Request(soul.id, soul.nbRequests, true);
//     request.creationTime = call.block.timestamp;
//     request.requester = call.from;
//     request.status = Status.Resolved;
//     request.lastStatusChange = call.block.timestamp;
//     request.nbEvidence = ONE_BI;
//     request.save();

//     soul.nbRequests = soul.nbRequests.plus(ONE_BI);
//     soul.save();

//     const evidence = new Evidence(genId(request.id, ZERO));
//     evidence.creationTime = call.block.timestamp;
//     evidence.request = request.id;
//     evidence.URI = evidences[i];
//     evidence.sender = call.from;
//     evidence.save();
//   }

//   const counter = getCounter();
//   counter.registered = counter.registered.plus(
//     BigInt.fromI32(submissionIDs.length)
//   );
//   counter.save();
// }

// export function removeSubmissionManually(
//   call: RemoveSubmissionManuallyCall
// ): void {
//   const claimer = Claimer.load(call.inputs._submissionID) as Claimer;
//   const soul = Soul.load(call.inputs._submissionID) as Soul;
//   soul.owner = null;
//   soul.claimed = false;
//   soul.save();

//   claimer.hasSoul = false;
//   claimer.save();

//   const counter = getCounter();
//   counter.registered = counter.registered.minus(ONE_BI);
//   counter.removed = counter.removed.plus(ONE_BI);
//   counter.save();
// }

// export function addSubmission(call: AddSubmissionCall): void {
//   let soul = Soul.load(call.from);
//   if (soul == null) soul = New.Soul(call.from);

//   let claimer = Claimer.load(call.from);
//   if (claimer == null) {
//     claimer = New.Claimer(call.from);
//     claimer.name = call.inputs._name;
//     claimer.targetSoul = soul.id;
//     claimer.lastRequestTime = call.block.timestamp;
//   }
//   claimer.targetSoul = soul.id;

//   const request = newRequest(
//     call.from,
//     soul.nbRequests,
//     call.inputs._evidence,
//     call,
//     true
//   );

//   soul.nbRequests = soul.nbRequests.plus(ONE_BI);
//   soul.save();

//   claimer.currentRequest = request.id;
//   claimer.save();

//   const counter = getCounter();
//   counter.vouching = counter.vouching.plus(ONE_BI);
//   counter.save();

//   log.debug("Add submissions: {}", [call.from.toHexString()]);
// }

// export function reapplySubmission(call: ReapplySubmissionCall): void {
//   const soul = Soul.load(call.from) as Soul;
//   const claimer = Claimer.load(soul.id) as Claimer;
//   claimer.targetSoul = soul.id;

//   const request = newRequest(
//     call.from,
//     soul.nbRequests,
//     call.inputs._evidence,
//     call,
//     true
//   );

//   soul.nbRequests = soul.nbRequests.plus(ONE_BI);
//   soul.save();
//   claimer.currentRequest = request.id;
//   claimer.save();

//   const counter = getCounter();
//   counter.vouching = counter.vouching.plus(ONE_BI);
//   counter.save();
// }

// export function removeSubmission(call: RemoveSubmissionCall): void {
//   const soul = Soul.load(call.inputs._submissionID) as Soul;

//   newRequest(
//     call.inputs._submissionID,
//     soul.nbRequests,
//     call.inputs._evidence,
//     call,
//     false
//   );

//   soul.nbRequests = soul.nbRequests.plus(ONE_BI);
//   soul.save();

//   const counter = getCounter();
//   counter.pendingRevokals = counter.pendingRevokals.plus(ONE_BI);
//   counter.save();
// }

// export function fundSubmission(call: FundSubmissionCall): void {
//   const poh = ProofOfHumanityOld.bind(call.to);

//   const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

//   if (!claimer.currentRequest) {
//     log.debug("No current request: {}", [
//       call.inputs._submissionID.toHexString(),
//     ]);
//     return;
//   }

//   const request = Request.load(claimer.currentRequest as Bytes) as Request;

//   log.warning("getRoundInfo({}, {}, {}, {})", [
//     call.inputs._submissionID.toHex(),
//     request.realIndex.toString(),
//     ZERO_BI.toString(),
//     ZERO_BI.toString(),
//   ]);
//   let roundInfo = poh.getRoundInfo(
//     call.inputs._submissionID,
//     request.realIndex,
//     ZERO_BI,
//     ZERO_BI
//   );

//   const round = Round.load(genId(genId(request.id, ZERO), ZERO)) as Round;
//   round.requesterFunds = roundInfo.getPaidFees()[1];
//   round.requesterPaid =
//     Party.parse(roundInfo.getSideFunded()) == Party.Requester;
//   round.feeRewards = roundInfo.getFeeRewards();

//   const contributions = poh.getContributions(
//     call.inputs._submissionID,
//     request.realIndex,
//     ZERO_BI,
//     ZERO_BI,
//     call.from
//   );

//   let contribution = Contribution.load(genId(round.id, call.from));
//   if (contribution == null) {
//     contribution = New.Contribution(round.id, call.from);
//     round.nbContributions = round.nbContributions.plus(ONE_BI);
//   }

//   contribution.forRequester = contributions[1];
//   contribution.save();
//   round.save();
// }

// export function handleVouchAdded(event: VouchAdded): void {
//   const voucher = Claimer.load(event.params._voucher);
//   const vouched = Claimer.load(event.params._submissionID);
//   if (voucher == null || vouched == null) return;

//   const vouch = new Vouch(genId(voucher.id, vouched.id));
//   vouch.from = voucher.id;
//   vouch.for = vouched.id;
//   vouch.soul = vouched.id;
//   vouch.save();

//   vouched.nbVouchesReceived = vouched.nbVouchesReceived.plus(ONE_BI);
//   vouched.save();
// }

// export function handleVouchRemoved(event: VouchRemoved): void {
//   const voucher = Claimer.load(event.params._voucher);
//   const vouched = Claimer.load(event.params._submissionID);
//   if (voucher == null || vouched == null) return;

//   const vouchId = genId(voucher.id, vouched.id);

//   if (Vouch.load(vouchId) == null) return;

//   store.remove("Vouch", vouchId.toHex());

//   vouched.nbVouchesReceived = vouched.nbVouchesReceived.minus(ONE_BI);
//   vouched.save();
// }

// export function withdrawSubmission(call: WithdrawSubmissionCall): void {
//   const poh = ProofOfHumanityOld.bind(call.to);

//   const claimer = Claimer.load(call.from) as Claimer;

//   if (!claimer.currentRequest) {
//     log.debug("No current request: {}", [call.from.toHexString()]);
//     return;
//   }

//   const request = Request.load(claimer.currentRequest as Bytes) as Request;

//   if (request.status != "Vouching") return;

//   request.status = "Resolved";
//   request.resolutionTime = call.block.timestamp;
//   request.save();

//   claimer.targetSoul = null;
//   claimer.currentRequest = null;
//   claimer.save();

//   log.warning("withdrawSubmission getRoundInfo({}, {}, {}, {})", [
//     call.from.toHex(),
//     request.realIndex.toString(),
//     ZERO_BI.toString(),
//     ZERO_BI.toString(),
//   ]);
//   const roundInfo = poh.getRoundInfo(
//     call.from,
//     request.realIndex,
//     ZERO_BI,
//     ZERO_BI
//   );

//   const round = Round.load(genId(genId(request.id, ZERO), ZERO)) as Round;
//   round.requesterFunds = roundInfo.getPaidFees()[1];
//   round.requesterPaid =
//     Party.parse(roundInfo.getSideFunded()) == Party.Requester;
//   round.feeRewards = roundInfo.getFeeRewards();

//   const contributions = poh.getContributions(
//     call.from,
//     request.realIndex,
//     ZERO_BI,
//     ZERO_BI,
//     call.from
//   );

//   const contribution = Contribution.load(
//     genId(round.id, call.from)
//   ) as Contribution;
//   contribution.forRequester = contributions[1];
//   contribution.save();
//   round.save();

//   // for (let i = 0; i < round.contributions.length; i++) {
//   //   const contribution = Contribution.load(
//   //     round.contributions[i]
//   //   ) as Contribution;
//   //   contribution.requestResolved = true;
//   //   contribution.save();
//   // }

//   const counter = getCounter();
//   counter.vouching = counter.vouching.minus(ONE_BI);
//   counter.save();
// }

// export function changeStateToPending(call: ChangeStateToPendingCall): void {
//   const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

//   const soul = Soul.load(call.inputs._submissionID) as Soul;
//   soul.nbPendingRequests = soul.nbPendingRequests.plus(ONE_BI);
//   soul.save();

//   if (!claimer.currentRequest) {
//     log.debug("No current request: {}", [call.from.toHexString()]);
//     return;
//   }

//   const request = Request.load(claimer.currentRequest as Bytes) as Request;
//   request.lastStatusChange = call.block.timestamp;
//   request.status = "Resolving";
//   request.save();

//   // for (let i = 0; i < claimer.nbVouchesReceived.toI32(); i++) {
//   //   log.warning("vouch", [claimer.vouchesReceived[i].toHex()]);
//   //   const vouch = Vouch.load(claimer.vouchesReceived[i]) as Vouch;
//   //   log.warning("voucher", [vouch.from.toHex()]);
//   //   const voucher = Claimer.load(vouch.from) as Claimer;
//   //   log.warning("soul", [BigInt.fromByteArray(vouch.soul).toString()]);
//   //   const voucherSoul = Soul.load(vouch.soul) as Soul;
//   //   log.warning("XXXXXXXXXXXXX", []);

//   //   if (
//   //     voucherSoul.usedVouch ||
//   //     voucherSoul.owner != voucher.id ||
//   //     !voucher.hasSoul ||
//   //     !voucherSoul.claimed ||
//   //     call.block.timestamp.gt(voucherSoul.expirationTime)
//   //   )
//   //     continue;
//   //   log.warning("BBBBBBBBBBBBBB", []);

//   //   vouch.processedFor = soul.id;
//   //   vouch.save();

//   //   voucherSoul.usedVouch = claimer.id;
//   //   voucherSoul.save();
//   // }

//   const counter = getCounter();
//   counter.vouching = counter.vouching.minus(ONE_BI);
//   counter.pendingClaims = counter.pendingClaims.plus(ONE_BI);
//   counter.save();
// }

// export function challengeRequest(call: ChallengeRequestCall): void {
//   const poh = ProofOfHumanityOld.bind(call.to);

//   const reason = Reason.parse(call.inputs._reason);

//   const claimer = Claimer.load(call.inputs._submissionID) as Claimer;
//   claimer.disputed = true;
//   claimer.save();

//   if (!claimer.currentRequest) {
//     log.debug("No current request: {}", [call.from.toHexString()]);
//     return;
//   }

//   const request = Request.load(claimer.currentRequest as Bytes) as Request;
//   request.status = "Disputed";
//   request.usedReasons = request.usedReasons.concat([reason]);
//   request.currentReason = reason;

//   if (call.inputs._evidence) {
//     const evidence = new Evidence(
//       genId(request.id, biToBytes(request.nbEvidence))
//     );
//     evidence.creationTime = call.block.timestamp;
//     evidence.request = request.id;
//     evidence.URI = call.inputs._evidence;
//     evidence.sender = call.from;
//     evidence.save();

//     request.nbEvidence = request.nbEvidence.plus(ONE_BI);
//   }

//   const challengeInfo = poh.getChallengeInfo(
//     call.inputs._submissionID,
//     request.realIndex,
//     request.nbChallenges
//   );

//   const challenge = Challenge.load(
//     genId(request.id, biToBytes(request.nbChallenges))
//   ) as Challenge;
//   challenge.reason = reason;
//   challenge.challenger = call.from;
//   challenge.disputeId = challengeInfo.getDisputeID();
//   challenge.nbRounds = ONE_BI;
//   challenge.save();

//   request.nbChallenges = request.nbChallenges.plus(ONE_BI);
//   request.save();

//   log.warning("challengeRequest getRoundInfo({}, {}, {}, {})", [
//     call.inputs._submissionID.toHex(),
//     request.realIndex.toString(),
//     request.nbChallenges.toString(),
//     ZERO_BI.toString(),
//   ]);
//   const roundInfo = poh.getRoundInfo(
//     call.inputs._submissionID,
//     request.realIndex,
//     request.nbChallenges,
//     ZERO_BI
//   );

//   let round = Round.load(genId(challenge.id, ZERO)) as Round;
//   round.challengerFunds = roundInfo.getPaidFees()[2];
//   round.challengerPaid =
//     Party.parse(roundInfo.getSideFunded()) == Party.Challenger;
//   round.feeRewards = roundInfo.getFeeRewards();
//   round.nbContributions = round.nbContributions.plus(ONE_BI);
//   round.save();

//   const contributions = poh.getContributions(
//     call.inputs._submissionID,
//     request.realIndex,
//     request.nbChallenges,
//     ZERO_BI,
//     call.from
//   );

//   const contribution = New.Contribution(round.id, call.from);
//   contribution.forRequester = contributions[1];
//   contribution.forChallenger = contributions[2];
//   contribution.save();

//   round = New.Round(challenge.id, ONE_BI);
//   round.creationTime = call.block.timestamp;
//   round.save();

//   //   const nextChallenge = new Challenge(
//   //     genId(request.id, biToBytes(request.nbChallenges))
//   //   );
//   //   nextChallenge.creationTime = call.block.timestamp;
//   //   nextChallenge.request = request.id;
//   //   nextChallenge.appealPeriodStart = ZERO_BI;
//   //   nextChallenge.appealPeriodEnd = ZERO_BI;
//   //   nextChallenge.nbRounds = ZERO_BI;
//   //   nextChallenge.save();

//   //   const nextRound = new Round(genId(nextChallenge.id, ZERO));
//   //   nextRound.creationTime = call.block.timestamp;
//   //   nextRound.challenge = nextChallenge.id;
//   //   nextRound.requesterFunds = ZERO_BI;
//   //   nextRound.challengerFunds = ZERO_BI;
//   //   nextRound.requesterPaid = false;
//   //   nextRound.challengerPaid = false;
//   //   nextRound.feeRewards = ZERO_BI;
//   //   nextRound.nbContributions = ZERO_BI;
//   //   nextRound.save();

//   const counter = getCounter();
//   counter.challengedClaims = counter.challengedClaims.plus(ONE_BI);
//   counter.pendingClaims = counter.pendingClaims.minus(ONE_BI);
//   counter.save();
// }

// export function fundAppeal(call: FundAppealCall): void {
//   const poh = ProofOfHumanityOld.bind(call.to);

//   const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

//   if (!claimer.currentRequest) {
//     log.debug("No current request: {}", [
//       call.inputs._submissionID.toHexString(),
//     ]);
//     return;
//   }

//   const request = Request.load(claimer.currentRequest as Bytes) as Request;

//   const challenge = Challenge.load(
//     genId(claimer.currentRequest as Bytes, biToBytes(call.inputs._challengeID))
//   ) as Challenge;

//   log.warning("fundAppeal getRoundInfo({}, {}, {}, {})", [
//     call.inputs._submissionID.toHex(),
//     request.realIndex.toString(),
//     call.inputs._challengeID.toString(),
//     challenge.nbRounds.toString(),
//   ]);
//   const roundInfo = poh.getRoundInfo(
//     call.inputs._submissionID,
//     request.realIndex,
//     call.inputs._challengeID,
//     challenge.nbRounds
//   );

//   let round = Round.load(genId(challenge.id, biToBytes(challenge.nbRounds)));
//   // if (!round.requesterPaid || !round.challengerPaid)
//   if (round == null) {
//     round = New.Round(challenge.id, challenge.nbRounds);
//     round.creationTime = call.block.timestamp;
//     round.save();

//     challenge.nbRounds = challenge.nbRounds.plus(ONE_BI);
//     challenge.save();

//     const nxtRound = New.Round(challenge.id, challenge.nbRounds);
//     nxtRound.creationTime = call.block.timestamp;
//     nxtRound.save();
//   }

//   round.challengerFunds = roundInfo.getPaidFees()[1];
//   round.requesterFunds = roundInfo.getPaidFees()[2];
//   round.challengerPaid = Party.parse(roundInfo.getSideFunded()) == Party.None;
//   round.requesterPaid = Party.parse(roundInfo.getSideFunded()) == Party.None;
//   round.feeRewards = roundInfo.getFeeRewards();

//   const contributions = poh.getContributions(
//     call.inputs._submissionID,
//     request.realIndex,
//     call.inputs._challengeID,
//     challenge.nbRounds,
//     call.from
//   );

//   let contribution = Contribution.load(genId(round.id, call.from));
//   if (contribution == null) {
//     contribution = New.Contribution(round.id, call.from);
//     round.nbContributions = round.nbContributions.plus(ONE_BI);
//   }
//   contribution.forRequester = contributions[1];
//   contribution.forChallenger = contributions[2];
//   contribution.save();
//   round.save();
// }

// export function executeRequest(call: ExecuteRequestCall): void {
//   const poh = ProofOfHumanityOld.bind(call.to);

//   const submissionInfo = poh.getSubmissionInfo(call.inputs._submissionID);

//   // If the status of the submission is not 0 (None), the call must have reverted.
//   if (submissionInfo.getStatus() != 0) return;

//   const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

//   if (!claimer.currentRequest) {
//     log.debug("No current request {}", [
//       call.inputs._submissionID.toHexString(),
//     ]);
//     return;
//   }

//   const soul = Soul.load(claimer.targetSoul as Bytes) as Soul;

//   if (submissionInfo.getRegistered()) {
//     claimer.hasSoul = submissionInfo.getRegistered();
//     soul.claimed = true;
//     soul.owner = claimer.id;
//     soul.expirationTime = submissionInfo
//       .getSubmissionTime()
//       .plus(poh.submissionDuration());
//     soul.save();
//   }
//   claimer.lastRequestTime = call.block.timestamp;
//   claimer.save();

//   const request = Request.load(claimer.currentRequest as Bytes) as Request;
//   request.status = "Resolved";
//   request.resolutionTime = call.block.timestamp;
//   request.save();

//   // log.warning("executeRequest getRoundInfo({}, {}, {}, {})", [
//   //   call.inputs._submissionID.toHex(),
//   //   request.realIndex.toString(),
//   //   ZERO_BI.toString(),
//   //   ZERO_BI.toString(),
//   // ]);
//   // let roundInfo = poh.getRoundInfo(
//   //   call.inputs._submissionID,
//   //   request.realIndex,
//   //   ZERO_BI,
//   //   ZERO_BI
//   // );
//   // let contributions = poh.getContributions(
//   //   call.inputs._submissionID,
//   //   request.realIndex,
//   //   ZERO_BI,
//   //   ZERO_BI,
//   //   changetype<Address>(request.requester)
//   // );

//   // const round = Round.load(genId(genId(request.id, ZERO), ZERO)) as Round;
//   // round.requesterFunds = roundInfo.getPaidFees()[1];
//   // if (roundInfo.getAppealed())
//   //   round.requesterPaid = roundInfo.getAppealed()
//   //     ? Party.parse(roundInfo.getSideFunded()) == Party.None
//   //     : Party.parse(roundInfo.getSideFunded()) == Party.Requester;
//   // round.feeRewards = roundInfo.getFeeRewards();

//   // let contribution = Contribution.load(genId(round.id, request.requester));
//   // if (contribution == null) {
//   //   round.nbContributions = round.nbContributions.plus(ONE_BI);
//   //   contribution = New.Contribution(round.id, request.requester);
//   // }
//   // contribution.forRequester = contributions[1];
//   // contribution.forChallenger = contributions[2];
//   // contribution.save();
//   // round.save();

//   // let actualIterations: BigInt;
//   // const AUTO_PROCESSED_VOUCH = BigInt.fromI32(10);
//   // if (
//   //   AUTO_PROCESSED_VOUCH.plus(request.lastProcessedVouchIndex).le(
//   //     BigInt.fromI32(request.vouches.length)
//   //   )
//   // )
//   //   actualIterations = AUTO_PROCESSED_VOUCH;
//   // else
//   //   actualIterations = BigInt.fromI32(request.vouches.length).minus(
//   //     request.lastProcessedVouchIndex
//   //   );

//   // const endIndex = actualIterations.plus(request.lastProcessedVouchIndex);
//   // request.lastProcessedVouchIndex = endIndex;
//   // request.vouchReleaseReady = false;
//   // request.save();

//   // for (let i = 0; i < endIndex.toI32(); i++) {
//   //   const voucher = Claimer.load(request.vouches[i]) as Claimer;

//   //   const voucherSoul = Soul.load(request.vouches[i]) as Soul;
//   //   voucherSoul.usedVouch = null;
//   //   voucherSoul.save();

//   //   if (request.ultimateChallenger && voucher.currentRequest) {
//   //     const voucherRequest = Request.load(
//   //       voucher.currentRequest as Bytes
//   //     ) as Request;
//   //     if (
//   //       request.usedReasons[request.usedReasons.length - 1] == "Duplicate" ||
//   //       request.usedReasons[request.usedReasons.length - 1] == "DoesNotExist"
//   //     ) {
//   //       if (
//   //         voucherRequest.status == "Vouching" ||
//   //         voucherRequest.status == "Resolving"
//   //       ) {
//   //         voucherRequest.requesterLost = true;
//   //         voucherRequest.save();
//   //       }

//   //       voucher.hasSoul = false;
//   //       voucher.soul = ZERO_ADDRESS;
//   //       voucher.save();
//   //     }
//   //   }
//   // }
// }

// // export function processVouches(call: ProcessVouchesCall): void {
// //   const request = Request.load(
// //     genId(call.inputs._submissionID, biToBytes(call.inputs._requestID))
// //   ) as Request;
// //   let actualIterations: BigInt;
// //   if (
// //     call.inputs._iterations
// //       .plus(request.lastProcessedVouchIndex)
// //       .le(BigInt.fromI32(request.vouches.length))
// //   )
// //     actualIterations = call.inputs._iterations;
// //   else
// //     actualIterations = BigInt.fromI32(request.vouches.length).minus(
// //       request.lastProcessedVouchIndex
// //     );
// //   const endIndex = actualIterations.plus(request.lastProcessedVouchIndex);
// //   request.lastProcessedVouchIndex = endIndex;
// //   request.save();
// //   for (let i = 0; i < endIndex.toI32(); i++) {
// //     const voucher = Claimer.load(request.vouches[i]) as Claimer;
// //     const voucherSoul = Soul.load(request.vouches[i]) as Soul;
// //     voucherSoul.usedVouch = null;
// //     voucherSoul.save();
// //     if (request.ultimateChallenger && voucher.currentRequest) {
// //       const voucherRequest = Request.load(
// //         voucher.currentRequest as Bytes
// //       ) as Request;
// //       if (
// //         request.usedReasons[request.usedReasons.length - 1] == "Duplicate" ||
// //         request.usedReasons[request.usedReasons.length - 1] == "DoesNotExist"
// //       ) {
// //         if (
// //           voucherRequest.status == "Vouching" ||
// //           voucherRequest.status == "Resolving"
// //         ) {
// //           voucherRequest.requesterLost = true;
// //           voucherRequest.save();
// //         }
// //         voucher.hasSoul = false;
// //         voucher.soul = ZERO_ADDRESS;
// //         voucher.save();
// //       }
// //     }
// //   }
// // }

// // export function withdrawFeesAndRewards(call: WithdrawFeesAndRewardsCall): void {
// //   const poh = ProofOfHumanityOld.bind(call.to);

// //   const request = Request.load(
// //     genId(call.inputs._submissionID, biToBytes(call.inputs._requestID))
// //   ) as Request;
// //   const round = Round.load(
// //     genId(
// //       genId(request.id, biToBytes(call.inputs._challengeID)),
// //       biToBytes(call.inputs._round)
// //     )
// //   );

// //   if (round == null) {
// //     log.warning("Could not find round | tx {}", [
// //       call.transaction.hash.toHexString(),
// //     ]);
// //     return;
// //   }

// //   log.warning("withdrawFeesAndRewards getRoundInfo({}, {}, {}, {})", [
// //     call.inputs._submissionID.toHex(),
// //     call.inputs._requestID.toString(),
// //     call.inputs._challengeID.toString(),
// //     call.inputs._round.toString(),
// //   ]);
// //   const roundInfo = poh.getRoundInfo(
// //     call.inputs._submissionID,
// //     call.inputs._requestID,
// //     call.inputs._challengeID,
// //     call.inputs._round
// //   );
// //   const contributions = poh.getContributions(
// //     call.inputs._submissionID,
// //     call.inputs._requestID,
// //     call.inputs._challengeID,
// //     call.inputs._round,
// //     call.inputs._beneficiary
// //   );
// //   round.requesterFunds = roundInfo.getPaidFees()[1];
// //   round.challengerFunds = roundInfo.getPaidFees()[2];
// //   if (roundInfo.getAppealed()) {
// //     round.requesterPaid = Party.parse(roundInfo.getSideFunded()) == Party.None;
// //     round.challengerPaid = Party.parse(roundInfo.getSideFunded()) == Party.None;
// //   } else {
// //     round.requesterPaid =
// //       Party.parse(roundInfo.getSideFunded()) == Party.Requester;
// //     round.challengerPaid =
// //       Party.parse(roundInfo.getSideFunded()) == Party.Challenger;
// //   }
// //   round.feeRewards = roundInfo.getFeeRewards();
// //   round.save();

// //   const contribution = Contribution.load(
// //     genId(round.id, call.inputs._beneficiary)
// //   );

// //   if (contribution == null) {
// //     if (
// //       !request.ultimateChallenger ||
// //       call.inputs._beneficiary !== request.ultimateChallenger
// //     ) {
// //       log.warning("Withdrew null contribution | tx {}", [
// //         call.transaction.hash.toHexString(),
// //       ]);
// //     }
// //     return;
// //   }

// //   contribution.forRequester = contributions[1];
// //   contribution.forChallenger = contributions[2];
// //   contribution.save();
// // }

// export function rule(call: RuleCall): void {
//   const poh = ProofOfHumanityOld.bind(call.to);

//   const disputeData = poh.arbitratorDisputeIDToDisputeData(
//     call.from,
//     call.inputs._disputeID
//   );

//   const soul = Soul.load(disputeData.getSubmissionID()) as Soul;
//   const claimer = Claimer.load(disputeData.getSubmissionID()) as Claimer;

//   const submissionInfo = poh.getSubmissionInfo(disputeData.getSubmissionID());

//   if (submissionInfo.getRegistered()) {
//     soul.owner = claimer.id;
//     soul.claimed = true;
//     soul.expirationTime = submissionInfo
//       .getSubmissionTime()
//       .plus(poh.submissionDuration());
//     soul.save();

//     claimer.hasSoul = submissionInfo.getRegistered();
//     claimer.targetSoul = ZERO_ADDRESS;
//   }

//   if (!claimer.currentRequest) {
//     log.debug("No current request: {}", [
//       disputeData.getSubmissionID().toHexString(),
//     ]);
//     return;
//   }

//   const request = Request.load(claimer.currentRequest as Bytes) as Request;
//   const requestInfo = poh.getRequestInfo(
//     disputeData.getSubmissionID(),
//     request.realIndex
//   );
//   request.lastStatusChange = call.block.timestamp;
//   if (requestInfo.getDisputed()) request.status = "Disputed";
//   if (requestInfo.getResolved()) request.status = "Resolved";
//   request.currentReason = Reason.parse(requestInfo.getCurrentReason());
//   request.ultimateChallenger = requestInfo.getUltimateChallenger();
//   request.requesterLost = requestInfo.getRequesterLost();

//   claimer.disputed = false;

//   const challenge = Challenge.load(
//     genId(request.id, biToBytes(disputeData.getChallengeID()))
//   );

//   if (challenge == null) {
//     log.warning("Challenge not found | tx hash: {}", [
//       call.transaction.hash.toHexString(),
//     ]);
//     return;
//   }

//   const challengeInfo = poh.getChallengeInfo(
//     disputeData.getSubmissionID(),
//     request.realIndex,
//     disputeData.getChallengeID()
//   );

//   challenge.ruling = Party.parse(challengeInfo.getRuling());
//   challenge.appealPeriodEnd = ZERO_BI;
//   challenge.appealPeriodStart = ZERO_BI;
//   challenge.save();

//   if (requestInfo.getResolved()) request.resolutionTime = call.block.timestamp;

//   claimer.save();
//   request.save();

//   if (!requestInfo.getResolved()) return;
// }

// export function submitEvidence(call: SubmitEvidenceCall): void {
//   const claimer = Claimer.load(call.inputs._submissionID) as Claimer;

//   if (!claimer.currentRequest) {
//     log.debug("No current request: {}", [
//       call.inputs._submissionID.toHexString(),
//     ]);
//     return;
//   }

//   const request = Request.load(claimer.currentRequest as Bytes) as Request;
//   const evidence = new Evidence(
//     genId(request.id, biToBytes(request.nbEvidence))
//   );
//   evidence.creationTime = call.block.timestamp;
//   evidence.request = request.id;
//   evidence.URI = call.inputs._evidence;
//   evidence.sender = call.from;
//   evidence.save();

//   request.nbEvidence = request.nbEvidence.plus(ONE_BI);
//   request.save();
// }

// export function newRequest(
//   claimer: Address,
//   requestIndex: BigInt,
//   evidenceUri: string,
//   call: ethereum.Call,
//   registration: boolean
// ): Request {
//   const poh = ProofOfHumanityOld.bind(call.to);

//   const request = New.Request(claimer, requestIndex, registration);
//   request.creationTime = call.block.timestamp;
//   request.requester = call.from;
//   request.lastStatusChange = call.block.timestamp;
//   request.nbEvidence = ONE_BI;
//   request.save();

//   const evidence = new Evidence(genId(request.id, ZERO));
//   evidence.creationTime = call.block.timestamp;
//   evidence.URI = evidenceUri;
//   evidence.request = request.id;
//   evidence.sender = call.transaction.from;
//   evidence.save();

//   const challenge = New.Challenge(request.id, ZERO_BI);
//   challenge.creationTime = call.block.timestamp;
//   challenge.nbRounds = ONE_BI;
//   challenge.save();

//   log.warning("newRequest getRoundInfo({}, {}, {}, {})", [
//     claimer.toHex(),
//     requestIndex.toString(),
//     ZERO_BI.toString(),
//     ZERO_BI.toString(),
//   ]);
//   const roundInfo = poh.getRoundInfo(claimer, requestIndex, ZERO_BI, ZERO_BI);

//   const round = New.Round(challenge.id, ZERO_BI);
//   round.creationTime = call.block.timestamp;
//   round.requesterFunds = roundInfo.getPaidFees()[1];
//   round.requesterPaid =
//     Party.parse(roundInfo.getSideFunded()) == Party.Requester;
//   round.challengerFunds = roundInfo.getPaidFees()[2];
//   round.feeRewards = roundInfo.getFeeRewards();
//   round.nbContributions = ONE_BI;
//   round.save();

//   const contribution = New.Contribution(round.id, call.from);
//   contribution.forRequester = roundInfo.getPaidFees()[1];
//   contribution.forChallenger = roundInfo.getPaidFees()[2];
//   contribution.save();

//   return request;
// }
