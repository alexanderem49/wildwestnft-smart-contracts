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
  let giftedUsers: string[];

  const name = "Wild West NFT";
  const symbol = "WWN";
  const baseTokenURI = "ipfs://bafkreib7rk44lfgqzt6jfvma4khx6sgag6edmp4d2avt67flk5wueqfjc4/";
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const maxSupply = 10005;
  const royaltyFee = 500;
  const feeDenominator = 10000;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, fundingWallet, ...addrs] = await ethers.getSigners();

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    const deadline = timestampBefore + 86400;
    giftedUsers = ["0xb4fa6c78390615a5416be0f46a054d1c6a0a1841",
      "0xE64f23dF6176fb4C72478aeAcBC6520b0Cf335b2",
      "0x249779fD0C0a7866Bf366D92184100d880dc777B",
      "0x322D032DDbDc0Aba1908eA6a9682A4ef83796C5d",
      "0xC9cfb1Eec514BCAD0b50d0E5b44A9bB0216B0eA4",
      "0x55b9942e02d7748e8B1639815683b62c6bA96C95",
      "ilhan.eth",
      "0x1455894CeCe482607A96B0D55C9dcb794C6670C9",
      "0xad529E0bb588453fA9b55eB2fB677B0c2082c5Da",
      "0xcF98CE11b4e59C051aC13133F65Acb9dE2c04AA4",
      "0x9D9aC19ec6ef19eb147de2a2d933D18B419df99E",
      "0x7c7D62AA00a92eD55050B9397eB58a1162385b2C",
      "0x55DbCbC13B80165bAAc08d2a6c800CD58ae37c98",
      "0x8bD26c8Ab08d25b2Fa69fb0B0535bd7194c0434c",
      "0x5f5E2b36Ee5Ac451342555908e7F1ed279019588",
      "0x9d8072753db4aEC831e7263552c319bD3A839570",
      "0xbc3592cd056c1f098a795d5b89ba9ef3565b3691",
      "0xE85092Df22764f18CDe572a1aE0265782d9f904f",
      "0x3e73263ff3cc1b670244d0a2118724efEE439550",
      "0x1eA87b35c5DaeFf94Bb0b60fAbE93e5f25f1A355",
      "0x912b75357438a94b1b5094beac947d0285125a42",
      "0x7aDf00c05ad795BeBd99640adcdacc94a32D097a",
      "0x59AaA477Ea7F52819cD8EC23Ccce1111974475BF",
      "0x34e8788FF4aa760AB46d980e97EF6a0971e04Edf",
      "0x93438055E3f335114333A87324C8B2D28CcB0edD",
      "0x2cbF724B36BB47a3F992faD8000f6eB1e5a01932",
      "0x8a7A4d635036f87024b8a6aC4eC5C663B670DB98",
      "0xbb1f7Cce821AaB2435AC9C4A4eaCB7CE231eF19C",
      "0x205Cc2261E70C7dB2d9dD8157FAbe624CB23464b",
      "0x8EB65A498820bB09208A899603D11892ad2c4535",
      "0xb7FF045d201217FAf6314946d357B87Ed7FDa9cE",
      "0x53965cd7992BC61b4807Aa7aCe3Bec0062c90dE2",
      "metajackie.eth",
      "staymotivated.eth",
      "0x958d61Ffe3923db0247091e7EFF8413CC13c0De6",
      "0xeE51996B9A50f84e378c88A793f021d5eaD97201",
      "0xEda0A27DD169Ebc073B8E76cdE1d4d3F229C9B24",
      "0x2A6013C6d97cF3abFAB166141a06479B765FD957",
      "0x03f220b08D9911bB76d3d218459C92Fe573707B4",
      "0x1DD85Fc6D1ea476c9Fd74e2f2346a1A69677F1D6",
      "0x263b0b1cb659bedfEa1278Bd618d19841137e3Af",
      "0x25A4c9A1829fe93778C5790411471eE3aCE7F721",
      "0xdE7d35F01b8644AC3Af93d8171711Dca2b696D58",
      "0x404811d27C1923b4a8f003e9Bef79800d1CC12F0",
      "0x97d50af0e83488Ce3D595267CD95525B3AAdA9F1",
      "0x959a6FA8b13ba63519412497502f833F38F33b25",
      "0xbA06bfc966f7978547e9189a98a8d6621495AfAA",
      "0x221B78823F05F7bdF65d31381121284CBFC9bf33",
      "0xeDF2b10e790abF294a74546167D6B014d4774F19",
      "0xFd63EC0eF760220E1A9837F42b8cE4Df6EA640c9",
      "0x7A6e50e81B7F7e7Dcb952Ca405Ed7A6199B9C8E5",
      "0xdc9dE370056DCD547f9d51D3068C0e175b3Fe88D",
      "0xcCBDC934fF66d849761B785CbF7F9dD34e646e90",
      "0x6481cC10B2cF407997d71767281e2D3AbF9a21B6",
      "0x588498be4bBFC11A8074c797e1F8308def6389e1",
      "0x5CC6f0310e2855a0E7795550304D961e2bcE7b7d",
      "0xabB0552cE2EBA79E0988e9b3A06F0d3637B80F10",
      "0x1841cddeccfc27a36021d6856661dfd6a8ac0d7d",
      "0x5ef14f98b1084c557ec12772e249499fd2bbed8c",
      "0x19318c4bFC4aD2aef62aeFB41ba8F3de2894d3c7",
      "0x8808fB5A3e13aAe22a6E765a85c8902A3473fA49",
      "0x7A95f12cbAb5e7776DF3a0ff8A41712Da73d2856",
      "0x260D3Bd5716Fc369DABc7F05bD7D7043CF60147C",
      "0xda267a119825d03605e5c50344e5984bcfd0acea",
      "0x7d93c650BcF4Ed1Ae89b6758463C81FE8410f183",
      "0x5BEca422e446957E9b5Ef7e2aeA60c6Ba194db79",
      "0x68db74280e069599ADe50A34F97059357c60Ae15",
      "0xd115D0cb0B4F8EA909F8ceD6d974cd632C9378B9",
      "0x897387eD63023fdD3fe3F8012fB07600Fb9dDa7f",
      "0x5E3330b26177C24CBa7CB63a7e69e263A8e93179",
      "0xf131380D4ca29861CC50976CdA54Fb00169484b8",
      "0x622BD91F7FDA79fFbbEbC8B3929bf9F85e45106D",
      "0x6007757c779606329d6506C1C285A01C2E4b8dC6",
      "0x4bAF3769464535344b78cae9075cadBf2B15bA2b",
      "0x172b57e34116E7fe99d9D76D3ca7Cd8b21995815",
      "0xC9174e9480C3bE8576Ca4f2E6F659AC23aE9Ff41",
      "0xF9aA19a823B9b42c47844B3579723Bb7AAe714f6",
      "0xA55ab543aaEb8c6E363813b32203A78dA41066D1",
      "0x92c69840FB959e74b7BF42E14244D0Be123F0C45",
      "0x7b586cDA544bFE7fF2F278d9820B94ff8de280dd",
      "0xF3a8c722D18647a02c25d5Ce5c23Bbf843f51B66",
      "0x235eA8b57206D7F42bC477AF2F41AC8EAdd24085",
      "0xBCf6B232b7e29053f1d2487D8e8F3FC3698D0EC0",
      "0xacb9A037C87EB3eDF193CA49ca252d0D903D78dC",
      "0xB20d8fED2C7FAb040f669232A35233B0d7afa756",
      "0xd9813a76a81acfc07527dc1a1b85fcf88a69378a",
      "0x047d0a1D3260Dfa29b9d40B5E06dF946461D080f",
      "0xa4fd84c4b68749dFF6f6836C796e33f10E3Fc91c",
      "0x8409ed297275bb6e94d6b898ea4dbd66c9001f25",
      "0x94515B282B6C2F3Cf7c7F4A058a40282F32ec91E",
      "0xcBea8459bc6ec57b433393bB1550f47B037bB002",
      "0xDaC58bA2798e1D973e6118135D81d6887006d51f",
      "0xD240a9BBDA806c8abc93f313282dB8a56B5963e8",
      "0xf0a4e2167049566d3e0e46DE3cC880804534d7B8",
      "0x64BE054782672e9F4b4d217c242a9D2A4557Fc46",
      "0x83884d17dF445D7F8d3b6fd28497DE8Dd0d6f36d",
      "0x5791e9d3ea772922f535c17873adee8775b5d28b",
      "0x5d97bEC7f4877892925a08E796657b89D974387b",
      "0x0532Ac5e32DAd159B0822bF4504E37CE3f13c548",
      "0x9675d9f9df87F6F15b8e920a6bB5a9B42cef3Fb1",
      "0x9fc8c18045546ab0890272f8563da45fb9bcc0c6",
      "0x2b1feDe5944888407e7401229523623851fe9c47",
      "0x91d525505e4a524CcdFc22E44428b889e2CD1CEd",
      "0xcC27819D2a88Ddc83A0A9f81aF426B5bF06Ee047",
      "0x2Bb300f98578Fc9147128420B17950E6Bf252e74",
      "0x66d05b2318ca4fbcb932cf34162e302932a763b0",
      "0xebd2a146aa92e5c2b89f51d1701b0bebc6ce6565",
      "0xe05408E8cd05F18684DbCcA4fFf6EE2F3fa7917A",
      "0x2046e2D2589EE4B97c6021E4A54e3EB067723B7e",
      "0x5461C2125E7AB64B4C428487dC853F09ff37185A",
      "0xeF0eE15565aDFFFc39D32ce91d5743a198e6a3a4",
      "0xAFbb1ceD20c8475E8d3d0fCfCEF2a4472cc96Bc2",
      "0x38aa9c7ae03a8f7f880025cea1307ba3faea8b1a",
      "0x90F4486C36add586B9A800Da14BB7711c065deb0",
      "0x7D862AF60de779e84ac0358f45838772d507D562",
      "0xB85EEFf4380189E40143E32f9EAe4c9B53Bb142C",
      "0x01182d05915f049427aF693E2AE418e9143F8A12",
      "0xE2Ac8cC48378BA7198da33F7045c273651274078",
      "0x800eb70A4f0FBe3eBde1802FA8F36484aE6360B8",
      "0x2107cbc6C47122578A8e5868cA4285234244f62B",
      "0xed76fC23d66e2af4C4FeaAaBFc0585d38e3502fF",
      "0x8a68F8E7c3acdEF35E42A8Dfd9E8A6774B66d307",
      "0x3900a03efE9702FA2BD064E69a3F61B74f82E95e",
      "0x0130effb228cb2b9aee56ee3ee70c201b57e426a",
      "0x54dbd33adacac22f86819221882bd8d8b03c0ecb",
      "0xb552aF04A5053d8935Caae235219DDC1E5ac7ecD",
      "0x008aa7D9E34f46bC946606737820A88d2E120E05",
      "0x61aaD6Ece2b6D024D8bBC3A80F554f881dA25b27",
      "0x1B67FcdbB7eC381Ddf5234B27aF74f7e7106B9bC",
      "0x0111e3b9A9046e2426Ea9fC39958D54674635719",
      "0xdD112976D3A9c232f2c4A03Af26E20b52EecE770",
      "0x0cFDCce0143806206Df3c112e53379590144b3C7",
      "0xD5e8034B54abB9a28aa1f35f5d0f0B5EB626d566",
      "0x7d39bF5461CA14bDe3c472CCd834DFc218AdA88f",
      "0xAdD76C8481Fdb353E04103153928A4Df618FF5Ba",
      "0xA7Eeb18E5661451B9afD2e57708E6583963B1178",
      "0x10d091aE2ED495B63eE7041424fe7C7db9Ee2C92",
      "0x94001d84cDa25BFC05d2BA5Cd0F8b18fbe43A401",
      "0x3900E40476F8fB8e6e791286533DCb9A440B399C",
      "0x22a7e12169662d893457061c09fb5a4972017dad",
      "0xa261fAE7A26427C8CA0a939A21b466D849702b96",
      "0x5EB1c2572B265AeeC63867Ae323A4b66B54FaDb0",
      "0xa7FEF1c2C413979817C5dC862BF3bC716c4f6B6a",
      "0xb66ACe81B32Ae77B6A2604bf566643ff2D0e6d5C",
      "0x5153E6144A37f22DEdbA9F8e1Cdee8Ec5621fE8F",
      "0xcF92A1332d8CD3CdaA2297DD777f473BD542A720",
      "0x246951f51C9Bed22973e8d9df9E6a705c166e06F",
      "0x97306b6CA816Cc86a02630D5f234c26A9701Bea0",
      "0xe32cF85090D7AD90bC066F527FcB56c900Ea37A1",
      "0xC650d64e2fE79E8DA3fA5047225BDcCCD0026dC7",
      "0x7191050Dd4cF57700D0bE2711F02ec294dD26547",
      "Gifdead.eth",
      "darlingoddity.eth",
      "Vengo.eth",
      "cryptorizzy.eth",
      "maddieroses.eth",
      "0x43e6a7d0A9CcACAA93Dbca0268A47093333e78EB",
      "Lorenas.eth",
      "0xD66A5cdb3F90754B5B0b846ebE52b177d540Ce93",
      "0x79b51E57b8Ce9799797c4F018c07d70d9c3846aa",
      "0x7b9B7579A505811E2f6224b657593a568976700a",
      "biff.eth",
      "0xa4f943Df8bb777A26fa002A5c830893D33B799D9",
      "0xbc23524F3C0aa69Ec123e60D347c5E3E7ac92943",
      "0xcf00AECa16e05eD1Ff1fbe1152f72e85719AfE29",
      "0x432096F0D9aF9b9b65699E87122dB37214A64d82",
      "0xe638eb0Dc8e82F23C386D9E3967f06E15c348514",
      "0x121bf018c4260Ff74d1a223FA3F5fAa26140f986",
      "0xE32b8ec04F183790646FD65862fB223141E44B13",
      "0xf52391D6d2FDBf4e5B9E028f0959F04D1B10493a",
      "0xD09De532e87B25677C6f51192d6686fe26b6835a",
      "0x1d78D3D044Ed3fa4767e4A5aA73805c984bE92eD"];

    const Nft = (await ethers.getContractFactory('NFT')) as NFT__factory;
    nft = await Nft.deploy(name, symbol, baseTokenURI, fundingWallet.address, deadline, giftedUsers);
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
      for (let i = 0; i < giftedUsers.length; i++) {
        const address = giftedUsers[i];
        expect(await nft.isWhitelisted(address)).to.equal(true);
        expect(deployTx).to.emit(nft, "AddedToWhitelist").withArgs([address]);
      }
    })

    it('should set circulating supply', async () => {
      expect(await nft.circulatingSupply()).to.equal(5);
    })

    it('should set circulating supply', async () => {
      let userCount = 0;

      for (let i = 10001; i <= 10005; i++) {
        const uri = await nft.tokenURI(i);

        expect(deployTx).to.emit(nft, "Bought").withArgs(i, owner.address, 0)
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

  describe('gets price', async () => {
    it('gets price for whitelisted user and deadline not finish', async () => {
      await nft.addWhitelists([addr1.address]);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(true);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.06", 18));
    })

    it('gets price for !whitelisted user and deadline not finish', async () => {
      expect(await nft.isWhitelisted(addr1.address)).to.equal(false);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.06", 18));
    })

    it('gets price for whitelisted user and deadline finished', async () => {
      await incrementNextBlockTimestamp(86401);
      await ethers.provider.send("evm_mine", []);
      await nft.addWhitelists([addr1.address]);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(true);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.06", 18));
    })

    it('gets price for !whitelisted user and deadline finished', async () => {
      await incrementNextBlockTimestamp(86401);
      await ethers.provider.send("evm_mine", []);

      expect(await nft.isWhitelisted(addr1.address)).to.equal(false);
      expect(await nft.priceFor(addr1.address)).to.equal(parseUnits("0.08", 18));
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

      await expect(nft.connect(addr1).buyBulk([10006], { value: price })).to.be.revertedWith('NFT: token !exists')
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
