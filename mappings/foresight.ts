import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ForesightCreditUse,
  ForesightTrade,
} from "../generated/schema";
import { Transfer as ForesightCreditsTransfer } from "../generated/ForesightCredits/ForesightCredits";
import { TradeExecutor } from "../generated/ForesightCredits/TradeExecutor";
import {
  MergePositionsCall,
  MergeToBaseCall,
  RedeemPositionsCall,
  RedeemToBaseCall,
  SplitFromBaseCall,
  SplitPositionCall,
} from "../generated/ForesightGnosisRouter/GnosisRouter";
import { AnalyticsUtil, getHumanAnalyticsProfile } from "../utils/analytics";
import { CrossChainProofOfHumanity } from "../generated/CrossChainProofOfHumanity/CrossChainProofOfHumanity";
import {
  ForesightMarketAddress,
  ForesightRouterAddress,
} from "../utils/hardcoded";

const ZERO_ADDRESS = Address.zero();
const ZERO_HUMANITY = Bytes.fromHexString(
  "0x0000000000000000000000000000000000000000"
) as Bytes;
const CROSS_CHAIN_PROOF_OF_HUMANITY = Address.fromString(
  "0x16044E1063C08670f8653055A786b7CC2034d2b0"
);
const FORESIGHT_CREDITS_MANAGER = Address.fromString(
  "0x17592eFE59a318A6B0AFE32145ee04eAFeeA8A61"
);

function getActorOwner(actor: Address): Address {
  if (actor.equals(ForesightRouterAddress)) {
    return actor;
  }

  const tradeExecutor = TradeExecutor.bind(actor);
  const ownerResult = tradeExecutor.try_owner();

  if (ownerResult.reverted) {
    return actor;
  }

  if (ownerResult.value.equals(ZERO_ADDRESS)) {
    return actor;
  }

  return ownerResult.value;
}

function getHumanityIdForOwner(owner: Address): Bytes {
  const crossChainProofOfHumanity = CrossChainProofOfHumanity.bind(
    CROSS_CHAIN_PROOF_OF_HUMANITY
  );
  const crossChainHuman = crossChainProofOfHumanity.try_isHuman(owner);
  if (crossChainHuman.reverted) {
    return ZERO_HUMANITY;
  }

  if (!crossChainHuman.value) {
    return ZERO_HUMANITY;
  }

  const crossChainHumanityId = crossChainProofOfHumanity.try_humanityOf(owner);
  if (crossChainHumanityId.reverted) {
    return ZERO_HUMANITY;
  }

  if (crossChainHumanityId.value.equals(ZERO_HUMANITY)) {
    return ZERO_HUMANITY;
  }

  return crossChainHumanityId.value;
}

function getEventId(txHash: Bytes, suffix: string): string {
  return txHash.toHexString().concat(":").concat(suffix);
}

function isForesightMarket(market: Address): boolean {
  return market.equals(ForesightMarketAddress);
}

function trackForesightTrade(
  actor: Address,
  market: Address,
  timestamp: BigInt,
  txHash: Bytes,
  suffix: string
): void {
  if (!isForesightMarket(market)) {
    return;
  }

  const owner = getActorOwner(actor);
  const humanityId = getHumanityIdForOwner(owner);
  if (humanityId.equals(ZERO_HUMANITY)) {
    return;
  }

  const tradeId = getEventId(txHash, suffix);
  const trade = new ForesightTrade(tradeId);
  trade.humanityId = humanityId;
  trade.timestamp = timestamp;
  trade.save();

  const profile = getHumanAnalyticsProfile(humanityId);
  const isNewParticipant = !profile.hasParticipatedInForesight;
  if (isNewParticipant) {
    profile.hasParticipatedInForesight = true;
    profile.save();
  }

  AnalyticsUtil.onForesightParticipation(isNewParticipant);
}

function trackForesightCreditUse(
  actor: Address,
  timestamp: BigInt,
  txHash: Bytes,
  suffix: string
): void {
  const owner = getActorOwner(actor);
  const humanityId = getHumanityIdForOwner(owner);
  if (humanityId.equals(ZERO_HUMANITY)) {
    return;
  }

  const creditUseId = getEventId(txHash, suffix);
  const creditUse = new ForesightCreditUse(creditUseId);
  creditUse.humanityId = humanityId;
  creditUse.timestamp = timestamp;
  creditUse.save();

  const profile = getHumanAnalyticsProfile(humanityId);
  const isNewCreditUser = !profile.hasUsedForesightCredits;
  if (isNewCreditUser) {
    profile.hasUsedForesightCredits = true;
    profile.save();
  }

  AnalyticsUtil.onForesightCreditUse(isNewCreditUser);
}

export function handleSplitFromBase(call: SplitFromBaseCall): void {
  trackForesightTrade(
    call.from,
    call.inputs.market,
    call.block.timestamp,
    call.transaction.hash,
    "splitFromBase"
  );
}

export function handleMergeToBase(call: MergeToBaseCall): void {
  trackForesightTrade(
    call.from,
    call.inputs.market,
    call.block.timestamp,
    call.transaction.hash,
    "mergeToBase"
  );
}

export function handleRedeemToBase(call: RedeemToBaseCall): void {
  trackForesightTrade(
    call.from,
    call.inputs.market,
    call.block.timestamp,
    call.transaction.hash,
    "redeemToBase"
  );
}

export function handleSplitPosition(call: SplitPositionCall): void {
  trackForesightTrade(
    call.from,
    call.inputs.market,
    call.block.timestamp,
    call.transaction.hash,
    "splitPosition"
  );
}

export function handleMergePositions(call: MergePositionsCall): void {
  trackForesightTrade(
    call.from,
    call.inputs.market,
    call.block.timestamp,
    call.transaction.hash,
    "mergePositions"
  );
}

export function handleRedeemPositions(call: RedeemPositionsCall): void {
  trackForesightTrade(
    call.from,
    call.inputs.market,
    call.block.timestamp,
    call.transaction.hash,
    "redeemPositions"
  );
}

export function handleForesightCreditsTransfer(
  event: ForesightCreditsTransfer
): void {
  if (event.params.from.equals(ZERO_ADDRESS)) {
    return;
  }

  const isBurn = event.params.to.equals(ZERO_ADDRESS);
  const isManagerTransfer = event.params.to.equals(FORESIGHT_CREDITS_MANAGER);

  if (!isBurn && !isManagerTransfer) {
    return;
  }

  trackForesightCreditUse(
    event.params.from,
    event.block.timestamp,
    event.transaction.hash,
    "creditUse:".concat(event.logIndex.toString())
  );
}
