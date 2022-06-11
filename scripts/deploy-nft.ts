import hre, { ethers } from "hardhat";
import { NFT__factory } from "../typechain/factories/NFT__factory";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function main() {
  const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

  let fundingWallet: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://bafybeibxrjv7ilwumzeajtqm7ufirmoyy4wfpwzxc2skfk3p4klnpwh3ae";
  const deadline = Math.round((new Date().getTime() + 6000) / 1000);

  [fundingWallet, ...addrs] = await ethers.getSigners();

  const NFT = (await ethers.getContractFactory('NFT')) as NFT__factory;
  const nft = await NFT.deploy(name, symbol, baseTokenURI, fundingWallet.address, deadline, []);

  await nft.deployed();

  console.log("NFT deployed to:", nft.address);

  await delay(35000);

  await hre.run("verify:verify", {
    address: nft.address,
    constructorArguments: [name, symbol, baseTokenURI, fundingWallet.address, deadline, []],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
