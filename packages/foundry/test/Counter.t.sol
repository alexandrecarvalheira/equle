// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

//FHE Imports
import {FHE,InEuint32, euint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {CoFheTest } from "@fhenixprotocol/cofhe-foundry-mocks/CoFheTest.sol";

contract CounterTest is CoFheTest(true) {
    Counter private counter;
    address private user = makeAddr("user");
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");

    function setUp() public {
        counter = new Counter();
    }

    function test_Increment() public {

        vm.prank(user);

        assertHashValue(counter.count(), 0);


        counter.increment();
        assertHashValue(counter.count(), 1);
    }

    function test_Decrement() public {
        vm.prank(user);
        counter.increment();

        counter.decrement();
        assertHashValue(counter.count(), 0);
    }

    function test_Reset(uint32 n) public {

        InEuint32 memory value = createInEuint32(n, user);
        vm.prank(user);
        counter.reset(value);

        assertHashValue(counter.count(), n);
    }

    function test_DecryptCounter() public {
        vm.prank(user);
        counter.increment();
        counter.decryptCounter(); // Add this line to initiate decryption
        vm.warp(block.timestamp + 11);
        uint256 value = counter.getDecryptedValue();
        assertEq(value,1);

    }
    
}
