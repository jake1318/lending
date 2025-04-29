// src/pages/LendingPage.tsx

import React, { useState, useEffect } from "react";
import { Transaction } from "@mysten/sui/transactions";
import {
  createObligationIfNoneExists,
  sendObligationToUser,
} from "@suilend/sdk";
import { useWallet } from "@suiet/wallet-kit";
import { fetchLendingData } from "../services/suilendService";
import AccountOverview from "../components/AccountOverview";
import DepositedAssets from "../components/DepositedAssets";
import MarketTable from "../components/MarketTable";
import "../styles/theme.scss";

const POLL_INTERVAL = 15_000; // 15 seconds

const LendingPage: React.FC = () => {
  const { account, signAndExecuteTransactionBlock, connected } = useWallet();
  const address = account?.address || "";

  // SDK & on-chain state
  const [suilendClient, setSuilendClient] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);
  const [coinMetadataMap, setCoinMetadataMap] = useState<Record<string, any>>(
    {}
  );
  const [obligationOwnerCaps, setObligationOwnerCaps] = useState<any[]>([]);
  const [obligations, setObligations] = useState<any[]>([]);

  // Polling: fetch market + obligation data on connect & every POLL_INTERVAL ms
  useEffect(() => {
    if (!connected || !address) return;
    let active = true;

    const loadData = async () => {
      try {
        const data = await fetchLendingData(address);
        if (!active) return;
        setSuilendClient(data.suilendClient);
        setMarket(data.lendingMarket);
        setCoinMetadataMap(data.coinMetadataMap);
        setObligationOwnerCaps(data.obligationOwnerCaps ?? []);
        setObligations(data.obligations ?? []);
      } catch (e) {
        console.error("fetchLendingData failed", e);
      }
    };

    loadData();
    const id = setInterval(loadData, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [connected, address]);

  // Connection & loading states
  if (!connected) return <p>Please connect your wallet.</p>;
  if (!market) return <p>Loading dashboard...</p>;

  //
  // 1) Build Main Market `reserves` array
  //
  const reserves = market.reserves.map((r: any) => {
    const coinType = r.coinType;
    const meta = coinMetadataMap[coinType] || {};
    const symbol = meta.symbol || coinType.split("::").pop();
    const priceUSD = meta.priceUsd ?? meta.priceUSD ?? 0;
    const stats = r.stats ?? {};
    const totalDeposits = Number(stats.totalSupply ?? stats.total_supply ?? 0);
    const totalBorrows = Number(
      stats.totalBorrowed ?? stats.total_borrowed ?? 0
    );
    const depositApr =
      (stats.depositInterestAPR ?? stats.deposit_interest_apr ?? 0) * 100;
    const depositRewardApr =
      (stats.depositRewardAPR ?? stats.deposit_reward_apr ?? 0) * 100;
    const borrowApr =
      (stats.borrowInterestAPR ?? stats.borrow_interest_apr ?? 0) * 100;
    const borrowRewardApr =
      (stats.borrowRewardAPR ?? stats.borrow_reward_apr ?? 0) * 100;
    const cfg = r.config ?? {};
    const ltv = cfg.loanToValue ?? cfg.loan_to_value ?? 0;
    const borrowWeight = cfg.borrowWeight ?? cfg.borrow_weight ?? 1;

    return {
      symbol,
      priceUSD,
      totalDeposits,
      totalDepositsUSD: totalDeposits * priceUSD,
      totalBorrows,
      totalBorrowsUSD: totalBorrows * priceUSD,
      ltv,
      borrowWeight,
      depositApr,
      depositRewardApr: depositRewardApr || undefined,
      borrowApr,
      borrowRewardApr: borrowRewardApr || undefined,
    };
  });

  //
  // 2) Transform raw obligation into user-friendly lists
  //
  const rawOb = obligations[0] ?? {
    deposits: [] as any[],
    borrows: [] as any[],
    totalDepositsUsd: 0,
    totalBorrowsUsd: 0,
  };

  const userDeposits = rawOb.deposits.map((d: any) => {
    const coinType = d.reserve;
    const meta = coinMetadataMap[coinType] || {};
    const symbol = meta.symbol || coinType.split("::").pop()!;
    const decimals = meta.decimals ?? 0;
    const amount =
      Number(d.liquidityTokenBalance ?? d.amount ?? 0) / 10 ** decimals;
    const valueUSD = amount * (meta.priceUsd ?? meta.priceUSD ?? 0);
    return { symbol, amount, valueUSD };
  });

  const userBorrows = rawOb.borrows.map((b: any) => {
    const coinType = b.reserve;
    const meta = coinMetadataMap[coinType] || {};
    const symbol = meta.symbol || coinType.split("::").pop()!;
    const decimals = meta.decimals ?? 0;
    const amount = Number(b.borrowedBalance ?? b.amount ?? 0) / 10 ** decimals;
    const valueUSD = amount * (meta.priceUsd ?? meta.priceUSD ?? 0);
    return { symbol, amount, valueUSD };
  });

  //
  // 3) Compute Account Overview metrics
  //
  const totalDepositsUSD = userDeposits.reduce((s, x) => s + x.valueUSD, 0);
  const totalBorrowsUSD = userBorrows.reduce((s, x) => s + x.valueUSD, 0);
  const equityUSD = totalDepositsUSD - totalBorrowsUSD;

  let borrowLimitUSD = 0,
    liqThresholdUSD = 0,
    weightedBorrowUSD = 0;

  userDeposits.forEach((d) => {
    const m = reserves.find((r) => r.symbol === d.symbol);
    if (m) {
      borrowLimitUSD += d.valueUSD * m.ltv;
      liqThresholdUSD += d.valueUSD * (m.ltv + 0.05);
    }
  });
  userBorrows.forEach((b) => {
    const m = reserves.find((r) => r.symbol === b.symbol);
    weightedBorrowUSD += b.valueUSD * (m?.borrowWeight ?? 1);
  });

  //
  // 4) Unified Deposit/Borrow/Repay/Withdraw handler
  //
  const handleOperation = async (
    op: "deposit" | "borrow" | "repay" | "withdraw"
  ) => {
    if (!suilendClient) return alert("SDK not ready");
    if (!rawOb.deposits.length && op !== "deposit")
      return alert("Please deposit first.");

    const asset = prompt("Asset symbol (e.g. SUI):");
    const amtStr = prompt("Amount:");
    if (!asset || !amtStr) return;
    const amount = parseFloat(amtStr);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

    try {
      const meta = coinMetadataMap[asset];
      if (!meta) throw new Error(`Unknown asset ${asset}`);
      const decimals = meta.decimals ?? 0;
      const baseAmount = BigInt(Math.floor(amount * 10 ** decimals));
      const tx = new Transaction();

      if (op === "deposit") {
        const existingCap = obligationOwnerCaps[0]?.id ?? null;
        const { obligationOwnerCapId, didCreate } =
          createObligationIfNoneExists(suilendClient, tx, existingCap);
        await suilendClient.depositIntoObligation(
          address,
          asset,
          baseAmount,
          tx,
          obligationOwnerCapId
        );
        if (didCreate) {
          await sendObligationToUser(obligationOwnerCapId, address, tx);
        }
      } else if (op === "borrow") {
        await suilendClient.borrowAndSendToUser(
          address,
          obligationOwnerCaps[0].id,
          obligations[0].id,
          asset,
          baseAmount,
          tx
        );
      } else if (op === "repay") {
        await suilendClient.repayIntoObligation(
          address,
          obligations[0].id,
          asset,
          baseAmount,
          tx
        );
      } else {
        await suilendClient.withdrawAndSendToUser(
          address,
          obligationOwnerCaps[0].id,
          obligations[0].id,
          asset,
          baseAmount,
          tx
        );
      }

      // Sign & execute
      await signAndExecuteTransactionBlock({ transactionBlock: tx });
      alert(`${op.charAt(0).toUpperCase() + op.slice(1)} successful!`);

      // Instant refresh
      const fresh = await fetchLendingData(address);
      setMarket(fresh.lendingMarket);
      setCoinMetadataMap(fresh.coinMetadataMap);
      setObligationOwnerCaps(fresh.obligationOwnerCaps);
      setObligations(fresh.obligations);
    } catch (e: any) {
      console.error(e);
      alert(`Operation failed: ${e.message || e}`);
    }
  };

  return (
    <div className="page lending-page">
      <AccountOverview
        equityUSD={equityUSD}
        totalDepositsUSD={totalDepositsUSD}
        totalBorrowsUSD={totalBorrowsUSD}
        netAPR={0} // you can compute this if needed
        weightedBorrowUSD={weightedBorrowUSD}
        borrowLimitUSD={borrowLimitUSD}
        liqThresholdUSD={liqThresholdUSD}
      />

      <DepositedAssets deposits={userDeposits} />

      <MarketTable
        reserves={reserves}
        totalDepositsUSD={reserves.reduce((s, r) => s + r.totalDepositsUSD, 0)}
        totalBorrowsUSD={reserves.reduce((s, r) => s + r.totalBorrowsUSD, 0)}
        totalValueLockedUSD={reserves.reduce(
          (s, r) => s + r.totalDepositsUSD - r.totalBorrowsUSD,
          0
        )}
      />

      {/* Debug / manual ops */}
      <div className="button-group" style={{ marginTop: "1rem" }}>
        <button onClick={() => handleOperation("deposit")}>Deposit</button>
        <button onClick={() => handleOperation("borrow")}>Borrow</button>
        <button onClick={() => handleOperation("repay")}>Repay</button>
        <button onClick={() => handleOperation("withdraw")}>Withdraw</button>
      </div>
    </div>
  );
};

export default LendingPage;
