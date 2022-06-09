import hre, { ethers } from "hardhat";
import { NFT__factory } from "../typechain/factories/NFT__factory";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function main() {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://bafkreib7rk44lfgqzt6jfvma4khx6sgag6edmp4d2avt67flk5wueqfjc4";

  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  const NFT = (await ethers.getContractFactory('NFT')) as NFT__factory;
  const nft = await NFT.deploy(name, symbol, baseTokenURI, []);

  await nft.deployed();

  console.log("NFT deployed to:", nft.address);

  let users = [];

  for (let i = 0; i <= 256; i++) {
    console.log("Count users:", i);

    if (i >= 1) {
      users.push(ethers.Wallet.createRandom().address);
    }

    console.log("Adding");
    let tx = await nft.addWhitelists(users)
    let minedTx = await tx.wait();
    console.log("NFT gasUsed:", minedTx.gasUsed);

    console.log("Removing");
    tx = await nft.removeWhitelists(users)
    minedTx = await tx.wait();
    console.log("NFT gasUsed:", minedTx.gasUsed);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
