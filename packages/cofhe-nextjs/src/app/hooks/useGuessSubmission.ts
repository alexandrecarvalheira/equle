import { useState } from "react";
import { useWriteContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { cofhejs, Encryptable } from "cofhejs/web";
import { equationToAllRotations } from "../../../utils";

export function useGuessSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>("");

  const { writeContract, data: hash } = useWriteContract();

  // Calculate the result using left-to-right evaluation (same as contract logic)
  const calculateResult = (expression: string): number => {
    let result = 0;
    let currentNumber = 0;
    let operator = "+";

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (!isNaN(Number(char))) {
        currentNumber = currentNumber * 10 + Number(char);
      }

      if (["+", "-", "*", "/"].includes(char) || i === expression.length - 1) {
        switch (operator) {
          case "+":
            result += currentNumber;
            break;
          case "-":
            result -= currentNumber;
            break;
          case "*":
            result *= currentNumber;
            break;
          case "/":
            result = Math.floor(result / currentNumber);
            break;
        }

        operator = char;
        currentNumber = 0;
      }
    }

    return result;
  };

  const isValidExpression = (expression: string): boolean => {
    const EQUATION_LENGTH = 5;

    if (expression.length !== EQUATION_LENGTH) return false;
    if (expression.includes("=")) return false;

    const hasAtLeastOneOperation = /[+\-*/]/.test(expression);
    if (!hasAtLeastOneOperation) return false;

    // Check if first or last character is an operation
    if (
      /[+\-*/]/.test(expression[0]) ||
      /[+\-*/]/.test(expression[expression.length - 1])
    ) {
      return false;
    }

    return true;
  };

  const encryptGuess = async (
    equation: string,
    address: `0x${string}`
  ): Promise<{
    encryptedEquation: any;
    encryptedResult: any;
    result: number;
  } | null> => {
    try {
      setSubmissionError("");

      if (!isValidExpression(equation)) {
        setSubmissionError("Invalid equation format");
        return null;
      }

      console.log("Encrypting guess:", equation);

      // Calculate result
      const result = calculateResult(equation);
      console.log("Calculated result:", result);

      // Generate all rotations for the equation
      const allRotations = equationToAllRotations(equation);
      console.log("All rotations (as BigInt):", allRotations.toString());

      // Encrypt the equation rotations
      const encryptedEquation = await cofhejs.encrypt([
        Encryptable.uint128(allRotations),
      ]);

      // Encrypt the result
      const encryptedResult = await cofhejs.encrypt([
        Encryptable.uint8(BigInt(result)),
      ]);

      console.log("Encryption successful:", {
        equation,
        result,
        encryptedEquation: encryptedEquation.data?.[0]?.toString() || "no data",
        encryptedResult: encryptedResult.data?.[0]?.toString() || "no data",
      });

      return {
        encryptedEquation,
        encryptedResult,
        result,
      };
    } catch (error) {
      console.error("Encryption failed:", error);
      setSubmissionError("Encryption failed. Please try again.");
      return null;
    }
  };

  const submitGuess = async (
    equation: string,
    address: `0x${string}`,
    onSuccess?: (data: {
      equation: string;
      result: number;
      rowIndex: number;
    }) => void,
    onError?: (error: string) => void
  ): Promise<boolean> => {
    if (!address) {
      const errorMsg = "Wallet not connected";
      setSubmissionError(errorMsg);
      onError?.(errorMsg);
      return false;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      // Encrypt the guess
      const encryptedData = await encryptGuess(equation, address);
      if (!encryptedData) {
        setIsSubmitting(false);
        onError?.(submissionError || "Encryption failed");
        return false;
      }

      const { encryptedEquation, encryptedResult, result } = encryptedData;

      console.log("Submitting encrypted guess to contract...");

      // Submit to contract
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "guess",
        args: [encryptedEquation.data?.[0], encryptedResult.data?.[0]],
      });

      console.log("Contract transaction initiated");

      // Call success callback with guess data
      onSuccess?.({
        equation,
        result,
        rowIndex: 0, // This will be updated by the caller if needed
      });

      return true;
    } catch (error) {
      console.error("Failed to submit guess:", error);
      const errorMsg = "Failed to submit guess. Please try again.";
      setSubmissionError(errorMsg);
      onError?.(errorMsg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // State
    isSubmitting,
    submissionError,
    hash,

    // Functions
    submitGuess,
    encryptGuess,
    calculateResult,
    isValidExpression,

    // Utils
    clearError: () => setSubmissionError(""),
  };
}
