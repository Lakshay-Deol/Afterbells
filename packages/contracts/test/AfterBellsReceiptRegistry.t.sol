// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AfterBellsReceiptRegistry.sol";

contract AfterBellsReceiptRegistryTest is Test {
    AfterBellsReceiptRegistry reg;

    function setUp() public {
        reg = new AfterBellsReceiptRegistry();
    }

    function test_commit_emits_event() public {
        bytes32 r = keccak256("receipt");
        bytes32 p = keccak256("policy");
        bytes32 i = keccak256("intent");
        bytes32 t = keccak256("tx");
        vm.expectEmit(true, true, true, true);
        emit AfterBellsReceiptRegistry.ReceiptCommitted(r, p, i, address(this), t, block.timestamp);
        reg.commit(r, p, i, t);
        assertTrue(reg.isCommitted(r));
        assertEq(reg.committedAt(r), block.timestamp);
    }

    function test_reverts_on_duplicate() public {
        bytes32 r = keccak256("receipt");
        reg.commit(r, bytes32(0), bytes32(0), bytes32(0));
        vm.expectRevert(abi.encodeWithSelector(AfterBellsReceiptRegistry.AlreadyCommitted.selector, r));
        reg.commit(r, bytes32(0), bytes32(0), bytes32(0));
    }

    function test_reverts_on_zero_receipt_hash() public {
        vm.expectRevert(AfterBellsReceiptRegistry.ZeroHash.selector);
        reg.commit(bytes32(0), bytes32(0), bytes32(0), bytes32(0));
    }

    function testFuzz_distinct_hashes_committable(bytes32 r) public {
        vm.assume(r != bytes32(0));
        reg.commit(r, bytes32(uint256(1)), bytes32(uint256(2)), bytes32(uint256(3)));
        assertTrue(reg.isCommitted(r));
    }
}
