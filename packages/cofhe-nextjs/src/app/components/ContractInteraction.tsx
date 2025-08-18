// 'use client'

// import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
// import { useState, useEffect } from 'react'
// import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../../../contract/contract'
// import { useChainId } from 'wagmi'
// import { cofhejs, Encryptable, FheTypes, EncryptStep } from "cofhejs/web";
// import { useCofheStore } from '../store/cofheStore'

// type SupportedChainId = '11155111' | '421614'

// type LoadingState = {
//   increment: boolean;
//   decrement: boolean;
//   reset: boolean;
//   decrypt: boolean;
//   getEncrypted: boolean;
// }

// export function ContractInteraction() {
//   const { address, isConnected } = useAccount()
//   const chainId = useChainId()
//   const isInitialized = useCofheStore((state) => state.isInitialized)

//   const [isMounted, setIsMounted] = useState(false)
//   const [unsealedValue, setUnsealedValue] = useState<string>('')
//   const [hash, setHash] = useState<`0x${string}` | undefined>()
//   const [resetSteps, setResetSteps] = useState<string[]>([])
//   const [hoverInfo, setHoverInfo] = useState<string>('Hover over button to get information')
//   const [loading, setLoading] = useState<LoadingState>({
//     increment: false,
//     decrement: false,
//     reset: false,
//     decrypt: false,
//     getEncrypted: false,
//   })

//   const buttonDescriptions = {
//     increment: 'Send transaction to increment the counter',
//     decrement: 'Send transaction to decrement the counter',
//     reset: 'Encrypt the value 88 and send transaction to reset the counter',
//     decrypt: 'Request decryption of the counter, this will perform asynchronous decryption and store the value on chain once it is ready',
//     getEncrypted: 'This will retrieve the encrypted counter value and unseal a permit. This will not trigger decryption transaction',
//     default: 'Hover over button to get information'
//   }

//   const contractAddress = chainId ? CONTRACT_ADDRESS[chainId.toString() as SupportedChainId] : undefined

//   const { writeContractAsync: increment } = useWriteContract()
//   const { writeContractAsync: decrement } = useWriteContract()
//   const { writeContractAsync: reset } = useWriteContract()
//   const { writeContractAsync: decryptCounter } = useWriteContract()

//   const { data: receipt, isError } = useWaitForTransactionReceipt({
//     hash,
//   })

//   const { data: decryptedCount, refetch: refetchDecryptedCount } = useReadContract({
//     address: contractAddress as `0x${string}`,
//     account: address,
//     abi: CONTRACT_ABI,
//     functionName: 'getDecryptedValue',
//   })

//   const { data: encryptedCount, refetch: refetchEncryptedCount } = useReadContract({
//     address: contractAddress as `0x${string}`,
//     account: address,
//     abi: CONTRACT_ABI,
//     functionName: 'getEncryptedValue',
//   })

//   useEffect(() => {
//     setIsMounted(true)
//   }, [])

//   useEffect(() => {
//     if (receipt) {
//       console.log('Transaction Receipt:', receipt)
//       setHash(undefined)
//       refetchEncryptedCount()
//       refetchDecryptedCount()
//       setResetSteps([])
//     }
//   }, [receipt, refetchEncryptedCount, refetchDecryptedCount])

//   useEffect(() => {
//     if (receipt || isError) {
//       setLoading({
//         increment: false,
//         decrement: false,
//         reset: false,
//         decrypt: false,
//         getEncrypted: false,
//       })
//     }
//   }, [receipt, isError])

//   if (!isMounted || !isConnected || !contractAddress) {
//     return null
//   }

//   const isAnyLoading = Object.values(loading).some(Boolean)

//   const handleIncrement = async () => {
//     setLoading(prev => ({ ...prev, increment: true }))
//     try {
//       const hash = await increment({
//         address: contractAddress as `0x${string}`,
//         abi: CONTRACT_ABI,
//         functionName: 'increment',
//       })

//       if (hash) {
//         setHash(hash)
//       }
//     } catch (error) {
//       console.error('Increment error:', error)
//       setLoading(prev => ({ ...prev, increment: false }))
//     }
//   }

//   const handleDecrement = async () => {
//     setLoading(prev => ({ ...prev, decrement: true }))
//     try {
//       const hash = await decrement({
//         address: contractAddress as `0x${string}`,
//         abi: CONTRACT_ABI,
//         functionName: 'decrement',
//       })

//       if (hash) {
//         setHash(hash)
//       }
//     } catch (error) {
//       console.error('Decrement error:', error)
//       setLoading(prev => ({ ...prev, decrement: false }))
//     }
//   }

//   const encryptionState = async (step: EncryptStep) => {
//     console.log(step)
//     setResetSteps(prev => [...prev, `Encryption Step: ${step}`])
//   }

//   const handleReset = async () => {
//     setLoading(prev => ({ ...prev, reset: true }))
//     setResetSteps(['Starting reset process...'])
//     try {
//       setResetSteps(prev => [...prev, 'Encrypting value 88...'])
//       const encryptedValue = await cofhejs.encrypt([Encryptable.uint32("88")], encryptionState);
//       console.log(encryptedValue)
//       setResetSteps(prev => [...prev, 'Sending reset transaction...'])
//       const hash = await reset({
//         address: contractAddress as `0x${string}`,
//         abi: CONTRACT_ABI,
//         functionName: 'reset',
//         args: [encryptedValue.data?.[0]],
//       })

//       if (hash) {
//         setHash(hash)
//         setResetSteps(prev => [...prev, 'Transaction sent, waiting for confirmation...'])
//       }
//     } catch (error) {
//       console.error('Reset error:', error)
//       setLoading(prev => ({ ...prev, reset: false }))
//       setResetSteps(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`])
//     }
//   }

//   const handleDecrypt = async () => {
//     setLoading(prev => ({ ...prev, decrypt: true }))
//     try {
//       const hash = await decryptCounter({
//         address: contractAddress as `0x${string}`,
//         abi: CONTRACT_ABI,
//         functionName: 'decryptCounter',
//       })

//       if (hash) {
//         setHash(hash)
//       }
//     } catch (error) {
//       console.error('Decrypt error:', error)
//       setLoading(prev => ({ ...prev, decrypt: false }))
//     }
//   }

//   const handleEncryptedValueRequest = async () => {
//     setLoading(prev => ({ ...prev, getEncrypted: true }))
//     try {
//       await refetchEncryptedCount()

//       if (encryptedCount) {
//         const permit = await cofhejs.getPermit();
//         const unsealResult = await cofhejs.unseal(encryptedCount as bigint, FheTypes.Uint32, address, permit.data?.getHash());
//         setUnsealedValue(unsealResult?.data?.toString() ?? '');
//       }
//     } catch (error) {
//       console.error('Get encrypted value error:', error)
//     } finally {
//       setLoading(prev => ({ ...prev, getEncrypted: false }))
//     }
//   }

//   return (
//     <div className="flex flex-col gap-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
//       <div className="flex flex-col gap-4">
//         <h2 className="text-xl font-bold text-gray-900 dark:text-white">Contract Interactions</h2>
//         <div className="grid grid-cols-3 gap-3">
//           <button
//             onClick={handleIncrement}
//             disabled={!isInitialized || isAnyLoading}
//             onMouseEnter={() => setHoverInfo(buttonDescriptions.increment)}
//             onMouseLeave={() => setHoverInfo(buttonDescriptions.default)}
//             className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md relative"
//           >
//             {loading.increment ? (
//               <span className="flex items-center justify-center">
//                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//                 {hash ? 'Confirming...' : 'Incrementing...'}
//               </span>
//             ) : (
//               'Increment'
//             )}
//           </button>
//           <button
//             onClick={handleDecrement}
//             disabled={!isInitialized || isAnyLoading}
//             onMouseEnter={() => setHoverInfo(buttonDescriptions.decrement)}
//             onMouseLeave={() => setHoverInfo(buttonDescriptions.default)}
//             className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md relative"
//           >
//             {loading.decrement ? (
//               <span className="flex items-center justify-center">
//                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//                 {hash ? 'Confirming...' : 'Decrementing...'}
//               </span>
//             ) : (
//               'Decrement'
//             )}
//           </button>
//           <button
//             onClick={handleReset}
//             disabled={!isInitialized || isAnyLoading}
//             onMouseEnter={() => setHoverInfo(buttonDescriptions.reset)}
//             onMouseLeave={() => setHoverInfo(buttonDescriptions.default)}
//             className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md relative"
//           >
//             {loading.reset ? (
//               <span className="flex items-center justify-center">
//                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//                 {hash ? 'Confirming...' : 'Resetting...'}
//               </span>
//             ) : (
//               'Reset'
//             )}
//           </button>
//         </div>
//       </div>

//       <div className="flex flex-col gap-4">
//         <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Value Operations</h3>
//         <div className="grid grid-cols-2 gap-3">
//           <button
//             onClick={handleDecrypt}
//             disabled={!isInitialized || isAnyLoading}
//             onMouseEnter={() => setHoverInfo(buttonDescriptions.decrypt)}
//             onMouseLeave={() => setHoverInfo(buttonDescriptions.default)}
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md relative"
//           >
//             {loading.decrypt ? (
//               <span className="flex items-center justify-center">
//                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//                 {hash ? 'Confirming...' : 'Decrypting...'}
//               </span>
//             ) : (
//               'Request Decryption'
//             )}
//           </button>
//           <button
//             onClick={handleEncryptedValueRequest}
//             disabled={!isInitialized || isAnyLoading}
//             onMouseEnter={() => setHoverInfo(buttonDescriptions.getEncrypted)}
//             onMouseLeave={() => setHoverInfo(buttonDescriptions.default)}
//             className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md relative"
//           >
//             {loading.getEncrypted ? (
//               <span className="flex items-center justify-center">
//                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//                 Getting Value...
//               </span>
//             ) : (
//               'Get Encrypted Value'
//             )}
//           </button>
//         </div>

//         {resetSteps.length > 0 && (
//           <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
//             <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Reset Process Steps:</p>
//             <ul className="space-y-1">
//               {resetSteps.map((step, index) => (
//                 <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
//                   {step}
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}

//         {(decryptedCount !== undefined || unsealedValue) && (
//           <div className="mt-4 space-y-3">
//             {decryptedCount !== undefined && (
//               <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
//                 <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Decrypted Value</p>
//                 <p className="text-lg font-mono text-gray-900 dark:text-white mt-1">{String(decryptedCount)}</p>
//               </div>
//             )}

//             {unsealedValue && (
//               <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
//                 <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Unsealed Value</p>
//                 <p className="text-lg font-mono text-gray-900 dark:text-white mt-1">{unsealedValue}</p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {!isInitialized && (
//         <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
//           <p className="text-sm text-yellow-800 dark:text-yellow-200">
//             Please wait while CoFHE initializes...
//           </p>
//         </div>
//       )}

//       <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
//         <p className="text-sm text-gray-700 dark:text-gray-300">{hoverInfo}</p>
//       </div>
//     </div>
//   )
// }
