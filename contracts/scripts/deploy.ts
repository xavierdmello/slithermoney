import { network } from "hardhat";

const { viem, networkName } = await network.connect();
const client = await viem.getPublicClient();

const snake = await viem.deployContract("Snake");

console.log("Snake address:", snake.address);

console.log("Waiting 10 seconds before verification...");
await new Promise(resolve => setTimeout(resolve, 10000));

// const tx = await snake.write.requestRandomNumber();

// console.log("Waiting for the snake.requestRandomNumber() tx to confirm");
// await client.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

await verifyContract(
  {
    address: snake.address,
    provider: "blockscout", // or "blockscout", or "sourcify"
  },
  hre,
);

