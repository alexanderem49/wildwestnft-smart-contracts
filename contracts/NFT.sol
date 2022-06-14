//SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "./interface/ITokenSupplyData.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, Ownable, ITokenSupplyData {
    using Address for address payable;

    string public baseTokenURI;
    address public fundingWallet;
    uint256 public deadline;
    uint256 public constant DISCOUNT_PRICE = 400000000000000000;
    uint256 public constant BASE_PRICE = 500000000000000000;

    uint256 private totalSupply = 0;
    uint256 private constant MAX_SUPPLY = 10005;

    mapping(address => bool) private _isWhitelisted;

    event PermanentURI(string _value, uint256 indexed _id);
    event AddedToWhitelist(address[] users);
    event RemovedFromWhitelist(address[] users);
    event Bought(
        uint256 indexed _tokenId,
        address indexed _buyer,
        uint256 _price
    );

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_,
        address fundingWallet_,
        uint256 deadline_,
        address[] memory users_
    ) ERC721(name_, symbol_) {
        baseTokenURI = baseTokenURI_;
        fundingWallet = fundingWallet_;
        deadline = deadline_;
        _addWhitelists(users_);
    }

    function priceFor(address _user) public view returns (uint256) {
        if (block.timestamp < deadline || _isWhitelisted[_user]) {
            return DISCOUNT_PRICE;
        }

        return BASE_PRICE;
    }

    function buy(uint256 _tokenId) external payable {
        require(_tokenId >= 1 && _tokenId <= MAX_SUPPLY, "NFT: token !exists");

        uint256 price = priceFor(msg.sender);
        require(msg.value == price, "NFT: invalid value");

        payable(fundingWallet).sendValue(msg.value);
        _safeMint(msg.sender, _tokenId);

        totalSupply++;

        emit Bought(_tokenId, msg.sender, price);
        emit PermanentURI(tokenURI(_tokenId), _tokenId);
    }

    function setFundingWallet(address _fundingWallet) external onlyOwner {
        require(_fundingWallet != address(0), "NFT: wallet is zero address");
        fundingWallet = _fundingWallet;
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(_tokenId), "ERC721Metadata: token !exists");

        return
            string(
                abi.encodePacked(
                    baseTokenURI,
                    Strings.toString(_tokenId),
                    ".json"
                )
            );
    }

    function addWhitelists(address[] calldata users) external onlyOwner {
        _addWhitelists(users);
    }

    function removeWhitelists(address[] calldata users) external onlyOwner {
        uint256 length = users.length;
        require(length <= 256, "NFT: whitelist too long");
        for (uint256 i = 0; i < length; i++) {
            address user = users[i];
            require(user != address(0), "NFT: user is zero address");
            require(_isWhitelisted[user] == true, "NFT: user !whitelisted");
            _isWhitelisted[user] = false;
        }

        emit RemovedFromWhitelist(users);
    }

    function isWhitelisted(address user) external view returns (bool) {
        return _isWhitelisted[user];
    }

    function maxSupply() external pure override returns (uint256) {
        return MAX_SUPPLY;
    }

    function circulatingSupply() external view override returns (uint256) {
        return totalSupply;
    }

    function _addWhitelists(address[] memory users) private onlyOwner {
        uint256 length = users.length;
        require(length <= 256, "NFT: whitelist too long!");
        for (uint256 i = 0; i < length; i++) {
            address user = users[i];
            require(user != address(0), "NFT: user is zero address");
            require(_isWhitelisted[user] == false, "NFT: user whitelisted");
            _isWhitelisted[user] = true;
        }

        emit AddedToWhitelist(users);
    }
}
