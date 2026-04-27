import { Address } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/SeerCredits/SeerCredits";
import {
  CrossChainRegistration,
  Registration,
} from "../generated/schema";
import {
  getDailyAnalytics,
  getDayStart,
  getGlobalAnalytics,
  getHumanAnalyticsProfile,
} from "../utils/analytics";
import { ONE } from "../utils/constants";

const ZERO_ADDRESS = Address.zero();
const EXECUTE_SELECTOR = "0x70ec9d08"; // execute(address,bytes,uint256,address)

export function handleTransfer(event: Transfer): void {
  if (!event.params.to.equals(ZERO_ADDRESS)) return;

  const inputHex = event.transaction.input.toHexString();
  if (inputHex.length < EXECUTE_SELECTOR.length) return;
  if (inputHex.slice(0, EXECUTE_SELECTOR.length) != EXECUTE_SELECTOR) return;

  const registration = Registration.load(event.params.from);
  const crossChainRegistration = CrossChainRegistration.load(event.params.from);

  const hasActiveRegistration =
    registration != null && registration.expirationTime.gt(event.block.timestamp);
  const hasActiveCrossChainRegistration =
    crossChainRegistration != null &&
    crossChainRegistration.expirationTime.gt(event.block.timestamp);

  if (!hasActiveRegistration && !hasActiveCrossChainRegistration) return;

  const global = getGlobalAnalytics();
  const daily = getDailyAnalytics(event.block.timestamp);

  global.seerCreditsBuys = global.seerCreditsBuys.plus(ONE);
  daily.seerCreditsBuys = daily.seerCreditsBuys.plus(ONE);

  const humanityId = event.params.from;
  const profile = getHumanAnalyticsProfile(humanityId);

  if (!profile.hasUsedSeerCredits) {
    profile.hasUsedSeerCredits = true;
    global.seerCreditsUsers = global.seerCreditsUsers.plus(ONE);
  }

  const day = getDayStart(event.block.timestamp);
  if (!profile.lastSeerCreditsBuyDay.equals(day)) {
    profile.lastSeerCreditsBuyDay = day;
    daily.seerCreditsUsers = daily.seerCreditsUsers.plus(ONE);
  }

  profile.save();
  global.save();
  daily.save();
}
