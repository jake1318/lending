const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();
app.use(cors());

app.use(
  "/sui",
  createProxyMiddleware({
    target: "https://fullnode.mainnet.sui.io",
    changeOrigin: true,
    pathRewrite: { "^/sui": "" },
  })
);

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}/sui`);
});
