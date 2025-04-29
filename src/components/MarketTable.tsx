import React from "react";
import "../styles/MarketTable.scss";

interface Reserve {
  symbol: string;
  priceUSD: number;
  totalDeposits: number;
  totalDepositsUSD: number;
  totalBorrows: number;
  totalBorrowsUSD: number;
  ltv: number;
  borrowWeight: number;
  depositApr: number;
  depositRewardApr?: number;
  borrowApr: number;
  borrowRewardApr?: number;
}

interface Props {
  reserves: Reserve[];
  totalDepositsUSD: number;
  totalBorrowsUSD: number;
  totalValueLockedUSD: number;
}

const MarketTable: React.FC<Props> = ({
  reserves,
  totalDepositsUSD,
  totalBorrowsUSD,
  totalValueLockedUSD,
}) => (
  <div className="market-table card">
    <div className="card-header">
      <h2>Main Market</h2>
    </div>
    <div className="market-summary">
      <div>
        Deposits <span>${(totalDepositsUSD / 1e6).toFixed(1)}M</span>
      </div>
      <div>
        Borrows <span>${(totalBorrowsUSD / 1e6).toFixed(1)}M</span>
      </div>
      <div>
        TVL <span>${(totalValueLockedUSD / 1e6).toFixed(1)}M</span>
      </div>
    </div>
    <table className="reserves-table">
      <thead>
        <tr>
          <th>Asset name</th>
          <th>Deposits</th>
          <th>Borrows</th>
          <th>LTV / BW</th>
          <th>Deposit APR</th>
          <th>Borrow APR</th>
        </tr>
      </thead>
      <tbody>
        {reserves.map((r) => {
          const fmt = (v: number) =>
            v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v.toFixed(2);
          return (
            <tr key={r.symbol}>
              <td>
                <div className="asset-name">
                  <span
                    className={`asset-icon icon-${r.symbol.toLowerCase()}`}
                  ></span>
                  {r.symbol}
                </div>
                <div className="asset-price">${r.priceUSD.toFixed(2)}</div>
              </td>
              <td>
                <div>
                  {fmt(r.totalDeposits)} {r.symbol}
                </div>
                <div className="subtext">${fmt(r.totalDepositsUSD)}</div>
              </td>
              <td>
                {r.totalBorrows > 0 ? (
                  <>
                    <div>
                      {fmt(r.totalBorrows)} {r.symbol}
                    </div>
                    <div className="subtext">${fmt(r.totalBorrowsUSD)}</div>
                  </>
                ) : (
                  <span className="subtext">--</span>
                )}
              </td>
              <td>
                {(r.ltv * 100).toFixed(0)}% /{" "}
                {r.borrowWeight === Infinity ? "∞" : r.borrowWeight}
              </td>
              <td>
                {r.depositApr.toFixed(2)}%
                {r.depositRewardApr
                  ? ` [+${r.depositRewardApr.toFixed(2)}%]`
                  : null}
              </td>
              <td>
                {r.borrowApr.toFixed(2)}%
                {r.borrowRewardApr
                  ? ` [${r.borrowRewardApr.toFixed(2)}%]`
                  : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default MarketTable;
