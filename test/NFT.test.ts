import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "@ethersproject/units";
import { NFT__factory } from "../typechain/factories/NFT__factory";
import { NFT } from "../typechain/NFT";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish } from "ethers";

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
  let giftedUsers: any;

  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://bafkreib7rk44lfgqzt6jfvma4khx6sgag6edmp4d2avt67flk5wueqfjc4/";
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const maxSupply = 10005;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, fundingWallet, ...addrs] = await ethers.getSigners();

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    const deadline = timestampBefore + 86400;
    const whitedlistedUsers = [addr3.address];
    giftedUsers = [addrs[0].address, addrs[1].address, addrs[2].address, addrs[3].address, addrs[4].address];

    const Nft = (await ethers.getContractFactory('NFT')) as NFT__factory;
    nft = await Nft.deploy(name, symbol, baseTokenURI, fundingWallet.address, deadline, whitedlistedUsers, giftedUsers);
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

    it('should set circulating supply', async () => {
      expect(await nft.circulatingSupply()).to.equal(giftedUsers.length);
    })

    it('should set circulating supply', async () => {
      let userCount = 0;

      for (let i = 10001; i <= 10005; i++) {
        const uri = await nft.tokenURI(i);

        expect(deployTx).to.emit(nft, "Bought").withArgs(i, giftedUsers[userCount], 0)
          .and.to.emit(nft, "PermanentURI").withArgs(uri, i);
      }
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
      await incrementNextBlockTimestamp(86401);
      await ethers.provider.send("evm_mine", []);
      await nft.addWhitelists([addr1.address]);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(true);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.4", 18));
    })

    it('gets price for !whitelisted user and deadline finished', async () => {
      await incrementNextBlockTimestamp(86401);
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

  describe('buys NFT by the token id', async () => {
    const tokenId = 1;

    it('buys NFT successfully', async () => {
      const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
      const fundingWalletBalanceBefore = await ethers.provider.getBalance(fundingWallet.address);
      const circulatingSupplyBefore = await nft.circulatingSupply();

      const price = await nft.priceFor(addr1.address);

      const tx = await nft.connect(addr1).buy(tokenId, { value: price });

      const minedTx = await tx.wait();
      const fee = minedTx.gasUsed.mul(minedTx.effectiveGasPrice);
      const uri = await nft.tokenURI(tokenId);

      const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
      const fundingWalletBalanceAfter = await ethers.provider.getBalance(fundingWallet.address);
      const circulatingSupplyAfter = await nft.circulatingSupply();

      expect(circulatingSupplyAfter).to.equal(circulatingSupplyBefore.add(1));
      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.sub(price).sub(fee));
      expect(fundingWalletBalanceAfter).to.equal(fundingWalletBalanceBefore.add(price));
      expect(tx).to.emit(nft, "Bought").withArgs(tokenId, addr1.address, price);
      expect(tx).to.emit(nft, "PermanentURI").withArgs(uri, tokenId);
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

  describe('buys NFT by the token ids', async () => {
    it('buys NFT successfully', async () => {
      let tokenIds = [];

      for (let i = 0; i <= 1; i++) {
        tokenIds[i] = i + 1
      }

      const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
      const fundingWalletBalanceBefore = await ethers.provider.getBalance(fundingWallet.address);
      const circulatingSupplyBefore = await nft.circulatingSupply();

      const price = (await nft.priceFor(addr1.address)).mul((String(tokenIds.length)));

      const tx = await nft.connect(addr1).buyBulk(tokenIds, { value: price });

      const minedTx = await tx.wait();
      const fee = minedTx.gasUsed.mul(minedTx.effectiveGasPrice);

      const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
      const fundingWalletBalanceAfter = await ethers.provider.getBalance(fundingWallet.address);
      const circulatingSupplyAfter = await nft.circulatingSupply();

      expect(circulatingSupplyAfter).to.equal(circulatingSupplyBefore.add((String(tokenIds.length))));
      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.sub(price).sub(fee));
      expect(fundingWalletBalanceAfter).to.equal(fundingWalletBalanceBefore.add(price));

      for (let i = 0; i <= tokenIds.length - 1; i++) {
        const uri = await nft.tokenURI(tokenIds[i]);

        expect(tx).to.emit(nft, "Bought").withArgs(tokenIds[i], addr1.address, price);
        expect(tx).to.emit(nft, "PermanentURI").withArgs(uri, tokenIds[i]);
      }
    })

    it('rejects buying NFT while invalid value', async () => {
      let tokenIds = [];

      for (let i = 0; i <= 1; i++) {
        tokenIds[i] = i + 1
      }

      const price = (await nft.priceFor(addr1.address));

      await expect(nft.connect(addr1).buyBulk(tokenIds, { value: price })).to.be.revertedWith('NFT: invalid value')
    })

    it('rejects buying NFT while token id less than 1', async () => {
      const price = (await nft.priceFor(addr1.address));

      await expect(nft.connect(addr1).buyBulk([parseUnits("0", 18)], { value: price })).to.be.revertedWith('NFT: token !exists')
    })

    it('rejects buying NFT while token id more than 10005', async () => {
      const price = (await nft.priceFor(addr1.address));

      await expect(nft.connect(addr1).buyBulk([parseUnits("10006", 18)], { value: price })).to.be.revertedWith('NFT: token !exists')
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

  describe('checks token id on existence', async () => {
    const tokenId = 1;

    it('checks token id on existence if it is true', async () => {
      const price = await nft.priceFor(addr1.address);

      await nft.connect(addr1).buy(tokenId, { value: price });
      expect(await nft.exists(tokenId)).to.be.equal(true);
    })

    it('checks token id on existence if it is false', async () => {
      expect(await nft.exists(tokenId)).to.be.equal(false);
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

  describe('gets token supply data', async () => {
    it('gets max supply', async () => {
      expect(await nft.maxSupply()).to.equal(maxSupply);
    })
  })
});
