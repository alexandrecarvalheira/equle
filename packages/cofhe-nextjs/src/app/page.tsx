import { WalletConnect } from "./components/WalletConnect";
import { CofheStatus } from "./components/CofheStatus";
// import { ContractInteraction } from "./components/ContractInteraction";
import { NumberleGame } from "./components/NumberleGame";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Numberle FHE Game Demo
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              (nothing onchain yet) Find the exact mathematical expression!
            </p>
          </header>
          {/* 
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <CofheStatus />
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <WalletConnect />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <ContractInteraction />
            </div>
          </div> */}

          <div className="mt-8">
            <NumberleGame />
          </div>
        </div>
      </div>
    </div>
  );
}
