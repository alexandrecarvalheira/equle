export const CONTRACT_ADDRESS = {
    "11155111": "0x0D719dd073f4B3e36D0D263F4bb76F9B7E46D0c2",
    "421614": "0x83d6d706b9A597EF43c487e5E50c25b0Aa131b8a",
}

export const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "got",
                "type": "uint8"
            },
            {
                "internalType": "uint8",
                "name": "expected",
                "type": "uint8"
            }
        ],
        "name": "InvalidEncryptedInput",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "int32",
                "name": "value",
                "type": "int32"
            }
        ],
        "name": "SecurityZoneOutOfBounds",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ONE",
        "outputs": [
            {
                "internalType": "euint32",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "counts",
        "outputs": [
            {
                "internalType": "euint32",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decrement",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decryptCounter",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getDecryptedValue",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getEncryptedValue",
        "outputs": [
            {
                "internalType": "euint32",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "increment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "ctHash",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint8",
                        "name": "securityZone",
                        "type": "uint8"
                    },
                    {
                        "internalType": "uint8",
                        "name": "utype",
                        "type": "uint8"
                    },
                    {
                        "internalType": "bytes",
                        "name": "signature",
                        "type": "bytes"
                    }
                ],
                "internalType": "struct InEuint32",
                "name": "value",
                "type": "tuple"
            }
        ],
        "name": "reset",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];