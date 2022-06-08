//SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, Ownable {
    string public baseTokenURI;
    uint256 public currentTokenId = 0;

    mapping(address => bool) private _isWhitelisted;

    event PermanentURI(string _value, uint256 indexed _id);
    event AddedToWhitelist(address[] users);
    event RemovedFromWhitelist(address[] users);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_,
        address[] memory users_
    ) ERC721(name_, symbol_) {
        baseTokenURI = baseTokenURI_;
        _addWhitelists(users_);
    }

    function mint(address _to) public onlyOwner returns (uint256) {
        uint256 newTokenId = currentTokenId;
        _safeMint(_to, currentTokenId);
        currentTokenId++;

        emit PermanentURI(tokenURI(newTokenId), newTokenId);
        return newTokenId;
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

    function _addWhitelists(address[] memory users) internal onlyOwner {
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
}
