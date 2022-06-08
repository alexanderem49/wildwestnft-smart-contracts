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
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let deployTx: any;
  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://bafkreib7rk44lfgqzt6jfvma4khx6sgag6edmp4d2avt67flk5wueqfjc4";
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    const Nft = (await ethers.getContractFactory('NFT')) as NFT__factory;
    nft = await Nft.deploy(name, symbol, baseTokenURI, [addr3.address]);

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

    it('should added to whitelist', async () => {
      expect(await nft.isWhitelisted(addr3.address)).to.equal(true);
      expect(deployTx).to.emit(nft, "AddedToWhitelist").withArgs([addr3.address]);
    })
  });

  describe('mints', async () => {
    it('mints successfully', async () => {
      const addr1BalanceBefore = await nft.balanceOf(addr1.address);

      const tokenId = await nft.callStatic.mint(addr1.address);
      const tx = await nft.mint(addr1.address);

      const tokenCount = await nft.currentTokenId();
      const tokenUri = await nft.tokenURI(tokenId);
      const addr1BalanceAfter = await nft.balanceOf(addr1.address);

      expect(tokenId).to.be.equal(0);
      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.add(tokenCount));
      expect(baseTokenURI + tokenId + ".json").to.equal(tokenUri);
      expect(tx).to.emit(nft, "PermanentURI").withArgs(tokenUri, tokenId);
    })
  })

  describe('gets token URI', async () => {
    it('gets token URI successfully', async () => {
      const tokenId = await nft.callStatic.mint(addr1.address);
      await nft.mint(addr1.address);

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
