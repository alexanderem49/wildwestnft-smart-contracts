//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, Ownable {
    string private _name;
    string private _symbol;
    string private _baseTokenURI;

    uint256 public currentTokenId = 0;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        _name = name;
        _symbol = symbol;
        _baseTokenURI = baseTokenURI;
    }

    function mint(address _to) public onlyOwner returns (uint256) {
        uint256 newTokenId = currentTokenId;

        _safeMint(_to, currentTokenId);

        currentTokenId++;

        return newTokenId;
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        return
            string(
                abi.encodePacked(
                    _baseTokenURI,
                    Strings.toString(_tokenId),
                    ".json"
                )
            );
    }
}
