// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";


contract Equale {
    uint256 public immutable startTimestamp;
    uint256 public constant DAY = 1 days;

    // mapping: gameid -> player -> guess (storing current attempt)
    mapping(uint256 => mapping(address => uint256)) public gamePlayerGuess;
    
    // mapping gameid -> player -> won
    mapping(uint256 => mapping(address => bool)) public gamePlayerWon;
    
    // mapping -> gameid -> result (target result as euint for privacy)
    mapping(uint256 => euint32) public gameResult;
    
    // mapping -> gameid -> equation
    // [0] and [4] cant be operators(< 10)
    // cant have adjacent operators
    // do we need to check that on the contract or just on the frontend is enough?
    // Each element is 0-13 (digits 0-9, operators +,-,*,/)
    mapping(uint256 => euint8[5]) public gameEquation;
    
    // mapping -> player -> score
    mapping(address => uint256) public playerScore;

    // the trick part will be the green and yello tiles match
    // but also if we having a mpc kinda of mechanics where the players contribute to the nextday result, how to make sure the equation matchs the result?

    constructor() {
        startTimestamp = block.timestamp;
    }

    /**
     * @dev Returns the current game ID based on days elapsed since deployment
     * @return The current game ID (0-indexed, increments daily)
     */
    function getCurrentGameId() public view returns (uint256) {
        return ((block.timestamp - startTimestamp) / DAY) + 1;
    }
}