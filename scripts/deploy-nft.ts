import hre, { ethers } from "hardhat";
import { NFT } from "../typechain/NFT";
import { NFT__factory } from "../typechain/factories/NFT__factory";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function main() {
  const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

  let nft: NFT;
  let fundingWallet: SignerWithAddress;
  let addrs: SignerWithAddress[];

  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://QmSeARZo5Q4zEUTjJcHsBHdg9CfpniTdyWks24hMA4Qqrv/";

  [fundingWallet, ...addrs] = await ethers.getSigners();

  const Nft = (await ethers.getContractFactory('NFT')) as NFT__factory;
  nft = await Nft.deploy(name, symbol, baseTokenURI, fundingWallet.address);
  await nft.deployed();

  console.log("NFT deployed to:", nft.address);

  await delay(35000);

  await hre.run("verify:verify", {
    address: nft.address,
    constructorArguments: [name, symbol, baseTokenURI, fundingWallet.address],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
