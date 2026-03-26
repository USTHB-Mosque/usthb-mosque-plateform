/**
 * PayPal Configuration Utility
 * Provides the PayPal Client ID for the React PayPal SDK
 */

export const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;

/**
 * PayPal API Base URLs
 * Uses production API in production, sandbox in development
 */
export const PAYPAL_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

/**
 * PayPal Environment
 * Determines if we're using sandbox or production
 */
export const PAYPAL_ENVIRONMENT =
  process.env.NODE_ENV === "production" ? "production" : "sandbox";

/**
 * Generate PayPal access token for server-side API calls
 */
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Failed to get PayPal access token: ${errorData.error_description || response.statusText}`,
    );
  }

  const data = await response.json();
  return data.access_token;
}
