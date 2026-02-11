import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/SeerCredits/SeerCredits";
import {
  CrossChainRegistration,
  Registration,
  SeerCreditsDailyUser,
  SeerCreditsUser,
} from "../generated/schema";
import { getDailyAnalytics, getGlobalAnalytics } from "../utils/analytics";
import { ONE } from "../utils/constants";

const ZERO_ADDRESS = Address.zero();
const DAY_SECONDS = BigInt.fromI32(86400);
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

  const walletId = event.params.from.toHexString();
  let user = SeerCreditsUser.load(walletId);
  if (user == null) {
    user = new SeerCreditsUser(walletId);
    user.save();
    global.seerCreditsUsers = global.seerCreditsUsers.plus(ONE);
  }

  const day = event.block.timestamp.div(DAY_SECONDS).times(DAY_SECONDS);
  const dailyUserId = day.toString().concat("-").concat(walletId);
  let dailyUser = SeerCreditsDailyUser.load(dailyUserId);
  if (dailyUser == null) {
    dailyUser = new SeerCreditsDailyUser(dailyUserId);
    dailyUser.save();
    daily.seerCreditsUsers = daily.seerCreditsUsers.plus(ONE);
  }

  global.save();
  daily.save();
}
