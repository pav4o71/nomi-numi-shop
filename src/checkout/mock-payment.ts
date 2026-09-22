export class MockPaymentProvider {
  /**
   * Simulates a payment delay and then sends a webhook to our server.
   * This is entirely for local development simulation of Phase 8.
   */
  static simulatePayment(orderId: string, shouldSucceed: boolean = true) {
    // Run in the background without awaiting, to simulate asynchronous webhook delivery
    setTimeout(async () => {
      try {
        const payload = {
          orderId,
          status: shouldSucceed ? "PAID" : "FAILED",
          transactionId: `mock_tx_${Math.random().toString(36).substring(7)}`,
        };

        // In a real environment, Stripe/Adyen would send this to our public webhook URL.
        // Here, we hit our own local Next.js server.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100";
        await fetch(`${baseUrl}/api/webhooks/mock-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("MockPaymentProvider failed to send webhook:", err);
      }
    }, 2000); // 2-second simulated delay
  }
}
