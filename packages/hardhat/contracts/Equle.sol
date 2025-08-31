// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Equle is Ownable {
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

    // doubts on - euint events and AA for ACL


    // for now storing all the guesses and results, improve this later
    struct PlayerGameState {
        euint128[5] equationGuesses;    // Array of all equation attempts (max 5 attempts)
        euint128[5] equationXor;        // Array of all equations xor attempts (max 5 attempts)
        euint16[5] resultGuesses;       // Array of all result attempts (max 5 attempts)
        euint16[5] resultAnswers;       // Array of all result comparisons (max 5 attempts)
        uint8 currentAttempt;          // Current attempt count
        bool hasWon;                   // Whether player has won
    }

    mapping(uint256 => mapping(address => PlayerGameState)) private playerStates;
    // mapping -> gameid -> result (target result as euint for privacy)
    mapping(uint256 => euint16) public gameResult;
    // mapping -> gameid -> equation
    mapping(uint256 => euint128) public gameEquation;
    

    constructor() Ownable(msg.sender) {
        startTimestamp = block.timestamp;
        ZERO = FHE.asEuint16(0);
        ONE = FHE.asEuint16(1);
        TWO = FHE.asEuint16(2);
        FHE.allowThis(ZERO);
        FHE.allowThis(ONE);
        FHE.allowThis(TWO);
    }


    function guess(InEuint128 memory equationGuess, InEuint16 memory resultGuess) public {
        uint256 gameId = getCurrentGameId();
        euint128 eqGuess = FHE.asEuint128(equationGuess);
        euint16 result = FHE.asEuint16(resultGuess);
        uint8 currentAttempt = playerStates[gameId][msg.sender].currentAttempt;

        // check and ++ userr atempt
        require(currentAttempt < 5, "You have reached the maximum number of attempts");
        playerStates[gameId][msg.sender].currentAttempt++;

        require(!playerStates[gameId][msg.sender].hasWon, "You have already won");


        // store the inputs
        playerStates[gameId][msg.sender].equationGuesses[currentAttempt] = eqGuess;
        playerStates[gameId][msg.sender].resultGuesses[currentAttempt] = result;
        //FHE operation 
        playerStates[gameId][msg.sender].equationXor[currentAttempt] = FHE.xor(eqGuess, gameEquation[gameId]);


        // result check
        euint16 resultAnswer = _resultCheck(result, gameResult[gameId]);
        playerStates[gameId][msg.sender].resultAnswers[currentAttempt] = resultAnswer;


        //ACL
        FHE.allowSender(playerStates[gameId][msg.sender].equationXor[currentAttempt]);
        FHE.allowThis(playerStates[gameId][msg.sender].equationXor[currentAttempt]);

        FHE.allowSender(playerStates[gameId][msg.sender].equationGuesses[currentAttempt]);
        FHE.allowThis(playerStates[gameId][msg.sender].equationGuesses[currentAttempt]);

        FHE.allowSender(playerStates[gameId][msg.sender].resultGuesses[currentAttempt]);
        FHE.allowThis(playerStates[gameId][msg.sender].resultGuesses[currentAttempt]);

        FHE.allowSender(playerStates[gameId][msg.sender].resultAnswers[currentAttempt]);
        FHE.allowThis(playerStates[gameId][msg.sender].resultAnswers[currentAttempt]);
    }
    
    function _resultCheck(euint16 userGuess, euint16 targetResult) private returns(euint16 resultAnswer) {
        // lt = 1, eq = 0, gt = 2
        ebool isResultCorrect = FHE.eq(userGuess, targetResult);
        resultAnswer = FHE.select(isResultCorrect, ZERO, FHE.select(FHE.lt(userGuess, targetResult), ONE, TWO));

    }


    // ui should  display finalize button when user get to the correct answer
    function finalizeGame() public {
        uint256 gameId = getCurrentGameId();
        uint8 lastAttempt = playerStates[gameId][msg.sender].currentAttempt - 1;

        FHE.decrypt(playerStates[gameId][msg.sender].equationXor[lastAttempt]);


    }

    function getDecryptedfinalizedEquation() public {
        uint256 gameId = getCurrentGameId();
        uint8 lastAttempt = playerStates[gameId][msg.sender].currentAttempt - 1;

        (uint128 value, bool decrypted) = FHE.getDecryptResultSafe(playerStates[gameId][msg.sender].equationXor[lastAttempt]);
        if (!decrypted)
            revert("Value is not ready");

        uint128 mask = (1 << 20) - 1; // Creates mask 0x000FFFFF (20 bits of 1s)
        uint128 lower20Bits = value & mask;
        playerStates[gameId][msg.sender].hasWon = (lower20Bits == 0);

    }

    //admin functions
    function setGame(uint256 gameId, InEuint128 memory equation, InEuint16 memory result) external onlyOwner {
        gameEquation[gameId] = FHE.asEuint128(equation);
        gameResult[gameId] = FHE.asEuint16(result);
        FHE.allowThis(gameEquation[gameId]);
        FHE.allowThis(gameResult[gameId]);
    }

    function getPlayerAttempts(uint256 gameId, address player) external view returns (uint8) {
      return playerStates[gameId][player].currentAttempt;
    }

    function hasPlayerWon(uint256 gameId, address player) external view returns (bool) {
      return playerStates[gameId][player].hasWon;
    }

    function getCurrentGameId() public view returns (uint256) {
        return ((block.timestamp - startTimestamp) / DAY) + 1;
    }
    
}

