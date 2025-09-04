//'0'..'9' -> 0..9, '+'->10, '-'->11, '*'->12, '/'->13
//'0':0000 '1':0001 '2':0010 '3':0011 '4':0100 '5':0101 '6':0110 '7':0111
//'8':1000 '9':1001 '+':1010 '-':1011 '*':1100 '/':1101

//     [127...100][99...80][79...60][59...40][39...20][19...0]
//       unused     rot4     rot3     rot2     rot1     rot0

function equationToBits(equation: string): bigint {
  // Character to 4-bit binary string mapping (matching the comments)
  const charToBinary: { [key: string]: string } = {
    "0": "0000",
    "1": "0001",
    "2": "0010",
    "3": "0011",
    "4": "0100",
    "5": "0101",
    "6": "0110",
    "7": "0111",
    "8": "1000",
    "9": "1001",
    "+": "1010",
    "-": "1011",
    "*": "1100",
    "/": "1101",
  };

  let binaryString = "";

  // Process each character in reverse order (rot0 is rightmost)
  for (let i = equation.length - 1; i >= 0; i--) {
    const char = equation[i];
    const binaryValue = charToBinary[char];
    binaryString += binaryValue;
  }

  // Convert binary string to BigInt (parsing as actual binary)
  return BigInt("0b" + binaryString);
}

function bitsToEquation(bits: bigint): string {
  // 4-bit value to character mapping
  const valueToChar = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "-",
    "*",
    "/",
  ];

  // Convert BigInt to binary string and pad to 20 bits
  const binaryString = bits.toString(2).padStart(20, "0");

  let result = "";

  // Process 4-bit chunks from left to right
  for (let i = 0; i < binaryString.length; i += 4) {
    const chunk = binaryString.slice(i, i + 4);
    const value = parseInt(chunk, 2); // Convert binary chunk to decimal

    if (value < valueToChar.length) {
      result += valueToChar[value];
    }
  }

  // Since we encoded in reverse order, reverse the result
  return result.split("").reverse().join("");
}

function equationToAllRotations(equation: string): bigint {
  // Generate all 5 rotations of the equation
  const rotations: string[] = [];

  for (let rot = 0; rot < 5; rot++) {
    // Create rotation by moving characters from end to beginning
    let rotated;
    if (rot === 0) {
      rotated = equation; // rot0 is the original
    } else {
      rotated = equation.slice(-rot) + equation.slice(0, -rot);
    }
    rotations.push(rotated);
  }

  console.log("Rotations:", rotations);

  let fullBinaryString = "";

  // Build the 100-bit binary string by concatenating each 20-bit rotation
  // Order: rot4 + rot3 + rot2 + rot1 + rot0 (left to right in final result)
  for (let rot = 4; rot >= 0; rot--) {
    const rotationBits = equationToBits(rotations[rot]);
    // Convert to binary string and pad to 20 bits
    const binaryString = rotationBits.toString(2).padStart(20, "0");
    console.log(`rot${rot} (${rotations[rot]}): ${binaryString}`);
    fullBinaryString += binaryString;
  }

  console.log("Full 100-bit binary string:", fullBinaryString);

  // Convert the 100-bit binary string to BigInt (parsing as actual binary)
  return BigInt("0b" + fullBinaryString);
}

function equationToAllSame(equation: string): bigint {
  console.log("Creating 100-bit with same equation repeated:", equation);

  let fullBinaryString = "";

  // Build the 100-bit binary string by repeating the same equation 5 times
  // Order: rot4 + rot3 + rot2 + rot1 + rot0 (left to right in final result)
  for (let pos = 4; pos >= 0; pos--) {
    const equationBits = equationToBits(equation);
    // Convert to binary string and pad to 20 bits
    const binaryString = equationBits.toString(2).padStart(20, "0");
    console.log(`pos${pos} (${equation}): ${binaryString}`);
    fullBinaryString += binaryString;
  }

  console.log("Full 100-bit binary string (all same):", fullBinaryString);

  // Convert the 100-bit binary string to BigInt (parsing as actual binary)
  return BigInt("0b" + fullBinaryString);
}

function analyzeXorResult(xorResult: bigint): {
  green: boolean[]; // True if guessed character at position i is correct
  yellow: boolean[]; // True if guessed character at position i exists elsewhere in target
  gray: boolean[]; // True if guessed character at position i doesn't exist in target
} {
  // Convert XOR result to binary and split into 5 rotations of 20 bits each
  const xorBinary = xorResult.toString(2).padStart(100, "0");
  const rotations = Array.from({ length: 5 }, (_, i) =>
    xorBinary.slice(i * 20, (i + 1) * 20)
  );

  // Initialize results
  const green = Array(5).fill(false);
  const yellow = Array(5).fill(false);
  const gray = Array(5).fill(false);

  // Check green first: exact matches in rot0 (rotations[4])
  for (let pos = 0; pos < 5; pos++) {
    const charStart = (4 - pos) * 4;
    if (rotations[4].slice(charStart, charStart + 4) === "0000") {
      green[pos] = true;
    }
  }

  // For each rotation 1-4, find matches and reconstruct the target equation
  for (let rotIdx = 0; rotIdx < 4; rotIdx++) {
    const rotation = rotations[rotIdx];
    const rotationNumber = 4 - rotIdx; // rot4, rot3, rot2, rot1

    // Find all matches in this rotation
    const matches = [];
    for (let pos = 0; pos < 5; pos++) {
      const charStart = (4 - pos) * 4;
      if (rotation.slice(charStart, charStart + 4) === "0000") {
        matches.push(pos);
      }
    }

    // For each match, determine what the original target character was
    for (const matchPos of matches) {
      // In this rotation, the character at matchPos came from the target
      // We know the guess character at the corresponding original position
      const originalGuessPos = (matchPos - rotationNumber + 5) % 5;

      // This guessChar exists in the target, so mark yellow if not already green
      if (!green[originalGuessPos]) {
        yellow[originalGuessPos] = true;
      }
    }
  }

  // Mark remaining positions as gray
  for (let pos = 0; pos < 5; pos++) {
    if (!green[pos] && !yellow[pos]) {
      gray[pos] = true;
    }
  }

  return { green, yellow, gray };
}

function extractOriginalEquation(rotatedBigInt: bigint): string {
  // Convert the 100-bit bigint to binary string
  const fullBinaryString = rotatedBigInt.toString(2).padStart(100, "0");
  
  // Extract rot0 (rightmost 20 bits, which is the original equation)
  // The structure is: [rot4][rot3][rot2][rot1][rot0] (left to right)
  // So rot0 is at positions 80-99 (20 bits)
  const rot0BinaryString = fullBinaryString.slice(80, 100);
  
  // Convert the 20-bit rot0 back to bigint
  const rot0BigInt = BigInt("0b" + rot0BinaryString);
  
  // Use the existing bitsToEquation function to convert back to string
  return bitsToEquation(rot0BigInt);
}

// Export functions
export {
  equationToBits,
  bitsToEquation,
  equationToAllRotations,
  equationToAllSame,
  analyzeXorResult,
  extractOriginalEquation,
};
