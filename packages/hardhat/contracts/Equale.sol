// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";


contract Equale {
    uint256 public immutable startTimestamp;
    uint256 public constant DAY = 1 days;
    euint8 public ZERO;
    euint8 public ONE;
    euint8 public TWO;

    // mapping: gameid -> player -> guess (storing current attempt)
    mapping(uint256 => mapping(address => euint8[5])) public PlayerGuess;
    
    // mapping gameid -> player -> won
    mapping(uint256 => mapping(address => bool)) public PlayerWon;
    
    // mapping -> gameid -> result (target result as euint for privacy)
    mapping(uint256 => euint16) public gameResult;
    
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
        ZERO = FHE.asEuint8(0);
        ONE = FHE.asEuint8(1);
        TWO = FHE.asEuint8(2);
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

    function guess(InEuint8[5] calldata equationGuess,InEuint16 calldata resultGuess) public returns(euint8[5] memory EqAnswer, euint8 resultAnswer) {
        uint256 gameId = getCurrentGameId();
        euint16 result = FHE.asEuint16(resultGuess);
        euint8[5] memory eqGuess;


        //equation guess loop
        // green = 0, orange = 1, grey = 2
        for(uint256 i = 0; i < 5; i++){
            eqGuess[i] = FHE.asEuint8(equationGuess[i]);

            ebool isGreen = FHE.eq(eqGuess[i], gameEquation[gameId][i]);
            ebool isOrange = _isOrange(eqGuess[i]);
            EqAnswer[i] = FHE.select(isGreen, ZERO, FHE.select(isOrange, ONE, TWO));
        }
        //result compare
        // lt = 1, eq = 0, gt = 2
        ebool isResultCorrect = FHE.eq(result, gameResult[gameId]);
        resultAnswer = FHE.select(isResultCorrect, ZERO, FHE.select(FHE.lt(result, gameResult[gameId]), ONE, TWO));
    //how to check if the equation is correct? how to check if all tiles are green? maybe use zamas approach of modular ?
    }



    function _isOrange(euint8 tileGuess) private returns(ebool){
        uint256 gameId = getCurrentGameId();
        ebool found = FHE.eq(tileGuess, gameEquation[gameId][0]);
        for(uint256 i = 1; i < 5; i++){
            ebool equal = FHE.eq(tileGuess, gameEquation[gameId][i]);
            found = FHE.or(found, equal);
        }
        return found;
    }
}

