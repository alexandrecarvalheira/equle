// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title IERC5192
 * @dev Interface for ERC-5192: Minimal Soulbound NFTs
 * See https://eips.ethereum.org/EIPS/eip-5192
 */
interface IERC5192 {
    /// @notice Emitted when the locking status is changed to locked.
    event Locked(uint256 tokenId);
    /// @notice Emitted when the locking status is changed to unlocked.
    event Unlocked(uint256 tokenId);
    /// @notice Returns the locking status of an Soulbound Token
    /// @param tokenId The identifier for a token.
    function locked(uint256 tokenId) external view returns (bool);
}

contract EquleNFT is ERC721, ERC721URIStorage, Ownable, IERC5192 {
    using Strings for uint256;

    error TokenIsSoulbound();

    uint256 public totalSupply = 0;
    string public imgGif = ""; //ipfs img

    struct PlayerStats {
        uint256 totalWins;
        uint256 currentStreak;
        uint256 maxStreak;
        uint256 lastGamePlayed;
        uint256[6] guessDistribution; // Index 0 = 1 guess, Index 5 = 6 guesses
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
        uint256 gameId,
        uint8 winningAttempt
    ) external onlyOwner {
        require(winningAttempt >= 1 && winningAttempt <= 6, "Invalid attempt: must be 1-6");
        bool hasExistingNFT = balanceOf(player) > 0;

        if (hasExistingNFT) {
            _updatePlayerStats(player, gameId, winningAttempt);
            _updateTokenURI(tokenId(player), player);
            emit NFTUpdated(player, tokenId(player), playerStats[player]);
        } else {
            _updatePlayerStats(player, gameId, winningAttempt);
            _safeMint(player, ++totalSupply);
            playerTokenId[player] = totalSupply;
            _updateTokenURI(tokenId(player), player);
            emit Locked(totalSupply);
            emit NFTMinted(player, tokenId(player), playerStats[player]);
        }
    }

    function _updatePlayerStats(address player, uint256 gameId, uint8 winningAttempt) private {
        PlayerStats storage stats = playerStats[player];

        stats.totalWins++;
        stats.guessDistribution[winningAttempt - 1]++;

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

    function _formatGuessDistribution(
        uint256[6] memory distribution,
        uint256 totalWins
    ) private pure returns (string memory) {
        if (totalWins == 0) return "0,0,0,0,0,0";

        string memory result = "";
        for (uint256 i = 0; i < 6; i++) {
            uint256 percentage = (distribution[i] * 100) / totalWins;
            result = string.concat(result, percentage.toString());
            if (i < 5) {
                result = string.concat(result, ",");
            }
        }
        return result;
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
            "},",
            '{"trait_type":"Guess Distribution","value":"',
            _formatGuessDistribution(stats.guessDistribution, stats.totalWins),
            '"}',
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

    /// @notice Returns the locking status of a Soulbound Token
    /// @dev All tokens are permanently locked (non-transferable)
    /// @param tokenId The identifier for a token
    /// @return true - all tokens are soulbound
    function locked(uint256 tokenId) external view override returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return true;
    }

    // Required overrides
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0))
        // Block all transfers (from != address(0) && to != address(0))
        // Allow burning if needed (to == address(0))
        if (from != address(0) && to != address(0) && from != to) {
            revert TokenIsSoulbound();
        }

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
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
