import { shopifyApi, ApiVersion } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_orders', 'read_products', 'read_customers', 'read_analytics', 'read_inventory'],
  hostName: process.env.HOST || 'localhost:5001',
  hostScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
  apiVersion: ApiVersion.October24,
  isEmbeddedApp: false,
});

export default shopify;
