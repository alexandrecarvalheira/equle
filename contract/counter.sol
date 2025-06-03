// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract Counter {
    mapping(address => euint32) public counts;
    euint32 public ONE;
    
    constructor() {
        ONE = FHE.asEuint32(1);
        FHE.allowGlobal(ONE);
    }

    function increment() public {
        counts[msg.sender] = FHE.add(counts[msg.sender], ONE);
        FHE.allowThis(counts[msg.sender]);
        FHE.allowSender(counts[msg.sender]);
    }

    function decrement() public {
        counts[msg.sender] = FHE.sub(counts[msg.sender], ONE);
        FHE.allowThis(counts[msg.sender]);
        FHE.allowSender(counts[msg.sender]);
    }

    function reset(InEuint32 memory value) public {
        counts[msg.sender] = FHE.asEuint32(value);
        FHE.allowThis(counts[msg.sender]);
        FHE.allowSender(counts[msg.sender]);
    }

    function decryptCounter() public {
        FHE.decrypt(counts[msg.sender]);
    }

    function getDecryptedValue() external view returns(uint256) {
        (uint256 value, bool decrypted) = FHE.getDecryptResultSafe(counts[msg.sender]);
        if (!decrypted)
            revert("Value is not ready");

        return value;
    }

    function getEncryptedValue() external view returns(euint32) {
        return counts[msg.sender];
    }       
}