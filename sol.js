
  import {
    createPublicClient,
    createWalletClient,
    http,
    custom,
    parseEther,
    formatEther,
  } from "https://esm.sh/viem";

  import { sepolia } from "https://esm.sh/viem/chains";
  import { abi, contractAddress } from "./constants-js.js";

  /* ---------- DOM Elements ---------- */
  const connectButton       =  document.getElementById("connectButton");
  const balanceButton       =  document.getElementById("balanceButton");
  const addLiquidityButton  =  document.getElementById("addLiquidityButton");
  const removeLiquidityButton = document.getElementById("removeLiquidityButton");
  const poolInfoButton      =  document.getElementById("getPoolInfoButton");
  const rebalances           = document.getElementById("rebalanceButton")
  const earnFeesButton     =   document.getElementById("earnFeesButton");
  const collectFeesButton  =   document.getElementById("collectFeesButton");
  const feesOutput         =   document.getElementById("feesOutput");
  const showMyPosition    =    document.getElementById("showMyPosition");
  const tokenASelect   =      document.getElementById("tokenASelect");
  const tokenAAmount   = document.getElementById("tokenAAmount");
  const tokenBAmount   = document.getElementById("tokenBAmount");
  const lpAmountInput  = document.getElementById("lpAmount");
  const poolInfoOutput = document.getElementById("poolInfoOutput");

  /* ---------- Clients & Globals ---------- */
  const publicClient = createPublicClient({ chain: sepolia, transport: http() });
  let  walletClient;
  let  account;            // connected wallet address

  /* ---------- Connect Wallet ---------- */
  async function connect() {
    if (!window.ethereum) return alert("Install MetaMask.");

    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== "0xaa36a7") {                // 0xaa36a7 = 11155111 in hex
      return alert("Switch MetaMask network to Sepolia and retry.");
    }

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];

    walletClient = createWalletClient({
      chain: sepolia,
      transport: custom(window.ethereum),
    });

    connectButton.textContent = `Connected: ${account.slice(0,6)}…${account.slice(-4)}`;
    connectButton.disabled = true;
  }

  /* ---------- Balance ---------- */
  async function getBalance() {
    if (!account) return alert("Connect your wallet first.");
    const bal = await publicClient.getBalance({ address: account });
    alert(`Balance: ${formatEther(bal)} ETH`);
  }

  /* ---------- Add Liquidity ---------- */

  async function addLiquidity() {
  if (!walletClient) return alert("Connect first.");
  const ethVal = parseEther(tokenAAmount.value);
  const lower  = BigInt(Number(document.getElementById("lower").value) * 1e8);
  const upper  = BigInt(Number(document.getElementById("upper").value) * 1e8);
  if (ethVal === 0n) return alert("Enter ETH.");

  const txHash = await walletClient.writeContract({
    account,
    address: contractAddress,
    abi,
    functionName: "addLiquidity",
    args: [lower, upper],
    value: ethVal,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
}

  
// earn feees

/* ---------- Collect Fees ---------- */
async function collectFees() {
  if (!walletClient) return alert("Connect your wallet first.");

  try {
    collectFeesButton.disabled = true;

    const txHash = await walletClient.writeContract({
      account,
      address: contractAddress,
      abi,
      functionName: "collectFees",
      args: [],
    });

    alert("Collecting…");
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    alert("Fees collected!");
    feesOutput.textContent = "";           // clear after collection
  } catch (err) {
    alert("Collect fees failed: " + (err.shortMessage || err.message));
    console.error(err);
  } finally {
    collectFeesButton.disabled = false;
  }
}

// rebalance
async function rebalance() {
  const newLower = BigInt(prompt("new lower (USD×1e8)"));
  const newUpper = BigInt(prompt("new upper (USD×1e8)"));
  const txHash = await walletClient.writeContract({
    account:account,
    address: contractAddress,
    abi,
    functionName: "rebalanceGlobal",
    args: [newLower, newUpper],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
}
document.getElementById("rebalanceButton").addEventListener("click", rebalance);

  /* ---------- Remove Liquidity ---------- */
  async function removeLiquidity() {
    if (!walletClient) return alert("Connect your wallet first.");
    if (!lpAmountInput.value) return alert("Enter LP amount.");

    try {
      removeLiquidityButton.disabled = true;

      const lpAmt = parseEther(lpAmountInput.value);
      const txHash = await walletClient.writeContract({
        account,
        address: contractAddress,
        abi,
        functionName: "removeLiquidity",
        args: [lpAmt],
      });

      alert("Tx sent. Waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      alert("Liquidity removed!");
    } catch (err) {
      alert("Remove‑liquidity failed: " + (err.shortMessage || err.message));
      console.error(err);
    } finally {
      removeLiquidityButton.disabled = false;
    }
  }

  // show erned fees

  async function showEarnedFees() {
  if (!account) return alert("Connect your wallet first.");

  try {
    earnFeesButton.disabled = true;

    const fees = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "getEarned",
      args: [account],
    });

    feesOutput.textContent = `Uncollected Fees: ${formatEther(fees)} ETH`;
  } catch (err) {
    alert("Fee fetch failed: " + err.message);
    console.error(err);
  } finally {
    earnFeesButton.disabled = false;
  }
}

// pool info

async function showPoolInfo() {
  try {
    poolInfoButton.disabled = true;

    const [reserve, totalLp] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "ethReserve",   // public state variable
      }),
      publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "totalSupply",  // inherited from ERC-20
      }),
    ]);

    poolInfoOutput.textContent =
      `ETH reserve : ${formatEther(reserve)}\n` +
      `Total LP     : ${formatEther(totalLp)}`;
  } catch (err) {
    alert("Fetch pool info failed: " + err.message);
  } finally {
    poolInfoButton.disabled = false;
  }
}




  /* ---------- Event Listeners ---------- */
  connectButton.addEventListener("click",  connect);
  balanceButton.addEventListener("click",  getBalance);
  addLiquidityButton.addEventListener("click", addLiquidity);
  removeLiquidityButton.addEventListener("click", removeLiquidity);
  poolInfoButton.addEventListener("click", showPoolInfo);
  earnFeesButton.addEventListener("click",showEarnedFees) 
  collectFeesButton.addEventListener("click",collectFees)
  rebalances.addEventListener("click", rebalance)
  
  

