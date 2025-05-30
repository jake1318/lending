import React, { useEffect, useState, useCallback } from "react";
import scallopService from "../scallop/ScallopService";
import { useWallet } from "@suiet/wallet-kit";
import LendingActionModal from "../components/LendingActionModal";
import "../styles/LendingPage.scss";

// Exclude symbols with no price or unsupported
const EXCLUDED_SYMBOLS = ["BLUB", "FUD", "sbwBTC", "wAPT", "wETH", "wBTC"];

type ActionType = "deposit" | "withdraw" | "borrow" | "repay";

interface MarketRow {
  coinName: string;
  symbol: string;
  price: number | null | undefined;
  totalSupply: number | null | undefined;
  totalBorrow: number | null | undefined;
  utilization: number | null | undefined;
  supplyApy: number | null | undefined;
  userSupply?: number;
  userSupplyUsd?: number;
  totalSupplyUsd?: number;
  totalBorrowUsd?: number;
  decimals: number;
  coinType: string;
}

const LendingPage: React.FC = () => {
  const { connected, account } = useWallet();
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<ActionType | null>(null);
  const [modalAsset, setModalAsset] = useState<MarketRow | null>(null);

  // Fetch markets (same as before, but only on mount and when modal closes)
  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scallopService.fetchMarketAssets();
      setMarkets(
        data.filter(
          (row) => !EXCLUDED_SYMBOLS.includes(row.symbol)
        ) as MarketRow[]
      );
    } catch (err: any) {
      setError(err?.message || "Failed to fetch market data.");
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Modal handlers
  const openModal = (action: ActionType, asset: MarketRow) => {
    setModalOpen(true);
    setModalAction(action);
    setModalAsset(asset);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalAction(null);
    setModalAsset(null);
  };

  // Helper to print value or "--"
  const numOrDash = (val: number | null | undefined, opts?: any) =>
    typeof val === "number" && !isNaN(val)
      ? val.toLocaleString(undefined, opts)
      : "--";
  const percentOrDash = (val: number | null | undefined) =>
    typeof val === "number" && !isNaN(val) ? `${val.toFixed(2)}%` : "--";

  return (
    <div className="lending-page">
      <h2>Scallop Lending Markets</h2>
      {!connected && (
        <div className="connect-warning">
          Please connect your wallet to see your balances.
        </div>
      )}
      {loading && <div>Loading markets…</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <div className="markets-table">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Price (USD)</th>
                <th>Total Supply</th>
                <th>Total Borrow</th>
                <th>Utilization</th>
                <th>Supply APY</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(markets) && markets.length > 0 ? (
                markets.map((m) => (
                  <tr key={m.symbol}>
                    <td>{m.symbol}</td>
                    <td>${numOrDash(m.price, { maximumFractionDigits: 4 })}</td>
                    <td>
                      {numOrDash(m.totalSupply, { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      {numOrDash(m.totalBorrow, { maximumFractionDigits: 2 })}
                    </td>
                    <td>{percentOrDash(m.utilization)}</td>
                    <td>{percentOrDash(m.supplyApy)}</td>
                    <td>
                      <button
                        className="deposit-btn"
                        disabled={!connected}
                        onClick={() => openModal("deposit", m)}
                      >
                        Deposit
                      </button>
                      <button
                        className="withdraw-btn"
                        disabled={!connected}
                        onClick={() => openModal("withdraw", m)}
                      >
                        Withdraw
                      </button>
                      <button
                        className="borrow-btn"
                        disabled={!connected}
                        onClick={() => openModal("borrow", m)}
                      >
                        Borrow
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>No market data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal */}
      {modalOpen && modalAsset && modalAction && (
        <LendingActionModal
          open={modalOpen}
          onClose={closeModal}
          asset={modalAsset}
          action={modalAction}
          onSuccess={fetchMarkets}
        />
      )}
    </div>
  );
};

export default LendingPage;
