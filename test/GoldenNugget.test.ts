import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "@ethersproject/units";
import { GoldenNugget__factory } from "../typechain/factories/GoldenNugget__factory";
import { GoldenNugget } from "../typechain/GoldenNugget";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe('Golden Nugget ERC-20 contract', () => {
  let goldenNugget: GoldenNugget;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    [owner, addr1, ...addrs] = await ethers.getSigners();

    const GoldenNugget = (await ethers.getContractFactory('GoldenNugget')) as GoldenNugget__factory;

    goldenNugget = await GoldenNugget.deploy();

    await goldenNugget.deployed();
  });

  describe('initial values', async () => {
    it('should set roles', async () => {
      await goldenNugget.hasRole(await goldenNugget.DEFAULT_ADMIN_ROLE(), owner.address);
      await goldenNugget.hasRole(await goldenNugget.MINTER_ROLE(), owner.address);
    })
  });

  describe('mints', () => {
    it('mints successfully', async () => {
      const addr1BalanceBefore = await goldenNugget.balanceOf(addr1.address);
      const totalSupplyeBefore = await goldenNugget.totalSupply();

      const amount = parseUnits("100", await goldenNugget.decimals());

      const result = await goldenNugget.mint(addr1.address, amount);

      const addr1BalanceAfter = await goldenNugget.balanceOf(addr1.address);
      const totalSupplyeAfter = await goldenNugget.totalSupply();

      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.add(amount));
      expect(totalSupplyeAfter).to.equal(totalSupplyeBefore.add(amount));

      await expect(result).to.emit(goldenNugget, "Transfer")
        .withArgs(zeroAddress, addr1.address, amount);
    })
  })
});
