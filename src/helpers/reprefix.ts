
import { bech32 } from "bech32"

export const reprefix = (oldAddress, newPrefix) => {
  // Decode the bech32 address to get the public key hash
  const decoded = bech32.decode(oldAddress);

  // Encode the address with a new prefix
  const newAddress = bech32.encode(newPrefix, decoded.words);

  return newAddress
}