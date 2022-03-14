import { BigInt } from "@graphprotocol/graph-ts"
import {
  ProofOfHumanity,
  AddSubmission,
  AppealContribution,
  ArbitratorComplete,
  ChallengeResolved,
  Dispute,
  Evidence,
  HasPaidAppealFee,
  MetaEvidence,
  ReapplySubmission,
  RemoveSubmission,
  Ruling,
  SubmissionChallenged,
  VouchAdded,
  VouchRemoved
} from "../generated/ProofOfHumanity/ProofOfHumanity"
import { ExampleEntity } from "../generated/schema"

export function handleAddSubmission(event: AddSubmission): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity._submissionID = event.params._submissionID
  entity._requestID = event.params._requestID

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.arbitratorDataList(...)
  // - contract.arbitratorDisputeIDToDisputeData(...)
  // - contract.challengePeriodDuration(...)
  // - contract.checkRequestDuplicates(...)
  // - contract.getArbitratorDataListCount(...)
  // - contract.getChallengeInfo(...)
  // - contract.getContributions(...)
  // - contract.getNumberOfVouches(...)
  // - contract.getRequestInfo(...)
  // - contract.getRoundInfo(...)
  // - contract.getSubmissionInfo(...)
  // - contract.governor(...)
  // - contract.isRegistered(...)
  // - contract.loserStakeMultiplier(...)
  // - contract.renewalPeriodDuration(...)
  // - contract.requiredNumberOfVouches(...)
  // - contract.sharedStakeMultiplier(...)
  // - contract.submissionBaseDeposit(...)
  // - contract.submissionCounter(...)
  // - contract.submissionDuration(...)
  // - contract.vouches(...)
  // - contract.winnerStakeMultiplier(...)
}

export function handleAppealContribution(event: AppealContribution): void {}

export function handleArbitratorComplete(event: ArbitratorComplete): void {}

export function handleChallengeResolved(event: ChallengeResolved): void {}

export function handleDispute(event: Dispute): void {}

export function handleEvidence(event: Evidence): void {}

export function handleHasPaidAppealFee(event: HasPaidAppealFee): void {}

export function handleMetaEvidence(event: MetaEvidence): void {}

export function handleReapplySubmission(event: ReapplySubmission): void {}

export function handleRemoveSubmission(event: RemoveSubmission): void {}

export function handleRuling(event: Ruling): void {}

export function handleSubmissionChallenged(event: SubmissionChallenged): void {}

export function handleVouchAdded(event: VouchAdded): void {}

export function handleVouchRemoved(event: VouchRemoved): void {}
