// src/services/suilendService.ts

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
  SuilendClient,
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
} from "@suilend/sdk/client";
import {
  initializeSuilend,
  InitializeSuilendReturn,
  createObligationIfNoneExists,
  sendObligationToUser,
} from "@suilend/sdk";

// mainnet RPC
const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

let clientPromise: Promise<SuilendClient> | null = null;

/** Initialize & cache the SuilendClient */
async function getSuilendClient(): Promise<SuilendClient> {
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
 * Fetch raw market + user-data via the SDK.
 * Returns: { suilendClient, lendingMarket, reserveMap, coinMetadataMap, obligationOwnerCaps, obligations }
 */
export async function fetchLendingData(
  userAddress: string
): Promise<InitializeSuilendReturn> {
  const client = await getSuilendClient();
  const data = await initializeSuilend(suiClient, client, userAddress);
  return data;
}

// --- Transaction helpers (unchanged) ---

export async function deposit(
  address: string,
  coinType: string,
  amountBaseUnits: bigint,
  tx: Transaction
): Promise<void> {
  const client = await getSuilendClient();
  const { obligationOwnerCapId, didCreate } = createObligationIfNoneExists(
    client,
    tx,
    null
  );
  await client.depositIntoObligation(
    address,
    coinType,
    amountBaseUnits,
    tx,
    obligationOwnerCapId
  );
  if (didCreate) {
    await sendObligationToUser(obligationOwnerCapId, address, tx);
  }
}

export async function withdraw(
  address: string,
  coinType: string,
  amountBaseUnits: bigint,
  tx: Transaction
): Promise<void> {
  const client = await getSuilendClient();
  // you may need to pass ownerCap & obligation IDs here
  await client.withdrawAndSendToUser(
    address,
    /* ownerCapId */ "",
    /* obligationId */ "",
    coinType,
    amountBaseUnits,
    tx
  );
}

export async function borrow(
  address: string,
  coinType: string,
  amountBaseUnits: bigint,
  tx: Transaction
): Promise<void> {
  const client = await getSuilendClient();
  await client.borrowAndSendToUser(
    address,
    /* ownerCapId */ "",
    /* obligationId */ "",
    coinType,
    amountBaseUnits,
    tx
  );
}

export async function repay(
  address: string,
  coinType: string,
  amountBaseUnits: bigint,
  tx: Transaction
): Promise<void> {
  const client = await getSuilendClient();
  await client.repayIntoObligation(
    address,
    /* obligationId */ "",
    coinType,
    amountBaseUnits,
    tx
  );
}
