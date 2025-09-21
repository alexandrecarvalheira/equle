// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract EquleNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId = 1;

    struct PlayerStats {
        uint256 totalWins;
        uint256 currentStreak;
        uint256 maxStreak;
    }

    mapping(address => PlayerStats) private playerStats;
    mapping(address => uint256) private playerTokenId;
    mapping(address => uint256) private lastGamePlayed;

    event NFTMinted(
        address indexed player,
        uint256 indexed tokenId,
        PlayerStats stats
    );
    event NFTUpdated(
        address indexed player,
        uint256 indexed tokenId,
        PlayerStats stats
    );

    constructor(
        address initialOwner
    ) ERC721("Equle Champion", "EQCHAMP") Ownable(initialOwner) {}

    function mintOrUpdateNFT(
        address player,
        uint8 attempts
    ) external onlyOwner {
        bool hasExistingNFT = balanceOf(player) > 0;

        if (hasExistingNFT) {
            _updatePlayerStats(player);
            uint256 tokenId = playerTokenId[player];
            _updateTokenURI(tokenId, player);
            emit NFTUpdated(player, tokenId, playerStats[player]);
        } else {
            _updatePlayerStats(player);
            uint256 tokenId = _nextTokenId++;
            playerTokenId[player] = tokenId;
            _safeMint(player, tokenId);
            _updateTokenURI(tokenId, player);
            emit NFTMinted(player, tokenId, playerStats[player]);
        }
    }

    function _updatePlayerStats(address player) private {
        PlayerStats storage stats = playerStats[player];

        stats.totalWins++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.maxStreak) {
            stats.maxStreak = stats.currentStreak;
        }
        if (won) {
            stats.currentStreak = 0;
        }

        lastGamePlayed[player] = block.timestamp;
    }

    function _updateTokenURI(uint256 tokenId, address player) private {
        string memory uri = _generateMetadata(player);
        _setTokenURI(tokenId, uri);
    }

    function _generateMetadata(
        address player
    ) private view returns (string memory) {
        PlayerStats memory stats = playerStats[player];

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    _encode(
                        abi.encodePacked(
                            '{"name":"Equle Champion #',
                            tokenId(player).toString(),
                            '",',
                            '"description":"Victory NFT for Equle puzzle game champion",',
                            '"image":"https://equle.game/images/champion.png",',
                            '"attributes":[',
                            '{"trait_type":"Total Wins","value":',
                            stats.totalWins.toString(),
                            "},",
                            '{"trait_type":"Current Streak","value":',
                            stats.currentStreak.toString(),
                            "},",
                            '{"trait_type":"Max Streak","value":',
                            stats.maxStreak.toString(),
                            "},",
                            "]}"
                        )
                    )
                )
            );
    }

    function tokenId(address player) public view returns (uint256) {
        require(balanceOf(player) > 0, "Player has no NFT");
        return playerTokenId[player];
    }

    function getPlayerStats(
        address player
    ) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    function hasNFT(address player) external view returns (bool) {
        return balanceOf(player) > 0;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://equle.game/metadata/";
    }

    // Base64 encoding for metadata
    function _encode(bytes memory data) private pure returns (string memory) {
        if (data.length == 0) return "";

        string
            memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        uint256 encodedLength = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLength + 32);

        assembly {
            let tablePtr := add(table, 1)
            let dataPtr := add(data, 0x20)
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 0x20)

            for {

            } lt(dataPtr, endPtr) {

            } {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)

                mstore8(
                    resultPtr,
                    mload(add(tablePtr, and(shr(18, input), 0x3F)))
                )
                resultPtr := add(resultPtr, 1)
                mstore8(
                    resultPtr,
                    mload(add(tablePtr, and(shr(12, input), 0x3F)))
                )
                resultPtr := add(resultPtr, 1)
                mstore8(
                    resultPtr,
                    mload(add(tablePtr, and(shr(6, input), 0x3F)))
                )
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }

            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 2), 0x3d)
                mstore8(sub(resultPtr, 1), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }

            mstore(result, encodedLength)
        }

        return result;
    }

    // Required overrides
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
