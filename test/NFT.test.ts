import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "@ethersproject/units";
import { NFT__factory } from "../typechain/factories/NFT__factory";
import { NFT } from "../typechain/NFT";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function incrementNextBlockTimestamp(amount: number): Promise<void> {
  return ethers.provider.send("evm_increaseTime", [amount]);
}

describe('NFT contract', () => {
  let nft: NFT;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let fundingWallet: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let deployTx: any;

  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://bafkreib7rk44lfgqzt6jfvma4khx6sgag6edmp4d2avt67flk5wueqfjc4";
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, fundingWallet, ...addrs] = await ethers.getSigners();

    const Nft = (await ethers.getContractFactory('NFT')) as NFT__factory;

    const deadline = Math.round((new Date().getTime() + 6000) / 1000);

    nft = await Nft.deploy(name, symbol, baseTokenURI, fundingWallet.address, deadline, [addr3.address]);

    deployTx = await nft.deployed();
  });

  describe('initial values', async () => {
    it('should set token name', async () => {
      expect(name).to.be.equal(await nft.name());
    });

    it('should set token symbol', async () => {
      expect(symbol).to.be.equal(await nft.symbol());
    });

    it('should set base token URI', async () => {
      expect(symbol).to.be.equal(await nft.symbol());
    })

    it('should set funding wallet', async () => {
      expect(fundingWallet.address).to.equal(await nft.fundingWallet());
    })

    it('should added to whitelist', async () => {
      expect(await nft.isWhitelisted(addr3.address)).to.equal(true);
      expect(deployTx).to.emit(nft, "AddedToWhitelist").withArgs([addr3.address]);
    })
  });

  describe('gets price', async () => {
    it('gets price for whitelisted user and deadline not finish', async () => {
      await nft.addWhitelists([addr1.address]);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(true);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.4", 18));
    })

    it('gets price for !whitelisted user and deadline not finish', async () => {
      expect(await nft.isWhitelisted(addr1.address)).to.equal(false);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.4", 18));
    })

    it('gets price for whitelisted user and deadline finished', async () => {
      await incrementNextBlockTimestamp(6001);
      await ethers.provider.send("evm_mine", []);
      await nft.addWhitelists([addr1.address]);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(true);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.4", 18));
    })

    it('gets price for !whitelisted user and deadline finished', async () => {
      await incrementNextBlockTimestamp(6001);
      await ethers.provider.send("evm_mine", []);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(false);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.5", 18));
    })
  })

  describe('sets funding wallet', async () => {
    it('sets funding wallet successfully', async () => {

      const fundingWalletBefore = await nft.fundingWallet();

      await nft.setFundingWallet(addr3.address);

      const fundingWalletAfter = await nft.fundingWallet();

      expect(fundingWalletAfter).to.not.equal(fundingWalletBefore);
      expect(fundingWalletAfter).to.equal(addr3.address);
    })

    it('rejects setting while zero address', async () => {
      await expect(nft.setFundingWallet(zeroAddress)).to.be.revertedWith('NFT: wallet is zero address');
    })
  })

  describe('buys NFT', async () => {
    const tokenId = 1;

    it('buys NFT successfully', async () => {
      const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
      const fundingWalletBalanceBefore = await ethers.provider.getBalance(fundingWallet.address);

      const price = await nft.priceFor(addr1.address);

      const tx = await nft.connect(addr1).buy(tokenId, { value: price });

      const minedTx = await tx.wait();
      const fee = minedTx.gasUsed.mul(minedTx.effectiveGasPrice);

      const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
      const fundingWalletBalanceAfter = await ethers.provider.getBalance(fundingWallet.address);

      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.sub(price).sub(fee));
      expect(fundingWalletBalanceAfter).to.equal(fundingWalletBalanceBefore.add(price));
      expect(tx).to.emit(nft, "Bought").withArgs(tokenId, addr1.address, price);
    })

    it('rejects buying NFT while invalid value', async () => {
      await expect(nft.connect(addr1).buy(tokenId, { value: parseUnits("0.2", 18) })).to.be.revertedWith('NFT: invalid value')
    })

    it('rejects buying NFT while token id less than 1', async () => {
      await expect(nft.connect(addr1).buy(0, { value: parseUnits("0.2", 18) })).to.be.revertedWith('NFT: token !exists')
    })

    it('rejects buying NFT while token id more than 10005', async () => {
      await expect(nft.connect(addr1).buy(10006, { value: parseUnits("0.2", 18) })).to.be.revertedWith('NFT: token !exists')
    })
  })

  describe('gets token URI', async () => {
    it('gets token URI successfully', async () => {
      const tokenId = 1;
      const price = await nft.priceFor(addr1.address);

      await nft.connect(addr1).buy(tokenId, { value: price });

      expect(baseTokenURI + tokenId + ".json").to.equal(await nft.tokenURI(tokenId));
    })

    it('rejects nonexistent token', async () => {
      await expect(nft.tokenURI(parseUnits("1000", 18))).to.be.revertedWith('ERC721Metadata: token !exists');
    })
  })

  describe('white lists', async () => {
    it('user not whitelisted', async () => {
      expect(await nft.isWhitelisted(addr1.address)).to.equal(false);
    })

    it('user whitelisted', async () => {
      await nft.addWhitelists([addr1.address]);
      expect(await nft.isWhitelisted(addr1.address)).to.equal(true);
    })
  })

  describe('adds users to whitelists', async () => {
    it('adds users to whitelists successfully', async () => {
      expect(await nft.isWhitelisted(addr1.address)).to.equal(false);
      expect(await nft.isWhitelisted(addr1.address)).to.equal(false);

      const tx = await nft.addWhitelists([addr1.address, addr2.address]);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(true);
      expect(await nft.isWhitelisted(addr2.address)).to.equal(true);
      expect(tx).to.emit(nft, "AddedToWhitelist").withArgs([addr1.address, addr2.address]);
    })

    it('rejects too long users array', async () => {
      let users = [];

      for (let i = 0; i < 257; i++) {
        users[i] = addr1.address;
      }

      await expect(nft.addWhitelists(users)).to.be.revertedWith('NFT: whitelist too long');
    })

    it('rejects zero address', async () => {
      await expect(nft.addWhitelists([zeroAddress])).to.be.revertedWith('NFT: user is zero address');
    })

    it('rejects re-adding already whitelisted user', async () => {
      await nft.addWhitelists([addr1.address]);
      await expect(nft.addWhitelists([addr1.address])).to.be.revertedWith('NFT: user whitelisted');
    })
  })

  describe('removes users from whitelists', async () => {
    it('removes users from whitelists successfully', async () => {
      await nft.addWhitelists([addr1.address, addr2.address]);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(true);
      expect(await nft.isWhitelisted(addr2.address)).to.equal(true);

      const tx = await nft.removeWhitelists([addr1.address]);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(false);
      expect(await nft.isWhitelisted(addr2.address)).to.equal(true);
      expect(tx).to.emit(nft, "RemovedFromWhitelist").withArgs([addr1.address]);
    })

    it('rejects too long users array', async () => {
      let users = [];

      for (let i = 0; i < 257; i++) {
        users[i] = addr1.address;
      }

      await expect(nft.removeWhitelists(users)).to.be.revertedWith('NFT: whitelist too long');
    })

    it('rejects zero address', async () => {
      await expect(nft.removeWhitelists([zeroAddress])).to.be.revertedWith('NFT: user is zero address');
    })

    it('rejects re-deletion already !whitelisted user', async () => {
      await expect(nft.removeWhitelists([addr1.address])).to.be.revertedWith('NFT: user !whitelisted');
    })
  })
});
