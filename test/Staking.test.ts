import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "@ethersproject/units";
import { NFT__factory } from "../typechain/factories/NFT__factory";
import { NFT } from "../typechain/NFT";
import { GoldenNugget__factory } from "../typechain/factories/GoldenNugget__factory";
import { GoldenNugget } from "../typechain/GoldenNugget";
import { Staking__factory } from "../typechain/factories/Staking__factory";
import { Staking } from "../typechain/Staking";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function incrementNextBlockTimestamp(amount: number): Promise<void> {
  return ethers.provider.send("evm_increaseTime", [amount]);
}

async function getBlockTimestamp(tx: any): Promise<number> {
  const minedTx = await tx.wait();
  const txBlock = await ethers.provider.getBlock(minedTx.blockNumber);
  return txBlock.timestamp;
}

describe('Staking contract', () => {
  let nft: NFT;
  let goldenNugget: GoldenNugget;
  let staking: Staking;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let fundingWallet: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://QmPShXrfttmnNtE9V6QmcrR8F29V7HMuMrsRyQyUXs35id/";
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const percentageThreshold = 1;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, fundingWallet, ...addrs] = await ethers.getSigners();

    const GoldenNugget = (await ethers.getContractFactory('GoldenNugget')) as GoldenNugget__factory;
    goldenNugget = await GoldenNugget.deploy(addr1.address);
    await goldenNugget.deployed();

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const deadline = blockBefore.timestamp + 86400;

    const Nft = (await ethers.getContractFactory('NFT')) as NFT__factory;
    nft = await Nft.deploy(name, symbol, baseTokenURI, fundingWallet.address, deadline, [addr3.address]);
    await nft.deployed();

    const Staking = (await ethers.getContractFactory('Staking')) as Staking__factory;
    staking = await Staking.deploy(goldenNugget.address);
    await staking.deployed();
  });

  describe('transfers', () => {
    const tokenId = 101;

    beforeEach(async () => {
      const price = await nft.priceFor(owner.address);

      for (let i = 1; i < tokenId; i++) {
        await nft.buy(i, { value: price });
      }
    });

    it('transfers successfully', async () => {
      await staking.addNFT(nft.address, percentageThreshold);

      const price = await nft.priceFor(owner.address);
      await nft.buy(tokenId, { value: price });

      const tx = await nft["safeTransferFrom(address,address,uint256)"](owner.address, staking.address, tokenId);

      const txTimestamp = await getBlockTimestamp(tx);

      const depositInfo = await staking.depositInfo(nft.address, tokenId);

      expect(depositInfo.ownerNft).to.equal(owner.address);
      expect(depositInfo.startDate).to.equal(txTimestamp);

      await expect(tx).to.emit(staking, "ERC721Received")
        .withArgs(tokenId, nft.address, owner.address);
    })

    it('rejects transfering when nft is not received', async () => {
      await expect(staking.onERC721Received(addr2.address, addr1.address, tokenId, "0x")).to.be.reverted;
    })

    it('rejects transfering when staking not started', async () => {
      await expect(nft["safeTransferFrom(address,address,uint256)"](owner.address, staking.address, 100)).to.be.revertedWith('Staking: not started');
    })
  })

  describe('adds NFT', () => {
    it('adds NFT while percentage threshold not reached', async () => {
      const tx = await staking.addNFT(nft.address, percentageThreshold);

      const txTimestamp = await getBlockTimestamp(tx);

      const nftInfo = await staking.nftInfo(nft.address);

      expect(nftInfo.percentageThreshold).to.equal(percentageThreshold);
      expect(nftInfo.status).to.equal(2);

      await expect(tx).to.emit(staking, "NftAdded")
        .withArgs(nft.address, txTimestamp);
    })

    it('adds NFT while percentage threshold reached', async () => {
      const price = await nft.priceFor(owner.address);

      for (let i = 1; i < 102; i++) {
        await nft.buy(i, { value: price });
      }

      const tx = await staking.addNFT(nft.address, percentageThreshold);
      const txTimestamp = await getBlockTimestamp(tx);
      const nftInfo = await staking.nftInfo(nft.address);

      expect(nftInfo.percentageThreshold).to.equal(percentageThreshold);
      expect(nftInfo.status).to.equal(1);

      await expect(tx).to.emit(staking, "NftAdded")
        .withArgs(nft.address, txTimestamp);
    })

    it('rejects adding NFT while zero address', async () => {
      await expect(staking.addNFT(zeroAddress, percentageThreshold)).to.be.revertedWith('Staking: zero address');
    })
  })

  describe('withdraws a nft', () => {
    const tokenId = 1;

    beforeEach(async () => {
      const price = await nft.priceFor(addr1.address);

      for (let i = 1; i < 102; i++) {
        await nft.connect(addr1).buy(i, { value: price });
      }

      await staking.addNFT(nft.address, percentageThreshold);

      await nft.connect(addr1).approve(staking.address, tokenId);
      await nft.connect(addr1)["safeTransferFrom(address,address,uint256)"](addr1.address, staking.address, tokenId);

      await incrementNextBlockTimestamp(259200);
      await ethers.provider.send("evm_mine", []);

      await goldenNugget.grantRole(await goldenNugget.MINTER_ROLE(), staking.address);
    });

    it('withdraws NFT successfully', async () => {
      const ownerNftBefore = await nft.ownerOf(tokenId);

      const tx = staking.connect(addr1).withdrawNft(tokenId, nft.address);

      const ownerNftAfter = await nft.connect(addr1).ownerOf(tokenId);

      expect(true).to.equal(ownerNftBefore == staking.address);
      expect(true).to.equal(ownerNftAfter == addr1.address);

      await expect(tx).to.emit(staking, 'Withdraw')
        .withArgs(tokenId, nft.address, addr1.address);
    })

    it('rejects withdrawing a nft when it is not owner', async () => {
      await expect(staking.connect(addr2).withdrawNft(tokenId, nft.address)).to.be.revertedWith("Staking: not owner NFT");
    })
  })

  describe('checks is active', () => {
    it('while nft not added', async () => {
      expect(false).to.equal(await staking.isActive(nft.address));
    })

    it('while staking not started', async () => {
      const price = await nft.priceFor(addr1.address);
      await nft.connect(addr1).buy(1, { value: price });
      await staking.addNFT(nft.address, percentageThreshold);

      expect(false).to.equal(await staking.isActive(nft.address));
    })

    it('while staking started some time before', async () => {
      const price = await nft.priceFor(owner.address);

      for (let i = 1; i < 102; i++) {
        await nft.buy(i, { value: price });
      }

      await staking.addNFT(nft.address, percentageThreshold);

      expect(true).to.equal(await staking.isActive(nft.address));
    })

    it('while staking has just started', async () => {
      const price = await nft.priceFor(owner.address);

      await staking.addNFT(nft.address, percentageThreshold);

      for (let i = 1; i < 102; i++) {
        await nft.buy(i, { value: price });
      }

      expect(true).to.equal(await staking.isActive(nft.address));
    })
  })
});
