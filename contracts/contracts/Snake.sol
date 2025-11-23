import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
 
// @param entropyAddress The address of the entropy contract.
contract Snake is IEntropyConsumer {
  IEntropyV2 public entropy;
  bytes32 public randomNumber;
 
  constructor(address entropyAddress) {
    entropy = IEntropyV2(entropyAddress);
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
    randomNumber = randomNumber;
  }
 
  // This method is required by the IEntropyConsumer interface.
  // It returns the address of the entropy contract which will call the callback.
  function getEntropy() internal view override returns (address) {
    return address(entropy);
  }
}

 

