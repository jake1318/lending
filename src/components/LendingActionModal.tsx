import React, { useState, useEffect } from "react";
import scallopService from "../scallop/ScallopService";
import { useWallet } from "@suiet/wallet-kit";
import {
  getAccountCoins,
  getCoinBalance,
} from "../services/blockvisionService";
import { makeSuietScallopAdapter } from "../utils/scallopWalletAdapter";
import "../styles/LendingActionModal.scss";

type ActionType = "deposit" | "withdraw" | "borrow" | "repay";

interface AssetInfo {
  symbol: string;
  coinType: string;
  decimals: number;
  price: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  asset: AssetInfo;
  action: ActionType;
  onSuccess?: () => void;
}

const ACTION_LABELS: Record<ActionType, string> = {
  deposit: "Deposit",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
};

const LendingActionModal: React.FC<Props> = ({
  open,
  onClose,
  asset,
  action,
  onSuccess,
}) => {
  const { connected, account, signAndExecuteTransactionBlock } = useWallet();
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Wallet balance
  const [userBalance, setUserBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (
      !open ||
      !connected ||
      !account?.address ||
      !asset?.coinType ||
      asset?.decimals == null
    ) {
      setUserBalance(0);
      return;
    }
    setBalanceLoading(true);
    getAccountCoins(account.address)
      .then((coins) => {
        setUserBalance(getCoinBalance(coins, asset.coinType, asset.decimals));
      })
      .catch(() => {
        setUserBalance(0);
      })
      .finally(() => setBalanceLoading(false));
  }, [open, connected, account?.address, asset?.coinType, asset?.decimals]);

  if (!open) return null;

  const handleAction = async () => {
    setStatus(null);
    setLoading(true);
    try {
      if (!connected || !account?.address || !signAndExecuteTransactionBlock) {
        setStatus("Please connect your wallet.");
        setLoading(false);
        return;
      }
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setStatus("Enter a valid amount.");
        setLoading(false);
        return;
      }
      // For deposit, check balance
      if (action === "deposit" && parsedAmount > userBalance) {
        setStatus(
          `Insufficient balance. Max: ${userBalance.toLocaleString(undefined, {
            maximumFractionDigits: 6,
          })} ${asset.symbol}`
        );
        setLoading(false);
        return;
      }

      // ---- KEY: Use minimal wallet adapter for Scallop ----
      const scallopWalletAdapter = makeSuietScallopAdapter(
        signAndExecuteTransactionBlock,
        account.address
      );

      let txResult;
      switch (action) {
        case "deposit":
          txResult = await scallopService.supply(
            scallopWalletAdapter,
            asset.coinType,
            parsedAmount,
            asset.decimals
          );
          break;
        case "withdraw":
          txResult = await scallopService.withdraw(
            scallopWalletAdapter,
            asset.coinType,
            parsedAmount,
            asset.decimals
          );
          break;
        case "borrow":
          txResult = await scallopService.borrow(
            scallopWalletAdapter,
            asset.coinType,
            parsedAmount,
            asset.decimals
          );
          break;
        case "repay":
          txResult = await scallopService.repay(
            scallopWalletAdapter,
            asset.coinType,
            parsedAmount,
            asset.decimals
          );
          break;
        default:
          throw new Error("Unsupported action");
      }
      if (txResult?.success) {
        setStatus("Transaction submitted successfully.");
        if (onSuccess) onSuccess();
      } else {
        setStatus("Transaction failed.");
      }
    } catch (err: any) {
      setStatus(err?.message || "Transaction failed.");
    }
    setLoading(false);
  };

  return (
    <div className="lending-modal-backdrop" onClick={onClose}>
      <div className="lending-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
        <h3>
          {ACTION_LABELS[action]} {asset.symbol}
        </h3>
        {/* Show wallet balance for Deposit */}
        {action === "deposit" && (
          <div className="wallet-balance">
            {balanceLoading ? (
              "Loading wallet balance..."
            ) : (
              <>
                Wallet Balance:{" "}
                <b>
                  {userBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}{" "}
                  {asset.symbol}
                </b>
              </>
            )}
          </div>
        )}
        <div className="input-group">
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount (${asset.symbol})`}
            disabled={loading}
            autoFocus
          />
          {/* "Max" button for deposit */}
          {action === "deposit" && (
            <button
              type="button"
              className="max-btn"
              style={{ marginLeft: 8 }}
              disabled={loading || balanceLoading || userBalance === 0}
              onClick={() =>
                setAmount(userBalance > 0 ? userBalance.toString() : "")
              }
            >
              Max
            </button>
          )}
        </div>
        <div className="modal-actions">
          <button
            className="action-btn"
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? "Processing..." : ACTION_LABELS[action]}
          </button>
        </div>
        {status && <div className="modal-status">{status}</div>}
      </div>
    </div>
  );
};

export default LendingActionModal;
