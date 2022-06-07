import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "@ethersproject/units";
import { NFT__factory } from "../typechain/factories/NFT__factory";
import { NFT } from "../typechain/NFT";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe('NFT contract', () => {
  let nft: NFT;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://bafkreib7rk44lfgqzt6jfvma4khx6sgag6edmp4d2avt67flk5wueqfjc4";

  beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const Nft = (await ethers.getContractFactory('NFT')) as NFT__factory;
    nft = await Nft.deploy(name, symbol, baseTokenURI);

    await nft.deployed();
  });

  describe('mints', () => {
    it('mints successfully', async () => {
      const addr1BalanceBefore = await nft.balanceOf(addr1.address);

      const tokenId = await nft.callStatic.mint(addr1.address);
      await nft.mint(addr1.address);

      const tokenCount = await nft.currentTokenId();

      const addr1BalanceAfter = await nft.balanceOf(addr1.address);

      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.add(tokenCount));
      expect(baseTokenURI + tokenId + ".json").to.equal(await nft.tokenURI(tokenId));
    })
  })

  describe('gets token URI', () => {
    it('gets token URI successfully', async () => {
      const tokenId = await nft.callStatic.mint(addr1.address);
      await nft.mint(addr1.address);

      expect(baseTokenURI + tokenId + ".json").to.equal(await nft.tokenURI(tokenId));
    })

    it('rejects nonexistent token', async () => {
      await expect(nft.tokenURI(parseUnits("1000", 18))).to.be.revertedWith('ERC721Metadata: URI query for nonexistent token');
    })
  })
});
