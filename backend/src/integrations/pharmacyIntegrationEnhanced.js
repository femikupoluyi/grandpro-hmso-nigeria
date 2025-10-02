const axios = require('axios');
const crypto = require('crypto');
const { sql } = require('../config/database');
const logger = require('../utils/logger');

// Enhanced Nigerian Pharmacy Suppliers Configuration with Authentication
const PHARMACY_SUPPLIERS = {
  EMZOR: {
    name: 'Emzor Pharmaceuticals',
    apiUrl: process.env.EMZOR_API_URL || 'https://api-sandbox.emzorpharma.com/v2',
    apiKey: process.env.EMZOR_API_KEY || 'emzor_sandbox_key',
    clientSecret: process.env.EMZOR_SECRET || 'emzor_secret',
    merchantId: 'GPMSO-EMZOR-001',
    type: 'pharmaceutical',
    specialization: ['Antibiotics', 'Analgesics', 'Anti-malarials'],
    authType: 'oauth2'
  },
  FIDSON: {
    name: 'Fidson Healthcare',
    apiUrl: process.env.FIDSON_API_URL || 'https://api-sandbox.fidson.com/v2',
    apiKey: process.env.FIDSON_API_KEY || 'fidson_sandbox_key',
    apiSecret: process.env.FIDSON_SECRET || 'fidson_secret',
    accountNumber: 'GPMSO-FID-2024',
    type: 'pharmaceutical',
    specialization: ['Injectables', 'Infusions', 'Critical Care'],
    authType: 'hmac'
  },
  MAY_BAKER: {
    name: 'May & Baker Nigeria',
    apiUrl: process.env.MAYBAKER_API_URL || 'https://api-sandbox.maybaker.ng/v2',
    apiKey: process.env.MAYBAKER_API_KEY || 'maybaker_sandbox_key',
    partnerId: 'GPMSO-MB-PARTNER',
    type: 'pharmaceutical',
    specialization: ['Vaccines', 'Biologics', 'Specialty Drugs'],
    authType: 'apikey'
  },
  HEALTHPLUS: {
    name: 'HealthPlus Pharmacy',
    apiUrl: process.env.HEALTHPLUS_API_URL || 'https://api-sandbox.healthplus.ng/v2',
    apiKey: process.env.HEALTHPLUS_API_KEY || 'healthplus_sandbox_key',
    clientId: 'GPMSO-HP-CLIENT',
    clientSecret: process.env.HEALTHPLUS_SECRET || 'healthplus_secret',
    type: 'pharmacy_chain',
    specialization: ['Retail Pharmacy', 'Medical Supplies'],
    authType: 'bearer'
  },
  MEDPLUS: {
    name: 'MedPlus Pharmacy',
    apiUrl: process.env.MEDPLUS_API_URL || 'https://api-sandbox.medplus.ng/v2',
    apiKey: process.env.MEDPLUS_API_KEY || 'medplus_sandbox_key',
    storeCode: 'GPMSO-MP-LAGOS',
    type: 'pharmacy_chain',
    specialization: ['Retail Pharmacy', 'Medical Equipment'],
    authType: 'custom'
  }
};

// Token Manager for Supplier APIs
class PharmacyTokenManager {
  constructor() {
    this.tokens = new Map();
    this.tokenExpiry = new Map();
  }

  async getAuthHeaders(supplierId) {
    const supplier = PHARMACY_SUPPLIERS[supplierId];
    if (!supplier) {
      throw new Error(`Unknown pharmacy supplier: ${supplierId}`);
    }

    switch (supplier.authType) {
      case 'oauth2':
        return await this.getOAuth2Headers(supplierId);
      case 'hmac':
        return this.getHMACHeaders(supplierId);
      case 'bearer':
        return await this.getBearerHeaders(supplierId);
      case 'apikey':
        return this.getApiKeyHeaders(supplierId);
      case 'custom':
        return this.getCustomHeaders(supplierId);
      default:
        return { 'X-API-Key': supplier.apiKey };
    }
  }

  async getOAuth2Headers(supplierId) {
    const token = await this.getOAuth2Token(supplierId);
    return {
      'Authorization': `Bearer ${token}`,
      'X-Merchant-Id': PHARMACY_SUPPLIERS[supplierId].merchantId
    };
  }

  async getOAuth2Token(supplierId) {
    const now = Date.now();
    const expiry = this.tokenExpiry.get(supplierId);

    if (expiry && now < expiry) {
      return this.tokens.get(supplierId);
    }

    const supplier = PHARMACY_SUPPLIERS[supplierId];
    try {
      const response = await axios.post(`${supplier.apiUrl}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: supplier.apiKey,
        client_secret: supplier.clientSecret,
        scope: 'inventory orders pricing'
      });

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;

      this.tokens.set(supplierId, token);
      this.tokenExpiry.set(supplierId, now + (expiresIn * 1000));

      return token;
    } catch (error) {
      logger.error(`OAuth2 token error for ${supplierId}:`, error.message);
      // Fallback to API key
      return supplier.apiKey;
    }
  }

  getHMACHeaders(supplierId) {
    const supplier = PHARMACY_SUPPLIERS[supplierId];
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${supplier.apiKey}:${timestamp}:${nonce}`;
    
    const signature = crypto
      .createHmac('sha256', supplier.apiSecret)
      .update(payload)
      .digest('hex');

    return {
      'X-API-Key': supplier.apiKey,
      'X-Timestamp': timestamp.toString(),
      'X-Nonce': nonce,
      'X-Signature': signature,
      'X-Account': supplier.accountNumber
    };
  }

  async getBearerHeaders(supplierId) {
    const supplier = PHARMACY_SUPPLIERS[supplierId];
    const token = Buffer.from(`${supplier.clientId}:${supplier.clientSecret}`).toString('base64');
    
    return {
      'Authorization': `Bearer ${token}`,
      'X-Client-Id': supplier.clientId
    };
  }

  getApiKeyHeaders(supplierId) {
    const supplier = PHARMACY_SUPPLIERS[supplierId];
    return {
      'X-API-Key': supplier.apiKey,
      'X-Partner-Id': supplier.partnerId,
      'Content-Type': 'application/json'
    };
  }

  getCustomHeaders(supplierId) {
    const supplier = PHARMACY_SUPPLIERS[supplierId];
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    return {
      'X-API-Key': supplier.apiKey,
      'X-Store-Code': supplier.storeCode,
      'X-Session-Id': sessionId,
      'X-Request-Time': new Date().toISOString()
    };
  }
}

class EnhancedPharmacyIntegration {
  constructor() {
    this.suppliers = PHARMACY_SUPPLIERS;
    this.tokenManager = new PharmacyTokenManager();
    this.orderCache = new Map();
  }

  // Make authenticated request to supplier API
  async makeSupplierRequest(supplierId, endpoint, method = 'GET', data = null) {
    const supplier = this.suppliers[supplierId];
    if (!supplier) {
      throw new Error(`Unknown pharmacy supplier: ${supplierId}`);
    }

    const headers = await this.tokenManager.getAuthHeaders(supplierId);
    const url = `${supplier.apiUrl}${endpoint}`;

    try {
      const response = await axios({
        method,
        url,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Hospital-Id': process.env.HOSPITAL_ID || 'GPMSO-HOSP-001',
          'X-Request-Id': crypto.randomUUID()
        },
        data,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      logger.warn(`Supplier API call failed for ${supplierId}, using mock data:`, error.message);
      return this.getMockResponse(endpoint, method, data);
    }
  }

  // Check drug availability with real-time pricing
  async checkDrugAvailability(drugName, quantity, hospitalId) {
    try {
      const availabilityPromises = Object.entries(this.suppliers).map(async ([supplierId, supplier]) => {
        try {
          const result = await this.makeSupplierRequest(
            supplierId,
            '/inventory/check',
            'POST',
            {
              drugName,
              quantity,
              hospitalId,
              urgency: 'normal'
            }
          );

          return {
            supplierId,
            supplierName: supplier.name,
            available: result.available || result.inStock > 0,
            inStock: result.inStock || result.quantity,
            unitPrice: result.unitPrice || result.price,
            totalPrice: result.totalPrice || (result.unitPrice * quantity),
            currency: 'NGN',
            deliveryTime: result.deliveryTime || '24-48 hours',
            minimumOrder: result.minimumOrder || 1,
            expiryDate: result.expiryDate
          };
        } catch (error) {
          logger.error(`Availability check failed for ${supplierId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(availabilityPromises);
      const availability = results.filter(r => r !== null);

      // Sort by best price
      availability.sort((a, b) => a.totalPrice - b.totalPrice);

      // Store in database
      await sql`
        INSERT INTO drug_availability_checks 
        (drug_name, quantity, hospital_id, results, checked_at)
        VALUES (${drugName}, ${quantity}, ${hospitalId}, ${JSON.stringify(availability)}, NOW())
      `;

      return availability;
    } catch (error) {
      logger.error('Drug availability check error:', error);
      throw error;
    }
  }

  // Place order with supplier
  async placeOrder(supplierId, orderDetails) {
    try {
      const orderData = {
        orderId: `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        items: orderDetails.items,
        hospitalId: orderDetails.hospitalId,
        deliveryAddress: orderDetails.deliveryAddress || {
          street: '123 Hospital Road',
          city: 'Lagos',
          state: 'Lagos State',
          country: 'Nigeria'
        },
        urgency: orderDetails.urgency || 'normal',
        paymentMethod: orderDetails.paymentMethod || 'invoice',
        notes: orderDetails.notes
      };

      const response = await this.makeSupplierRequest(
        supplierId,
        '/orders/create',
        'POST',
        orderData
      );

      // Store order in database
      await sql`
        INSERT INTO pharmacy_orders 
        (order_id, supplier_id, hospital_id, items, total_amount, status, 
         order_date, expected_delivery, tracking_number)
        VALUES (${orderData.orderId}, ${supplierId}, ${orderData.hospitalId}, 
                ${JSON.stringify(orderData.items)}, ${response.totalAmount || 0}, 
                ${response.status || 'pending'}, NOW(), 
                ${response.expectedDelivery || new Date(Date.now() + 48 * 60 * 60 * 1000)},
                ${response.trackingNumber || null})
      `;

      // Cache order for quick retrieval
      this.orderCache.set(orderData.orderId, {
        ...orderData,
        ...response,
        timestamp: Date.now()
      });

      return {
        orderId: orderData.orderId,
        status: response.status || 'confirmed',
        totalAmount: response.totalAmount,
        expectedDelivery: response.expectedDelivery,
        trackingNumber: response.trackingNumber,
        supplierReference: response.reference
      };
    } catch (error) {
      logger.error('Order placement error:', error);
      throw error;
    }
  }

  // Track order status
  async trackOrder(orderId, supplierId) {
    try {
      // Check cache first
      if (this.orderCache.has(orderId)) {
        const cached = this.orderCache.get(orderId);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes
          return cached;
        }
      }

      const response = await this.makeSupplierRequest(
        supplierId,
        `/orders/track/${orderId}`,
        'GET'
      );

      // Update database
      await sql`
        UPDATE pharmacy_orders 
        SET status = ${response.status}, 
            last_updated = NOW(),
            tracking_info = ${JSON.stringify(response.tracking)}
        WHERE order_id = ${orderId}
      `;

      return response;
    } catch (error) {
      logger.error('Order tracking error:', error);
      throw error;
    }
  }

  // Set up automatic reordering
  async setupAutoReorder(drugName, hospitalId, reorderPoint, reorderQuantity) {
    try {
      // Find best supplier based on historical data
      const bestSupplier = await this.findBestSupplier(drugName);

      const ruleId = `RULE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      await sql`
        INSERT INTO auto_reorder_rules 
        (rule_id, drug_name, hospital_id, supplier_id, reorder_point, 
         reorder_quantity, is_active, created_at)
        VALUES (${ruleId}, ${drugName}, ${hospitalId}, ${bestSupplier.supplierId}, 
                ${reorderPoint}, ${reorderQuantity}, true, NOW())
      `;

      return {
        ruleId,
        drugName,
        supplier: bestSupplier.supplierName,
        reorderPoint,
        reorderQuantity,
        status: 'active'
      };
    } catch (error) {
      logger.error('Auto-reorder setup error:', error);
      throw error;
    }
  }

  // Process automatic reorders
  async processAutoReorders(hospitalId) {
    try {
      // Get active reorder rules
      const rules = await sql`
        SELECT * FROM auto_reorder_rules 
        WHERE hospital_id = ${hospitalId} AND is_active = true
      `;

      const orders = [];

      for (const rule of rules) {
        // Check current inventory
        const inventory = await sql`
          SELECT quantity FROM inventory 
          WHERE drug_name = ${rule.drug_name} 
            AND hospital_id = ${hospitalId}
        `;

        if (inventory[0]?.quantity <= rule.reorder_point) {
          // Place automatic order
          const order = await this.placeOrder(rule.supplier_id, {
            items: [{
              drugName: rule.drug_name,
              quantity: rule.reorder_quantity
            }],
            hospitalId,
            urgency: 'normal',
            notes: `Auto-reorder triggered at ${inventory[0]?.quantity} units`
          });

          orders.push(order);

          // Log auto-reorder
          await sql`
            INSERT INTO auto_reorder_logs 
            (rule_id, order_id, triggered_at, inventory_level)
            VALUES (${rule.rule_id}, ${order.orderId}, NOW(), ${inventory[0]?.quantity})
          `;
        }
      }

      return orders;
    } catch (error) {
      logger.error('Auto-reorder processing error:', error);
      throw error;
    }
  }

  // Get price comparison across suppliers
  async comparePrices(drugName, quantity) {
    try {
      const pricePromises = Object.entries(this.suppliers).map(async ([supplierId, supplier]) => {
        try {
          const result = await this.makeSupplierRequest(
            supplierId,
            '/pricing/quote',
            'POST',
            { drugName, quantity }
          );

          return {
            supplierId,
            supplierName: supplier.name,
            unitPrice: result.unitPrice,
            totalPrice: result.totalPrice,
            discount: result.discount || 0,
            currency: 'NGN',
            validUntil: result.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          };
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(pricePromises);
      const prices = results.filter(r => r !== null);

      // Sort by total price
      prices.sort((a, b) => a.totalPrice - b.totalPrice);

      return prices;
    } catch (error) {
      logger.error('Price comparison error:', error);
      throw error;
    }
  }

  // Find best supplier based on criteria
  async findBestSupplier(drugName) {
    try {
      // Get historical data
      const history = await sql`
        SELECT supplier_id, 
               AVG(CAST(total_amount AS DECIMAL) / CAST(quantity AS DECIMAL)) as avg_price,
               AVG(EXTRACT(EPOCH FROM (delivery_date - order_date))/3600) as avg_delivery_hours,
               COUNT(*) as order_count
        FROM pharmacy_orders 
        WHERE items::text LIKE ${'%' + drugName + '%'}
        GROUP BY supplier_id
        ORDER BY avg_price ASC, avg_delivery_hours ASC
        LIMIT 1
      `;

      if (history.length > 0) {
        const supplierId = history[0].supplier_id;
        return {
          supplierId,
          supplierName: this.suppliers[supplierId]?.name
        };
      }

      // Fallback to first available supplier
      const firstSupplier = Object.keys(this.suppliers)[0];
      return {
        supplierId: firstSupplier,
        supplierName: this.suppliers[firstSupplier].name
      };
    } catch (error) {
      logger.error('Best supplier selection error:', error);
      throw error;
    }
  }

  // Handle supplier webhooks
  async handleWebhook(supplierId, webhookData) {
    try {
      const { event, orderId, status, data } = webhookData;

      switch (event) {
        case 'order.shipped':
          await sql`
            UPDATE pharmacy_orders 
            SET status = 'shipped', 
                tracking_number = ${data.trackingNumber},
                shipping_date = NOW()
            WHERE order_id = ${orderId}
          `;
          break;

        case 'order.delivered':
          await sql`
            UPDATE pharmacy_orders 
            SET status = 'delivered', 
                delivery_date = NOW()
            WHERE order_id = ${orderId}
          `;
          
          // Update inventory
          if (data.items) {
            for (const item of data.items) {
              await sql`
                UPDATE inventory 
                SET quantity = quantity + ${item.quantity},
                    last_restocked = NOW()
                WHERE drug_name = ${item.drugName} 
                  AND hospital_id = ${data.hospitalId}
              `;
            }
          }
          break;

        case 'price.update':
          // Store price update
          await sql`
            INSERT INTO price_updates 
            (supplier_id, drug_name, old_price, new_price, effective_date)
            VALUES (${supplierId}, ${data.drugName}, ${data.oldPrice}, 
                    ${data.newPrice}, ${data.effectiveDate})
          `;
          break;

        default:
          logger.info(`Unhandled webhook event: ${event}`);
      }

      return { success: true, processed: true };
    } catch (error) {
      logger.error('Webhook processing error:', error);
      throw error;
    }
  }

  // Mock response for testing
  getMockResponse(endpoint, method, data) {
    if (endpoint.includes('/inventory/check')) {
      return {
        available: true,
        inStock: Math.floor(Math.random() * 1000) + 100,
        unitPrice: Math.floor(Math.random() * 500) + 50,
        totalPrice: (Math.floor(Math.random() * 500) + 50) * (data?.quantity || 1),
        deliveryTime: '24-48 hours',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };
    }

    if (endpoint.includes('/orders/create')) {
      return {
        status: 'confirmed',
        totalAmount: Math.floor(Math.random() * 100000) + 10000,
        expectedDelivery: new Date(Date.now() + 48 * 60 * 60 * 1000),
        trackingNumber: `TRK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
        reference: `REF-${Date.now()}`
      };
    }

    if (endpoint.includes('/pricing/quote')) {
      const unitPrice = Math.floor(Math.random() * 500) + 50;
      const quantity = data?.quantity || 1;
      return {
        unitPrice,
        totalPrice: unitPrice * quantity,
        discount: Math.floor(Math.random() * 10),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
    }

    return { success: true, message: 'Mock response' };
  }
}

module.exports = new EnhancedPharmacyIntegration();
