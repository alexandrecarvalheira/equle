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
        require(
            winningAttempt >= 1 && winningAttempt <= 6,
            "Invalid attempt: must be 1-6"
        );
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

    function _updatePlayerStats(
        address player,
        uint256 gameId,
        uint8 winningAttempt
    ) private {
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
        string memory svg = _generateSVG(stats, tokenId(player));

        string memory json = string.concat(
            "{",
            '"name": "',
            name(),
            " #",
            tokenId(player).toString(),
            '",',
            '"description":"Victory NFT for Equle puzzle game. A fully on-chain, dynamic achievement badge that evolves with your stats.",',
            '"image": "data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
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


    function _generateSVG(
        PlayerStats memory stats,
        uint256 nftTokenId
    ) private pure returns (string memory) {
        string memory svg = string.concat(
            '<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">',
            "<defs>",
            '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#011623;stop-opacity:1" />',
            '<stop offset="100%" style="stop-color:#002033;stop-opacity:1" />',
            "</linearGradient>",
            '<linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">',
            '<stop offset="0%" style="stop-color:#0AD9DC;stop-opacity:0.2" />',
            '<stop offset="100%" style="stop-color:#0AD9DC;stop-opacity:0" />',
            "</linearGradient>",
            "</defs>",
            '<rect width="500" height="500" fill="url(#bg)" />',
            '<rect width="500" height="500" fill="url(#accent)" />',
            '<rect x="10" y="10" width="480" height="480" fill="none" stroke="#0AD9DC" stroke-width="2" rx="15" />',
            '<text x="250" y="50" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#0AD9DC" text-anchor="middle">EQULE CLUB</text>',
            '<text x="250" y="75" font-family="Arial, sans-serif" font-size="16" fill="#ededed" text-anchor="middle">#',
            nftTokenId.toString(),
            "</text>",
            '<text x="250" y="140" font-family="Arial, sans-serif" font-size="14" fill="#ededed" text-anchor="middle" opacity="0.7">TOTAL WINS</text>',
            '<text x="250" y="170" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#0AD9DC" text-anchor="middle">',
            stats.totalWins.toString(),
            "</text>",
            '<text x="150" y="215" font-family="Arial, sans-serif" font-size="12" fill="#ededed" text-anchor="middle" opacity="0.7">CURRENT STREAK</text>',
            '<text x="150" y="240" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#1CE07E" text-anchor="middle">',
            stats.currentStreak.toString(),
            "</text>",
            '<text x="350" y="215" font-family="Arial, sans-serif" font-size="12" fill="#ededed" text-anchor="middle" opacity="0.7">MAX STREAK</text>',
            '<text x="350" y="240" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#eab308" text-anchor="middle">',
            stats.maxStreak.toString(),
            "</text>",
            '<text x="250" y="280" font-family="Arial, sans-serif" font-size="14" fill="#ededed" text-anchor="middle" opacity="0.7">GUESS DISTRIBUTION</text>'
        );

        // Distribution bars
        if (stats.totalWins == 0) {
            svg = string.concat(
                svg,
                '<text x="250" y="330" font-family="Arial, sans-serif" font-size="12" fill="#ededed" text-anchor="middle" opacity="0.5">No games played yet</text>'
            );
        } else {
            for (uint256 i = 0; i < 6; i++) {
                uint256 percentage = (stats.guessDistribution[i] * 100) / stats.totalWins;
                uint256 barWidth = (percentage * 180) / 100;
                uint256 yPos = 300 + (i * 20);

                svg = string.concat(
                    svg,
                    '<text x="80" y="',
                    (yPos + 12).toString(),
                    '" font-family="Arial, sans-serif" font-size="12" fill="#ededed">',
                    (i + 1).toString(),
                    '</text><rect x="100" y="',
                    yPos.toString(),
                    '" width="180" height="14" fill="#1D4748" opacity="0.3" rx="2" />'
                );

                if (barWidth > 0) {
                    svg = string.concat(
                        svg,
                        '<rect x="100" y="',
                        yPos.toString(),
                        '" width="',
                        barWidth.toString(),
                        '" height="14" fill="#0AD9DC" rx="2" />'
                    );
                }

                svg = string.concat(
                    svg,
                    '<text x="290" y="',
                    (yPos + 11).toString(),
                    '" font-family="Arial, sans-serif" font-size="11" fill="#ededed" opacity="0.8">',
                    percentage.toString(),
                    '%</text>'
                );
            }
        }

        return string.concat(svg, "</svg>");
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
