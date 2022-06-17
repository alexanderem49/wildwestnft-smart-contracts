//SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

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
    event AddedToWhitelist(address[] _users);
    event RemovedFromWhitelist(address[] _users);
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
        address[] memory whitelistedUsers_,
        address[] memory giftedUsers_
    ) ERC721(name_, symbol_) {
        baseTokenURI = baseTokenURI_;
        fundingWallet = fundingWallet_;
        deadline = deadline_;
        _addWhitelists(whitelistedUsers_);

        uint8 userCount = 0;

        for (uint256 i = 10001; i <= 10005; i++) {
            address user = giftedUsers_[userCount];
            // Mints token id of collection nft by user.
            _safeMint(user, i);
            // Increases the total supply of purchases.
            totalSupply++;
            userCount++;

            emit Bought(i, user, 0);
            emit PermanentURI(tokenURI(i), i);
        }
    }

    /**
     * @notice Returns the purchase price for the user.
     * @param _user The user address.
     * @return Price for the user.
     */
    function priceFor(address _user) public view returns (uint256) {
        // Before deadline any user should be able to buy NFT at a discount. After deadline any whitelisted user should able to buy NFT at a discount, no matter what time it is. But any non-whitelisted user should be able to buy NFT at the base price.
        if (block.timestamp < deadline || _isWhitelisted[_user]) {
            return DISCOUNT_PRICE;
        }

        return BASE_PRICE;
    }

    /**
     * @notice Buys the token by id.
     * @param _tokenId The token id of collection nft.
     */
    function buy(uint256 _tokenId) external payable {
        // Limits of collection nft.
        require(_tokenId >= 1 && _tokenId <= MAX_SUPPLY, "NFT: token !exists");

        uint256 price = priceFor(msg.sender);
        require(msg.value == price, "NFT: invalid value");
        // Transfers a payment from a user to a funding wallet.
        payable(fundingWallet).sendValue(msg.value);
        // Mints token id of collection nft by user.
        _safeMint(msg.sender, _tokenId);
        // Increases the total supply of purchases.
        totalSupply++;

        emit Bought(_tokenId, msg.sender, price);
        emit PermanentURI(tokenURI(_tokenId), _tokenId);
    }

    /**
     * @notice Sets a funding wallet to receive payments from users' purchases.
     * @param _fundingWallet The user address.
     */
    function setFundingWallet(address _fundingWallet) external onlyOwner {
        require(_fundingWallet != address(0), "NFT: wallet is zero address");
        fundingWallet = _fundingWallet;
    }

    /**
     * @notice Returns the token uri by id.
     * @param _tokenId The token id of collection.
     * @return tokenURI.
     */
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

    /**
     * @notice Adds users to whitelist.
     * @param _users The array of user address.
     */
    function addWhitelists(address[] calldata _users) external onlyOwner {
        _addWhitelists(_users);
    }

    /**
     * @notice Removed users from whitelist.
     * @param _users The array of user address.
     */
    function removeWhitelists(address[] calldata _users) external onlyOwner {
        uint256 length = _users.length;
        require(length <= 256, "NFT: whitelist too long");
        for (uint256 i = 0; i < length; i++) {
            address user = _users[i];
            require(user != address(0), "NFT: user is zero address");
            require(_isWhitelisted[user] == true, "NFT: user !whitelisted");
            _isWhitelisted[user] = false;
        }

        emit RemovedFromWhitelist(_users);
    }

    /**
     * @notice Checks the user's address for the fact that it is whitelisted or not.
     * @param _user The user address.
     * @return Status if user's address is whitelisted or not.
     */
    function isWhitelisted(address _user) external view returns (bool) {
        return _isWhitelisted[_user];
    }

    /**
     * @notice Returns maximum amount of tokens available to buy on this contract.
     * @return Max supply of tokens.
     */
    function maxSupply() external pure override returns (uint256) {
        return MAX_SUPPLY;
    }

    /**
     * @notice Returns amount of tokens that are minted and sold.
     * @return Circulating supply of tokens.
     */
    function circulatingSupply() external view override returns (uint256) {
        return totalSupply;
    }

    /**
     * @notice Adds users to whitelist.
     * @param _users The array of user address.
     */
    function _addWhitelists(address[] memory _users) private onlyOwner {
        uint256 length = _users.length;
        require(length <= 256, "NFT: whitelist too long!");
        for (uint256 i = 0; i < length; i++) {
            address user = _users[i];
            require(user != address(0), "NFT: user is zero address");
            require(_isWhitelisted[user] == false, "NFT: user whitelisted");
            _isWhitelisted[user] = true;
        }

        emit AddedToWhitelist(_users);
    }
}
