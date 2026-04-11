import braintree from "braintree";

export function getBraintreeGateway() {
  const merchantId = process.env.BRAINTREE_MERCHANT_ID;
  const publicKey = process.env.BRAINTREE_PUBLIC_KEY;
  const privateKey = process.env.BRAINTREE_PRIVATE_KEY;

  if (!merchantId || !publicKey || !privateKey) {
    return null;
  }

  return new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId,
    publicKey,
    privateKey,
  });
}