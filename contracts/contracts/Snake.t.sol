// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Snake} from "./Snake.sol";
import {Test} from "forge-std/Test.sol";

contract SnakeTest is Test {
  Snake snake;

  function setUp() public {
    snake = new Snake();
  }

  function test_InitialValue() public view {
    require(snake.x() == 0, "Initial value should be 0");
  }

  function testFuzz_Inc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      snake.inc();
    }
    require(snake.x() == x, "Value after calling inc x times should be x");
  }

  function test_IncByZero() public {
    vm.expectRevert();
    snake.incBy(0);
  }
}
