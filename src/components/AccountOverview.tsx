// src/components/AccountOverview.tsx

import React, { useState } from "react";
import "../styles/AccountOverview.scss";

interface AccountOverviewProps {
  equityUSD: number;
  totalDepositsUSD: number;
  totalBorrowsUSD: number;
  netAPR: number;
  weightedBorrowUSD: number;
  borrowLimitUSD: number;
  liqThresholdUSD: number;
}

const AccountOverview: React.FC<AccountOverviewProps> = ({
  equityUSD,
  totalDepositsUSD,
  totalBorrowsUSD,
  netAPR,
  weightedBorrowUSD,
  borrowLimitUSD,
  liqThresholdUSD,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const toggleBreakdown = () => setShowBreakdown((prev) => !prev);

  return (
    <div className="account-overview card">
      <div className="card-header">
        <h2>Account</h2>
      </div>

      <div className="summary-line">
        <div>
          Equity <span className="value">${equityUSD.toFixed(2)}</span>
        </div>
        <div className="separator">=</div>
        <div>
          Deposits <span className="value">${totalDepositsUSD.toFixed(2)}</span>
        </div>
        <div className="separator">-</div>
        <div>
          Borrows <span className="value">${totalBorrowsUSD.toFixed(2)}</span>
        </div>
        <div className="net-apr">
          Net APR <span className="value">{netAPR.toFixed(2)}%</span>
        </div>
      </div>

      <div className="limits-line">
        <div>
          <span className="label">Weighted borrows</span>{" "}
          <span className="value">${weightedBorrowUSD.toFixed(2)}</span>
        </div>
        <div>
          <span className="label">Borrow limit</span>{" "}
          <span className="value">${borrowLimitUSD.toFixed(2)}</span>
        </div>
        <div>
          <span className="label">Liq. threshold</span>{" "}
          <span className="value">${liqThresholdUSD.toFixed(2)}</span>
        </div>
      </div>

      <div className="health-bar">
        <div className="bar-bg">
          <div
            className="bar-fill"
            style={{ width: `${(weightedBorrowUSD / liqThresholdUSD) * 100}%` }}
          ></div>
          <div
            className="bar-marker borrow-limit-marker"
            style={{ left: `${(borrowLimitUSD / liqThresholdUSD) * 100}%` }}
            title="Borrow Limit"
          ></div>
          <div
            className="bar-marker liq-threshold-marker"
            style={{ left: "100%" }}
            title="Liquidation Threshold"
          ></div>
        </div>
      </div>

      <div className="breakdown-toggle" onClick={toggleBreakdown}>
        {showBreakdown ? "Hide Breakdown ▲" : "Show Breakdown ▼"}
      </div>

      {showBreakdown && (
        <div className="breakdown-details">
          {/* Detailed breakdown content here */}
          <p>Here would be the detailed breakdown of your positions.</p>
        </div>
      )}
    </div>
  );
};

export default AccountOverview;
