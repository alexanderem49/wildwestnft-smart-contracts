//SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, Ownable {
    string public baseTokenURI;
    uint256 public currentTokenId = 0;

    event PermanentURI(string _value, uint256 indexed _id);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_
    ) ERC721(name_, symbol_) {
        baseTokenURI = baseTokenURI_;
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
}
