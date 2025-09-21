// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

contract EquleNFT is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 public totalSupply = 0;
    string public imgGif = ""; //ipfs img

    struct PlayerStats {
        uint256 totalWins;
        uint256 currentStreak;
        uint256 maxStreak;
        uint256 lastGamePlayed;
    }

    mapping(address => PlayerStats) private playerStats;
    mapping(address => uint256) private playerTokenId;

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
    ) ERC721("Equle Club", "EQCLUB") Ownable(initialOwner) {}

    function mintOrUpdateNFT(
        address player,
        uint256 gameId
    ) external onlyOwner {
        bool hasExistingNFT = balanceOf(player) > 0;

        if (hasExistingNFT) {
            _updatePlayerStats(player, gameId);
            _updateTokenURI(tokenId(player), player);
            emit NFTUpdated(player, tokenId(player), playerStats[player]);
        } else {
            _updatePlayerStats(player, gameId);
            _safeMint(player, ++totalSupply);
            playerTokenId[player] = totalSupply;
            _updateTokenURI(tokenId(player), player);
            emit NFTMinted(player, tokenId(player), playerStats[player]);
        }
    }

    function _updatePlayerStats(address player, uint256 gameId) private {
        PlayerStats storage stats = playerStats[player];

        stats.totalWins++;

        if (gameId - stats.lastGamePlayed == 1) {
            stats.currentStreak++;
        } else {
            stats.currentStreak = 1;
        }

        if (stats.currentStreak > stats.maxStreak) {
            stats.maxStreak = stats.currentStreak;
        }

        stats.lastGamePlayed = gameId;
    }

    function _updateTokenURI(uint256 tokenId, address player) private {
        string memory uri = _generateMetadata(player);
        _setTokenURI(tokenId, uri);
    }

    function _generateMetadata(
        address player
    ) private view returns (string memory) {
        PlayerStats memory stats = playerStats[player];

        string memory json = string.concat(
            "{",
            '"name": "',
            name(),
            " #",
            tokenId(player).toString(),
            '",',
            '"description":"Victory NFT for Equle puzzle game",',
            '"image": "',
            "ipfs://",
            imgGif,
            '",',
            '"attributes":[',
            '{"trait_type":"Total Wins","value":',
            stats.totalWins.toString(),
            "},",
            '{"trait_type":"Current Streak","value":',
            stats.currentStreak.toString(),
            "},",
            '{"trait_type":"Max Streak","value":',
            stats.maxStreak.toString(),
            "}",
            "]",
            "}"
        );

        string memory base64Encoded = Base64.encode(bytes(json));
        return string.concat("data:application/json;base64,", base64Encoded);
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

    // Required overrides
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
