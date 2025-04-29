// src/services/suilendService.ts

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { initializeSuilend, InitializeSuilendReturn } from "@suilend/sdk";
import { SuilendClient } from "@suilend/sdk/client";

// Sui mainnet RPC endpoint
const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

// Official Suilend mainnet market IDs (non-beta)
const LENDING_MARKET_ID =
  "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1"; // Main market object ID
const LENDING_MARKET_TYPE =
  "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL"; // Package::module::Struct&#8203;:contentReference[oaicite:0]{index=0}

let clientPromise: Promise<SuilendClient> | null = null;

/** Initialize (and cache) the SuilendClient on mainnet */
export async function getSuilendClient(): Promise<SuilendClient> {
  if (!clientPromise) {
    clientPromise = SuilendClient.initialize(
      LENDING_MARKET_ID,
      LENDING_MARKET_TYPE,
      suiClient
    );
  }
  return clientPromise;
}

/**
 * Fetch both the full lending market state AND the user's obligation info.
 * Returns the same shape as the SDK’s initializeSuilend:
 * { suilendClient, lendingMarket, reserveMap, coinMetadataMap, obligationOwnerCaps, obligations }
 */
export async function fetchLendingData(
  userAddress: string
): Promise<InitializeSuilendReturn> {
  const suilendClient = await getSuilendClient();
  const data = await initializeSuilend(suiClient, suilendClient, userAddress);
  return data;
}
