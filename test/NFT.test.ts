import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "@ethersproject/units";
import { NFT__factory } from "../typechain/factories/NFT__factory";
import { NFT } from "../typechain/NFT";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish } from "ethers";
import { Console } from "console";

async function incrementNextBlockTimestamp(amount: number): Promise<void> {
  return ethers.provider.send("evm_increaseTime", [amount]);
}

const toBytes32 = (bn: any) => {
  return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
};

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
  const baseTokenURI = "ipfs://bafkreib7rk44lfgqzt6jfvma4khx6sgag6edmp4d2avt67flk5wueqfjc4/";
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const maxSupply = 10005;
  const royaltyFee = 1500;
  const feeDenominator = 10000;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, fundingWallet, ...addrs] = await ethers.getSigners();

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    const deadline = timestampBefore + 86400;

    const Nft = (await ethers.getContractFactory('NFT')) as NFT__factory;
    nft = await Nft.deploy(name, symbol, baseTokenURI, fundingWallet.address, deadline);
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

    it('should set circulating supply', async () => {
      expect(await nft.circulatingSupply()).to.equal(5);
    })

    it('should mint NFT for gifted users', async () => {
      for (let i = 10001; i <= 10005; i++) {
        const uri = await nft.tokenURI(i);

        expect(deployTx).to.emit(nft, "Minted").withArgs(i, owner.address)
          .and.to.emit(nft, "PermanentURI").withArgs(uri, i);
      }
    })
  });

  describe('royalty', async () => {
    it('supports royalty', async () => {
      const eip2981Interface = "0x2a55205a";
      expect(await nft.supportsInterface(eip2981Interface)).to.be.true;
    })

    it('gets royalty info', async () => {
      const tokenId = 1;
      const tokenPrice = parseUnits("0.08", 18);
      const [receiver, royaltyAmount] = await nft.royaltyInfo(tokenId, tokenPrice);

      const expectedRoyalty = tokenPrice.mul(royaltyFee).div(feeDenominator);

      expect(receiver).to.equal(fundingWallet.address);
      expect(royaltyAmount).to.equal(expectedRoyalty);
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

  describe('mints NFT by the token id', async () => {
    const tokenId = 1;

    it('mints NFT successfully', async () => {
      const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
      const fundingWalletBalanceBefore = await ethers.provider.getBalance(fundingWallet.address);
      const circulatingSupplyBefore = await nft.circulatingSupply();

      const tx = await nft.connect(addr1).mint(tokenId);

      const minedTx = await tx.wait();
      const fee = minedTx.gasUsed.mul(minedTx.effectiveGasPrice);
      const uri = await nft.tokenURI(tokenId);

      const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
      const fundingWalletBalanceAfter = await ethers.provider.getBalance(fundingWallet.address);
      const circulatingSupplyAfter = await nft.circulatingSupply();

      expect(circulatingSupplyAfter).to.equal(circulatingSupplyBefore.add(1));
      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.sub(fee));
      expect(fundingWalletBalanceAfter).to.equal(fundingWalletBalanceBefore);
      expect(tx).to.emit(nft, "Minted").withArgs(tokenId, addr1.address);
      expect(tx).to.emit(nft, "PermanentURI").withArgs(uri, tokenId);
    })

    it('rejects minting NFT while user supply more than allowed', async () => {
      await ethers.provider.send("hardhat_setStorageAt", [
        nft.address,
        "0x9",
        "0x000023280000000662cd763c15d34aaf54267db7d7c367839aaf71a00a2c6a65",
      ]);

      await expect(nft.connect(addr1).mint(tokenId)).to.be.revertedWith('NFT: mint not available')
    })

    it('rejects minting NFT while token id less than 1', async () => {
      await expect(nft.connect(addr1).mint(0)).to.be.revertedWith('NFT: token !exists')
    })

    it('rejects minting NFT while token id more than 10005', async () => {
      await expect(nft.connect(addr1).mint(10006)).to.be.revertedWith('NFT: token !exists')
    })
  })

  describe('mints NFT by the token ids', async () => {
    it('mints NFT successfully', async () => {
      let tokenIds = [];

      for (let i = 0; i <= 1; i++) {
        tokenIds[i] = i + 1
      }

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const fundingWalletBalanceBefore = await ethers.provider.getBalance(fundingWallet.address);
      const circulatingSupplyBefore = await nft.circulatingSupply();

      const tx = await nft.mintBulk(tokenIds);

      const minedTx = await tx.wait();
      const fee = minedTx.gasUsed.mul(minedTx.effectiveGasPrice);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const fundingWalletBalanceAfter = await ethers.provider.getBalance(fundingWallet.address);
      const circulatingSupplyAfter = await nft.circulatingSupply();

      expect(circulatingSupplyAfter).to.equal(circulatingSupplyBefore.add((String(tokenIds.length))));
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore.sub(fee));
      expect(fundingWalletBalanceAfter).to.equal(fundingWalletBalanceBefore);

      for (let i = 0; i <= tokenIds.length - 1; i++) {
        const uri = await nft.tokenURI(tokenIds[i]);

        expect(tx).to.emit(nft, "Minted").withArgs(tokenIds[i], owner.address);
        expect(tx).to.emit(nft, "PermanentURI").withArgs(uri, tokenIds[i]);
      }
    })

    it('rejects minting NFT while owner supply more than allowed', async () => {
      let tokenIds = [];

      for (let i = 0; i <= 1000; i++) {
        tokenIds[i] = i + 1
      }

      await expect(nft.mintBulk(tokenIds)).to.be.revertedWith('NFT: mint not available')
    })

    it('rejects minting NFT while token id less than 1', async () => {
      await expect(nft.mintBulk([parseUnits("0", 18)])).to.be.revertedWith('NFT: token !exists')
    })

    it('rejects minting NFT while token id more than 10005', async () => {
      await expect(nft.mintBulk([10006])).to.be.revertedWith('NFT: token !exists')
    })
  })

  describe('gets token URI', async () => {
    it('gets token URI successfully', async () => {
      const tokenId = 1;

      await nft.connect(addr1).mint(tokenId);

      expect(baseTokenURI + tokenId + ".json").to.equal(await nft.tokenURI(tokenId));
    })

    it('rejects nonexistent token', async () => {
      await expect(nft.tokenURI(parseUnits("1000", 18))).to.be.revertedWith('ERC721Metadata: token !exists');
    })
  })

  describe('checks token id on existence', async () => {
    const tokenId = 1;

    it('checks token id on existence if it is true', async () => {
      await nft.connect(addr1).mint(tokenId);
      expect(await nft.exists(tokenId)).to.be.equal(true);
    })

    it('checks token id on existence if it is false', async () => {
      expect(await nft.exists(tokenId)).to.be.equal(false);
    })
  })

  describe('gets token supply data', async () => {
    it('gets max supply', async () => {
      expect(await nft.maxSupply()).to.equal(maxSupply);
    })
  })
});
