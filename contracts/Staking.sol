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

    mapping(address => mapping(uint256 => address)) public tokenOwner;
    mapping(address => Stake) public stakeInfo;
    mapping(address => Nft) public nftInfo;

    enum Status {
        NOT_ACTIVE,
        ACTIVE,
        WAIT
    }

    struct Stake {
        uint256 tokenCount;
        uint256 startDate;
    }

    struct Nft {
        uint8 percentageThreshold;
        uint256 status;
    }

    event NftAdded(address indexed nftContract);

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

        _claim(_from);

        Stake storage stake = stakeInfo[_from];

        stake.tokenCount++;
        stake.startDate = block.timestamp;

        tokenOwner[msg.sender][_tokenId] = _from;

        emit ERC721Received(_tokenId, msg.sender, _from);

        return this.onERC721Received.selector;
    }

    function addNFT(address _nft, uint8 _percentageThreshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            nftInfo[_nft].status == uint256(Status.NOT_ACTIVE),
            "Staking: already added"
        );

        require(_nft != address(0), "Staking: zero address");

        nftInfo[_nft].status = isReachedThreshold(_nft, _percentageThreshold)
            ? uint256(Status.ACTIVE)
            : uint256(Status.WAIT);

        nftInfo[_nft].percentageThreshold = _percentageThreshold;

        emit NftAdded(_nft);
    }

    function claim() external {
        _claim(msg.sender);
    }

    function _claim(address _to) internal {
        Stake storage stake = stakeInfo[_to];
        uint256 startDate = stake.startDate;

        if (startDate == 0) {
            return;
        }

        uint256 payoutAmount = (block.timestamp - startDate) *
            stake.tokenCount *
            1653439153935;

        stake.startDate = block.timestamp;
        goldenNugget.mint(_to, payoutAmount);

        emit Claim(_to, payoutAmount);
    }

    function withdrawNft(uint256 _nftId, address _nft) external {
        require(
            tokenOwner[_nft][_nftId] == msg.sender,
            "Staking: not owner NFT"
        );

        _claim(msg.sender);

        stakeInfo[msg.sender].tokenCount--;

        delete tokenOwner[_nft][_nftId];

        IERC721(_nft).safeTransferFrom(address(this), msg.sender, _nftId);

        emit Withdraw(_nftId, _nft, msg.sender);
    }

    function isActive(address _nft) external view returns (bool) {
        Nft memory nft = nftInfo[_nft];

        if (nft.status == uint256(Status.ACTIVE)) {
            return true;
        }

        if (nft.status == uint256(Status.NOT_ACTIVE)) {
            return false;
        }

        return isReachedThreshold(_nft, nft.percentageThreshold);
    }

    function isReachedThreshold(address _nft, uint8 _percentage)
        internal
        view
        returns (bool)
    {
        ITokenSupplyData token = ITokenSupplyData(_nft);

        return
            (token.circulatingSupply() * 100) / token.maxSupply() >=
            _percentage;
    }
}
