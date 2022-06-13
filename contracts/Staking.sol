//SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "./GoldenNugget.sol";
import "./interface/ITokenSupplyData.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Staking is IERC721Receiver, AccessControl {
    GoldenNugget public goldenNugget;

    mapping(address => mapping(uint256 => Deposit)) public depositInfo;
    mapping(address => Nft) public nftInfo;

    enum Status {
        NOT_ACTIVE,
        ACTIVE,
        WAIT
    }

    struct Deposit {
        address ownerNft;
        uint256 startDate;
    }

    struct Nft {
        uint8 percentageThreshold;
        uint256 status;
    }

    event NftAdded(address indexed nftContract, uint256 startDate);

    event Claim(address indexed user, uint256 payoutAmount);

    event ERC721Received(
        uint256 indexed nftId,
        address indexed nftContract,
        address from
    );

    event Withdraw(
        uint256 indexed nftId,
        address indexed nftContract,
        address to
    );

    constructor(GoldenNugget goldenNugget_) {
        goldenNugget = goldenNugget_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function onERC721Received(
        address,
        address _from,
        uint256 _tokenId,
        bytes calldata
    ) external virtual override returns (bytes4) {
        require(
            address(this) == IERC721(msg.sender).ownerOf(_tokenId),
            "Staking: NFT not received"
        );

        Nft storage nft = nftInfo[msg.sender];

        if (nft.status == uint256(Status.WAIT)) {
            if (isReachedThreshold(msg.sender, nft.percentageThreshold)) {
                nft.status = uint256(Status.ACTIVE);
            }
        }

        require(nft.status == uint256(Status.ACTIVE), "Staking: not started");

        depositInfo[msg.sender][_tokenId] = Deposit(_from, block.timestamp);

        emit ERC721Received(_tokenId, msg.sender, _from);

        return this.onERC721Received.selector;
    }

    function addNFT(address _nft, uint8 _percentageThreshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_nft != address(0), "Staking: zero address");

        nftInfo[_nft].status = isReachedThreshold(_nft, _percentageThreshold)
            ? uint256(Status.ACTIVE)
            : uint256(Status.WAIT);

        nftInfo[_nft].percentageThreshold = _percentageThreshold;

        emit NftAdded(_nft, block.timestamp);
    }

    function claim(uint256 _nftId, address _nft) public {
        Deposit storage deposit = depositInfo[_nft][_nftId];

        uint256 payoutAmount = getPayoutAmount(deposit.startDate);

        if (payoutAmount > 0) {
            deposit.startDate = block.timestamp;
            goldenNugget.mint(msg.sender, payoutAmount);

            emit Claim(msg.sender, payoutAmount);
        }
    }

    function getPayoutAmount(uint256 _startDate) public view returns (uint256) {
        if (_startDate == 0) {
            return 0;
        }

        return (block.timestamp - _startDate) * 1653439153935;
    }

    function withdrawNft(uint256 _nftId, address _nft) external {
        Deposit storage deposit = depositInfo[_nft][_nftId];

        require(deposit.ownerNft == msg.sender, "Staking: not owner NFT");

        claim(_nftId, _nft);

        delete depositInfo[_nft][_nftId];

        IERC721(_nft).safeTransferFrom(address(this), msg.sender, _nftId);

        emit Withdraw(_nftId, _nft, msg.sender);
    }

    function isActive(address _nft) external view returns (bool) {
        if (nftInfo[_nft].status == uint256(Status.ACTIVE)) {
            return true;
        }

        if (nftInfo[_nft].status == uint256(Status.NOT_ACTIVE)) {
            return false;
        }

        return isReachedThreshold(_nft, nftInfo[_nft].percentageThreshold);
    }

    function isReachedThreshold(address _nft, uint8 _percentage)
        internal
        view
        returns (bool)
    {
        return
            ((ITokenSupplyData(_nft).circulatingSupply() * 100) /
                ITokenSupplyData(_nft).maxSupply()) >= _percentage;
    }
}
