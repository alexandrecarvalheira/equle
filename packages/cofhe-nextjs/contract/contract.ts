export const CONTRACT_ADDRESS = "0xd2E63E2e3e90AD753196301F59319BAc370F7d0F";

export const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
    ],
    name: "DecryptionNotReady",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
    ],
    name: "GameAlreadyWon",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint8",
        name: "got",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "expected",
        type: "uint8",
      },
    ],
    name: "InvalidEncryptedInput",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint8",
        name: "currentAttempts",
        type: "uint8",
      },
    ],
    name: "MaxAttemptsReached",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
    ],
    name: "NoAttemptsYet",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "int32",
        name: "value",
        type: "int32",
      },
    ],
    name: "SecurityZoneOutOfBounds",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "won",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "totalAttempts",
        type: "uint8",
      },
    ],
    name: "GameCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "attemptNumber",
        type: "uint8",
      },
    ],
    name: "GameFinalized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "attemptNumber",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "euint128",
        name: "lastEquationXor",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "euint16",
        name: "resultFeedback",
        type: "uint256",
      },
    ],
    name: "GuessSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "DAY",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DecryptfinalizedEquation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_ATTEMPTS",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ONE",
    outputs: [
      {
        internalType: "euint16",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TWO",
    outputs: [
      {
        internalType: "euint16",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ZERO",
    outputs: [
      {
        internalType: "euint16",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "finalizeGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "gameEquation",
    outputs: [
      {
        internalType: "euint128",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "gameResult",
    outputs: [
      {
        internalType: "euint16",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentGameId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDecryptedfinalizedEquation",
    outputs: [
      {
        internalType: "uint128",
        name: "",
        type: "uint128",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        internalType: "uint8",
        name: "attemptNumber",
        type: "uint8",
      },
    ],
    name: "getPlayerAttempt",
    outputs: [
      {
        internalType: "euint128",
        name: "equationGuess",
        type: "uint256",
      },
      {
        internalType: "euint16",
        name: "resultGuess",
        type: "uint256",
      },
      {
        internalType: "euint128",
        name: "equationXor",
        type: "uint256",
      },
      {
        internalType: "euint16",
        name: "resultFeedback",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "getPlayerAttempts",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "getPlayerEquationXor",
    outputs: [
      {
        internalType: "euint128",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "getPlayerGameState",
    outputs: [
      {
        internalType: "uint8",
        name: "currentAttempt",
        type: "uint8",
      },
      {
        internalType: "bool",
        name: "hasWon",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "getPlayerLastEquationGuess",
    outputs: [
      {
        internalType: "euint128",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "getPlayerLastResultGuess",
    outputs: [
      {
        internalType: "euint16",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "ctHash",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "securityZone",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "utype",
            type: "uint8",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct InEuint128",
        name: "equationGuess",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "ctHash",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "securityZone",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "utype",
            type: "uint8",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct InEuint16",
        name: "resultGuess",
        type: "tuple",
      },
    ],
    name: "guess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "hasPlayerWon",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "ctHash",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "securityZone",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "utype",
            type: "uint8",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct InEuint128",
        name: "equation",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "ctHash",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "securityZone",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "utype",
            type: "uint8",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct InEuint16",
        name: "result",
        type: "tuple",
      },
    ],
    name: "setGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "startTimestamp",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
