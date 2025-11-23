import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
 
// @param entropyAddress The address of the entropy contract.
contract Snake is IEntropyConsumer {
  IEntropyV2 public entropy;
  bytes32 public number;
  uint256 public numberAsUint;
 
  constructor() {
    entropy = IEntropyV2(0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c);
  }

  function requestRandomNumber() external payable {
    uint256 fee = entropy.getFeeV2();
    uint64 sequenceNumber = entropy.requestV2{ value: fee }();
  }
 

   function entropyCallback(
    uint64 sequenceNumber,
    address provider,
    bytes32 randomNumber
  ) internal override {
    number = randomNumber;
    numberAsUint = uint256(randomNumber);
  }

  // This method is required by the IEntropyConsumer interface.
  // It returns the address of the entropy contract which will call the callback.
  function getEntropy() internal view override returns (address) {
    return address(entropy);
  }
}

 

