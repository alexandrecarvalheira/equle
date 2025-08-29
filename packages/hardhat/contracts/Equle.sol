// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";


contract Equle {
    uint256 public immutable startTimestamp;
    uint256 public constant DAY = 1 days;
    euint16 public ZERO;
    euint16 public ONE;
    euint16 public TWO;


    //'0'..'9' -> 0..9, '+'->10, '-'->11, '*'->12, '/'->13
    //'0':0000 '1':0001 '2':0010 '3':0011 '4':0100 '5':0101 '6':0110 '7':0111
    //'8':1000 '9':1001 '+':1010 '-':1011 '*':1100 '/':1101

    //     [127...100][99...80][79...60][59...40][39...20][19...0]
    //       unused     rot4     rot3     rot2     rot1     rot0

    struct PlayerGameState {
        euint128[] equationGuesses;    // Array of all equation attempts
        euint128[] equationXor;        // Array of all equations xor attempts
        euint16[] resultGuesses;        // Array of all result attempts (matches equationGuesses)
        uint8 currentAttempt;         // Current attempt count
        ebool hasWon;                    // Whether player has won
    }

    mapping(uint256 => mapping(address => PlayerGameState)) public playerStates;
    
    
    // mapping -> gameid -> result (target result as euint for privacy)
    mapping(uint256 => euint16) public gameResult;
    
    // mapping -> gameid -> equation
    mapping(uint256 => euint128) public gameEquation;
    

    constructor() {
        startTimestamp = block.timestamp;
        ZERO = FHE.asEuint16(0);
        ONE = FHE.asEuint16(1);
        TWO = FHE.asEuint16(2);
        FHE.allowThis(ZERO);
        FHE.allowThis(ONE);
        FHE.allowThis(TWO);
    }

    /**
     * @dev Returns the current game ID based on days elapsed since deployment
     * @return The current game ID (0-indexed, increments daily)
     */
    function getCurrentGameId() public view returns (uint256) {
        return ((block.timestamp - startTimestamp) / DAY) + 1;
    }

    function guess(InEuint128 memory equationGuess, InEuint16 memory resultGuess) public returns(euint16 resultAnswer) {
        uint256 gameId = getCurrentGameId();
        euint128 eqGuess = FHE.asEuint128(equationGuess);
        euint16 result = FHE.asEuint16(resultGuess);

        // check and ++ userr atempt
        require(playerStates[gameId][msg.sender].currentAttempt < 5, "You have reached the maximum number of attempts");
        playerStates[gameId][msg.sender].currentAttempt++;

        // store the equation xor
        playerStates[gameId][msg.sender].equationXor[playerStates[gameId][msg.sender].currentAttempt] = FHE.xor(eqGuess, gameEquation[gameId]);

        // to check if won, compare if  equationXor 0-19bits == 0;

        // Extract the lower 20 bits (0-19) of the XOR result
        euint128 mask = FHE.asEuint128((1 << 20) - 1); // Creates mask 0x000FFFFF (20 bits of 1s)
        euint128 lower20Bits = FHE.and(playerStates[gameId][msg.sender].equationXor[playerStates[gameId][msg.sender].currentAttempt], mask);
        

        // Check if player has won (all lower 20 bits are 0)
         playerStates[gameId][msg.sender].hasWon = FHE.eq(lower20Bits, FHE.asEuint128(0));

        
        // orange and grey can be all compared offchain(CTF on yellow values)


        //work on the result guess
        playerStates[gameId][msg.sender].resultGuesses[playerStates[gameId][msg.sender].currentAttempt] = result;
        // lt = 1, eq = 0, gt = 2
        ebool isResultCorrect = FHE.eq(result, gameResult[gameId]);
        resultAnswer = FHE.select(isResultCorrect, ZERO, FHE.select(FHE.lt(result, gameResult[gameId]), ONE, TWO));


        //ACL
        FHE.allowSender(playerStates[gameId][msg.sender].equationXor[playerStates[gameId][msg.sender].currentAttempt]);
        FHE.allowSender(playerStates[gameId][msg.sender].hasWon);
    }
    
}

