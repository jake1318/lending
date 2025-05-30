import { SuiClient } from "@mysten/sui.js/client";
import { Scallop, ScallopClient } from "@scallop-io/sui-scallop-sdk";

/** --- Core config --- **/
const SUI_MAINNET = "http://localhost:5001/sui";
const SCALLOP_ADDRESS_ID = "67c44a103fe1b8c454eb9699";
const client = new SuiClient({ url: SUI_MAINNET });

const scallop = new Scallop({
  addressId: SCALLOP_ADDRESS_ID,
  networkType: "mainnet",
  suiProvider: client,
});
const scallopClient = new ScallopClient({
  addressId: SCALLOP_ADDRESS_ID,
  networkType: "mainnet",
  suiProvider: client,
});

/** --- Market metadata fetch --- **/
export async function fetchMarketAssets() {
  try {
    const query = await scallop.createScallopQuery();
    await query.init();
    const marketData = await query.queryMarket();
    const pools = marketData.pools || {};
    let priceMap: Record<string, number> = {};
    try {
      priceMap = await query.getPricesFromPyth();
    } catch {}
    return Object.values(pools).map((m: any) => {
      const symbol = m.symbol || m.coinName;
      const price = priceMap[symbol] || m.coinPrice || 0;
      const decimals = Number(m.coinDecimal || 9);
      const totalSupply = Number(m.supplyAmount || 0) / 10 ** decimals;
      const totalBorrow = Number(m.borrowAmount || 0) / 10 ** decimals;
      const utilization =
        totalSupply > 0 ? (totalBorrow / totalSupply) * 100 : 0;
      const depositApy = Number(m.supplyApy ?? m.supplyApr ?? 0) * 100;
      const borrowApy = Number(m.borrowApy ?? m.borrowApr ?? 0) * 100;
      return {
        symbol,
        coinType: m.coinType,
        depositApy,
        borrowApy,
        decimals,
        marketSize: totalSupply,
        totalBorrow,
        utilization,
        price,
      };
    });
  } catch (err) {
    console.error("fetchMarketAssets error:", err);
    return [];
  }
}

/** --- Suiet signing bridge: always pass ONLY signAndExecuteTransactionBlock --- **/
async function callScallopTx(
  method: "deposit" | "withdraw" | "borrow" | "repay",
  signer: (args: any) => Promise<any>,
  coinType: string,
  amount: number,
  decimals: number
) {
  try {
    const amountBN = BigInt(Math.floor(amount * 10 ** decimals));
    // All ScallopClient methods expect: (coinType, amount, autoCreateObligation, signer)
    let res;
    switch (method) {
      case "deposit":
        res = await scallopClient.deposit(coinType, amountBN, true, signer);
        break;
      case "withdraw":
        res = await scallopClient.withdraw(coinType, amountBN, true, signer);
        break;
      case "borrow":
        res = await scallopClient.borrow(coinType, amountBN, true, signer);
        break;
      case "repay":
        res = await scallopClient.repay(coinType, amountBN, true, signer);
        break;
      default:
        throw new Error("Invalid method");
    }
    return {
      success: res.effects?.status?.status === "success",
      digest: res.digest,
    };
  } catch (err) {
    console.error(`${method} error:`, err);
    return { success: false, digest: undefined };
  }
}

/** --- Dapp-friendly permanent wrappers --- **/
export function supply(
  signer: (args: any) => Promise<any>,
  coinType: string,
  amount: number,
  decimals: number
) {
  return callScallopTx("deposit", signer, coinType, amount, decimals);
}
export function withdraw(
  signer: (args: any) => Promise<any>,
  coinType: string,
  amount: number,
  decimals: number
) {
  return callScallopTx("withdraw", signer, coinType, amount, decimals);
}
export function borrow(
  signer: (args: any) => Promise<any>,
  coinType: string,
  amount: number,
  decimals: number
) {
  return callScallopTx("borrow", signer, coinType, amount, decimals);
}
export function repay(
  signer: (args: any) => Promise<any>,
  coinType: string,
  amount: number,
  decimals: number
) {
  return callScallopTx("repay", signer, coinType, amount, decimals);
}

const scallopService = {
  fetchMarketAssets,
  supply,
  withdraw,
  borrow,
  repay,
};

export default scallopService;
