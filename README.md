This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## PayPal Configuration

### Development (Sandbox)

The project is currently configured for PayPal sandbox testing. The sandbox credentials are already set in `.env`.

### Production Setup

For production deployment, follow these steps:

1. **Create PayPal Live App:**
   - Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications)
   - Create a new Live App (not sandbox)
   - Copy the Client ID and Client Secret

2. **Update Environment Variables:**

   ```env
   # Production PayPal Credentials
   PAYPAL_CLIENT_ID=your_live_client_id_here
   PAYPAL_CLIENT_SECRET=your_live_client_secret_here
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_live_client_id_here

   # Production Webhook
   PAYPAL_WEBHOOK_ID=your_live_webhook_id_here

   # Production URLs
   NEXT_PUBLIC_SERVER_URL=https://yourdomain.com
   NEXT_PUBLIC_GRAPHQL_URL=https://yourdomain.com/api/graphql
   ```

3. **Setup Webhooks:**
   - In PayPal Developer Dashboard, go to your Live App
   - Add webhook URL: `https://yourdomain.com/api/paypal/webhook`
   - Subscribe to events:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `CHECKOUT.ORDER.APPROVED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`
   - Copy the Webhook ID to `PAYPAL_WEBHOOK_ID`

4. **Deploy:**
   - Set `NODE_ENV=production` in your deployment environment
   - The app will automatically use production PayPal APIs

### Security Notes

- Webhook signature verification is **mandatory** in production
- Never commit real PayPal credentials to version control
- Use environment variables for all sensitive data
- Test thoroughly in sandbox before going live

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
