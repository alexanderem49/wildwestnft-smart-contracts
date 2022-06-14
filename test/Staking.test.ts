import { expect } from "chai";
import { ethers } from "hardhat";
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

    it('transfers without claim successfully', async () => {
      await staking.addNFT(nft.address, percentageThreshold);

      const price = await nft.priceFor(owner.address);
      await nft.buy(tokenId, { value: price });
      await goldenNugget.grantRole(await goldenNugget.MINTER_ROLE(), staking.address);

      const ownerNftBefore = await nft.ownerOf(tokenId);
      const ownerGNBalanceBefore = await goldenNugget.balanceOf(owner.address);
      const stakeInfoBefore = await staking.stakeInfo(owner.address);

      const tx = await nft["safeTransferFrom(address,address,uint256)"](owner.address, staking.address, tokenId);

      const txTimestamp = await getBlockTimestamp(tx);
      const ownerNftAfter = await nft.ownerOf(tokenId);
      const ownerGNBalanceAfter = await goldenNugget.balanceOf(owner.address);
      const stakeInfoAfter = await staking.stakeInfo(owner.address);
      const tokenOwner = await staking.tokenOwner(nft.address, tokenId);

      expect(stakeInfoAfter.tokenCount).to.equal(stakeInfoBefore.tokenCount.add(1));
      expect(stakeInfoAfter.startDate).to.equal(txTimestamp);
      expect(ownerGNBalanceAfter).to.equal(ownerGNBalanceBefore);
      expect(tokenOwner).to.equal(owner.address);
      expect(true).to.equal(ownerNftBefore == owner.address);
      expect(true).to.equal(ownerNftAfter == staking.address);

      await expect(tx).to.emit(staking, "ERC721Received")
        .withArgs(tokenId, nft.address, owner.address)
        .and.to.not.emit(goldenNugget, "Transfer")
        .and.to.not.emit(staking, "Claim");
    })

    it('transfers with claim successfully', async () => {
      await staking.addNFT(nft.address, percentageThreshold);

      const price = await nft.priceFor(owner.address);
      await nft.buy(tokenId, { value: price });
      await goldenNugget.grantRole(await goldenNugget.MINTER_ROLE(), staking.address);
      await nft["safeTransferFrom(address,address,uint256)"](owner.address, staking.address, 100);

      const ownerNftBefore = await nft.ownerOf(tokenId);
      const ownerGNBalanceBefore = await goldenNugget.balanceOf(owner.address);
      const stakeInfoBefore = await staking.stakeInfo(owner.address);

      const tx = await nft["safeTransferFrom(address,address,uint256)"](owner.address, staking.address, tokenId);

      const txTimestamp = await getBlockTimestamp(tx);
      const payoutAmount = (ethers.BigNumber.from(txTimestamp).sub(stakeInfoBefore.startDate)).mul(1653439153935);

      const ownerNftAfter = await nft.ownerOf(tokenId);
      const ownerGNBalanceAfter = await goldenNugget.balanceOf(owner.address);
      const stakeInfoAfter = await staking.stakeInfo(owner.address);
      const tokenOwner = await staking.tokenOwner(nft.address, tokenId);

      expect(stakeInfoAfter.tokenCount).to.equal(stakeInfoBefore.tokenCount.add(1));
      expect(stakeInfoAfter.startDate).to.equal(txTimestamp);
      expect(tokenOwner).to.equal(owner.address);
      expect(ownerGNBalanceAfter).to.equal(ownerGNBalanceBefore.add(payoutAmount));
      expect(true).to.equal(ownerNftBefore == owner.address);
      expect(true).to.equal(ownerNftAfter == staking.address);

      await expect(tx).to.emit(staking, "ERC721Received")
        .withArgs(tokenId, nft.address, owner.address)
        .and.to.emit(goldenNugget, "Transfer")
        .withArgs(zeroAddress, owner.address, payoutAmount)
        .and.to.emit(staking, "Claim")
        .withArgs(owner.address, payoutAmount);
    })

    it('rejects transfering when nft is not received', async () => {
      await expect(staking.onERC721Received(addr2.address, addr1.address, tokenId, "0x")).to.be.reverted;
    })

    it('rejects transfering when nft added, but not started', async () => {
      await staking.addNFT(nft.address, percentageThreshold);

      await expect(nft["safeTransferFrom(address,address,uint256)"](owner.address, staking.address, 100)).to.be.revertedWith('Staking: not started');
    })

    it('rejects transfering rejects transfering when nft not added', async () => {
      await expect(nft["safeTransferFrom(address,address,uint256)"](owner.address, staking.address, 100)).to.be.revertedWith('Staking: not started');
    })
  })

  describe('adds NFT', () => {
    it('adds NFT while percentage threshold not reached', async () => {
      const tx = await staking.addNFT(nft.address, percentageThreshold);

      const nftInfo = await staking.nftInfo(nft.address);

      expect(nftInfo.percentageThreshold).to.equal(percentageThreshold);
      expect(nftInfo.status).to.equal(2);

      await expect(tx).to.emit(staking, "NftAdded")
        .withArgs(nft.address);
    })

    it('adds NFT while percentage threshold reached', async () => {
      const price = await nft.priceFor(owner.address);

      for (let i = 1; i < 102; i++) {
        await nft.buy(i, { value: price });
      }

      const tx = await staking.addNFT(nft.address, percentageThreshold);

      const nftInfo = await staking.nftInfo(nft.address);

      expect(nftInfo.percentageThreshold).to.equal(percentageThreshold);
      expect(nftInfo.status).to.equal(1);

      await expect(tx).to.emit(staking, "NftAdded")
        .withArgs(nft.address);
    })

    it('rejects adding NFT while NFT already added', async () => {
      await staking.addNFT(nft.address, percentageThreshold);

      await expect(staking.addNFT(nft.address, percentageThreshold)).to.be.revertedWith('Staking: already added');
    })

    it('rejects adding NFT while zero address', async () => {
      await expect(staking.addNFT(zeroAddress, percentageThreshold)).to.be.revertedWith('Staking: zero address');
    })
  })

  describe('claims', () => {
    const tokenId = 1;

    it('claims without rewards successfully', async () => {
      const ownerGNBalanceBefore = await goldenNugget.balanceOf(owner.address);
      const stakeInfoBefore = await staking.stakeInfo(owner.address);
      await goldenNugget.grantRole(await goldenNugget.MINTER_ROLE(), staking.address);

      const tx = await staking.claim(owner.address);

      const ownerGNBalanceAfter = await goldenNugget.balanceOf(owner.address);
      const stakeInfoAfter = await staking.stakeInfo(owner.address);

      expect(ownerGNBalanceAfter).to.equal(ownerGNBalanceBefore);
      expect(stakeInfoBefore.startDate).to.equal(stakeInfoAfter.startDate);

      await expect(tx).to.not.emit(goldenNugget, "Transfer")
        .and.to.not.emit(staking, "Claim");
    })

    it('claims with rewards successfully', async () => {
      const price = await nft.priceFor(owner.address);

      for (let i = 1; i < 102; i++) {
        await nft.buy(i, { value: price });
      }

      await staking.addNFT(nft.address, percentageThreshold);
      await nft["safeTransferFrom(address,address,uint256)"](owner.address, staking.address, tokenId);
      await goldenNugget.grantRole(await goldenNugget.MINTER_ROLE(), staking.address);

      await incrementNextBlockTimestamp(259200);
      await ethers.provider.send("evm_mine", []);

      const ownerGNBalanceBefore = await goldenNugget.balanceOf(owner.address);
      const stakeInfoBefore = await staking.stakeInfo(owner.address);

      const tx = await staking.claim(owner.address);

      const txTimestamp = await getBlockTimestamp(tx);
      const payoutAmount = (ethers.BigNumber.from(txTimestamp).sub(stakeInfoBefore.startDate)).mul(1653439153935);

      const stakeInfoAfter = await staking.stakeInfo(owner.address);
      const ownerGNBalanceAfter = await goldenNugget.balanceOf(owner.address);

      expect(ownerGNBalanceAfter).to.equal(ownerGNBalanceBefore.add(payoutAmount));
      expect(stakeInfoAfter.startDate).to.equal(txTimestamp);

      await expect(tx).to.emit(goldenNugget, "Transfer")
        .withArgs(zeroAddress, owner.address, payoutAmount)
        .and.to.emit(staking, "Claim")
        .withArgs(owner.address, payoutAmount);
    })
  })

  describe('withdraws NFT', () => {
    const tokenId = 1;

    beforeEach(async () => {
      const price = await nft.priceFor(addr1.address);

      for (let i = 1; i < 102; i++) {
        await nft.connect(addr1).buy(i, { value: price });
      }

      await staking.addNFT(nft.address, percentageThreshold);
      await nft.connect(addr1).approve(staking.address, tokenId);
      await nft.connect(addr1)["safeTransferFrom(address,address,uint256)"](addr1.address, staking.address, tokenId);
      await goldenNugget.grantRole(await goldenNugget.MINTER_ROLE(), staking.address);

      await incrementNextBlockTimestamp(259200);
      await ethers.provider.send("evm_mine", []);
    });

    it('withdraws NFT successfully', async () => {
      const ownerNftBefore = await nft.ownerOf(tokenId);
      const ownerGNBalanceBefore = await goldenNugget.balanceOf(addr1.address);
      const stakeInfoBefore = await staking.stakeInfo(addr1.address);

      const tx = await staking.connect(addr1).withdrawNft(tokenId, nft.address);

      const txTimestamp = await getBlockTimestamp(tx);
      const payoutAmount = (ethers.BigNumber.from(txTimestamp).sub(stakeInfoBefore.startDate)).mul(1653439153935);

      const ownerGNBalanceAfter = await goldenNugget.balanceOf(addr1.address);
      const stakeInfoAfter = await staking.stakeInfo(addr1.address);
      const ownerNftAfter = await nft.connect(addr1).ownerOf(tokenId);
      const tokenOwner = await staking.tokenOwner(nft.address, tokenId);

      expect(ownerGNBalanceAfter).to.equal(ownerGNBalanceBefore.add(payoutAmount));
      expect(stakeInfoAfter.startDate).to.equal(txTimestamp);
      expect(true).to.equal(ownerNftBefore == staking.address);
      expect(true).to.equal(ownerNftAfter == addr1.address);
      expect(tokenOwner).to.equal(zeroAddress);

      await expect(tx).to.emit(staking, 'Withdraw')
        .withArgs(tokenId, nft.address, addr1.address)
        .and.to.emit(goldenNugget, "Transfer")
        .withArgs(zeroAddress, owner.address, payoutAmount)
        .and.to.emit(staking, "Claim")
        .withArgs(addr1.address, payoutAmount);
    })

    it('rejects withdrawing NFT when it is not owner', async () => {
      await expect(staking.connect(addr2).withdrawNft(tokenId, nft.address)).to.be.revertedWith("Staking: not owner NFT");
    })
  })

  describe('checks is active', () => {
    it('checks is active while NFT not added', async () => {
      expect(false).to.equal(await staking.isActive(nft.address));
    })

    it('checks is active while staking not started', async () => {
      const price = await nft.priceFor(addr1.address);
      await nft.connect(addr1).buy(1, { value: price });
      await staking.addNFT(nft.address, percentageThreshold);

      expect(false).to.equal(await staking.isActive(nft.address));
    })

    it('checks is active while staking started some time before', async () => {
      const price = await nft.priceFor(owner.address);

      for (let i = 1; i < 102; i++) {
        await nft.buy(i, { value: price });
      }

      await staking.addNFT(nft.address, percentageThreshold);

      expect(true).to.equal(await staking.isActive(nft.address));
    })

    it('checks is active while staking has just started', async () => {
      const price = await nft.priceFor(owner.address);

      await staking.addNFT(nft.address, percentageThreshold);

      for (let i = 1; i < 102; i++) {
        await nft.buy(i, { value: price });
      }

      expect(true).to.equal(await staking.isActive(nft.address));
    })
  })
});
