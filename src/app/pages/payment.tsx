import { useEffect, useState } from "react";

interface PaymentData {
  Order: string;
  Amount: number;
  ClientName: string;
}

export default function PaymentPage() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const response = await fetch("/api/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setPaymentData(data);
      } catch (err) {
        console.error("Error fetching payment data:", err);
        setError("Failed to retrieve payment details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentData();
  }, []);

  useEffect(() => {
    const redirectToYaadPay = async () => {
      if (!paymentData) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/signature", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Order: paymentData.Order,
            Amount: paymentData.Amount,
            ClientName: paymentData.ClientName,
          }),
        });

        const reqWithSignature = await response.json();
        if (!reqWithSignature) {
          throw new Error("Invalid reqWithSignature received from server");
        }

        console.log(`https://icom.yaad.net/p/?action=pay&${reqWithSignature}`);
      } catch (err) {
        console.error("Payment redirect failed:", err);
        setError("Payment initialization failed. Please try again later.");
        setIsLoading(false);
      }
    };

    if (paymentData) {
      redirectToYaadPay();
    }
  }, [paymentData]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Secure Payment</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            <p className="text-gray-600">Initializing payment...</p>
          </div>
        ) : (
          !error && <p>Redirecting to payment gateway...</p>
        )}
      </div>
    </div>
  );
}
