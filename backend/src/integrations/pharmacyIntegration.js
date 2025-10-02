const axios = require('axios');
const { sql } = require('../config/database');

// Nigerian Pharmacy Suppliers Configuration
const PHARMACY_SUPPLIERS = {
  MEGA_LIFESCIENCES: {
    name: 'Mega Lifesciences Nigeria',
    apiUrl: process.env.MEGA_API_URL || 'https://api.megalifesciences.ng/v1',
    apiKey: process.env.MEGA_API_KEY,
    type: 'pharmaceutical',
    specialization: ['Generic Drugs', 'OTC Medicines']
  },
  EMZOR: {
    name: 'Emzor Pharmaceuticals',
    apiUrl: process.env.EMZOR_API_URL || 'https://api.emzorpharma.com/v1',
    apiKey: process.env.EMZOR_API_KEY,
    type: 'pharmaceutical',
    specialization: ['Antibiotics', 'Analgesics', 'Anti-malarials']
  },
  FIDSON: {
    name: 'Fidson Healthcare',
    apiUrl: process.env.FIDSON_API_URL || 'https://api.fidson.com/v1',
    apiKey: process.env.FIDSON_API_KEY,
    type: 'pharmaceutical',
    specialization: ['Injectables', 'Infusions', 'Critical Care']
  },
  MAY_BAKER: {
    name: 'May & Baker Nigeria',
    apiUrl: process.env.MAYBAKER_API_URL || 'https://api.maybaker.ng/v1',
    apiKey: process.env.MAYBAKER_API_KEY,
    type: 'pharmaceutical',
    specialization: ['Vaccines', 'Biologics', 'Specialty Drugs']
  },
  HEALTHPLUS: {
    name: 'HealthPlus Pharmacy',
    apiUrl: process.env.HEALTHPLUS_API_URL || 'https://api.healthplus.ng/v1',
    apiKey: process.env.HEALTHPLUS_API_KEY,
    type: 'pharmacy_chain',
    specialization: ['Retail Pharmacy', 'Medical Supplies']
  },
  MEDPLUS: {
    name: 'MedPlus Pharmacy',
    apiUrl: process.env.MEDPLUS_API_URL || 'https://api.medplus.ng/v1',
    apiKey: process.env.MEDPLUS_API_KEY,
    type: 'pharmacy_chain',
    specialization: ['Retail Pharmacy', 'Medical Equipment']
  }
};

// Common Nigerian medications
const COMMON_MEDICATIONS = {
  'PARACETAMOL': { unit: 'tablets', packSize: 1000, category: 'analgesic' },
  'AMOXICILLIN': { unit: 'capsules', packSize: 500, category: 'antibiotic' },
  'ARTEMETHER_LUMEFANTRINE': { unit: 'tablets', packSize: 100, category: 'antimalarial' },
  'METFORMIN': { unit: 'tablets', packSize: 500, category: 'antidiabetic' },
  'AMLODIPINE': { unit: 'tablets', packSize: 500, category: 'antihypertensive' },
  'OMEPRAZOLE': { unit: 'capsules', packSize: 500, category: 'antacid' },
  'DICLOFENAC': { unit: 'tablets', packSize: 500, category: 'nsaid' },
  'CEFTRIAXONE': { unit: 'vials', packSize: 50, category: 'antibiotic' },
  'INSULIN': { unit: 'vials', packSize: 25, category: 'antidiabetic' },
  'CHLOROQUINE': { unit: 'tablets', packSize: 500, category: 'antimalarial' }
};

class PharmacyIntegration {
  constructor() {
    this.suppliers = PHARMACY_SUPPLIERS;
    this.medications = COMMON_MEDICATIONS;
    this.priceCache = new Map();
  }

  // Check drug availability across suppliers
  async checkDrugAvailability(drugName, quantity, hospitalId) {
    try {
      const availability = [];

      for (const [supplierId, supplier] of Object.entries(this.suppliers)) {
        try {
          const result = await this.mockCheckAvailability(supplierId, drugName, quantity);
          
          availability.push({
            supplierId,
            supplierName: supplier.name,
            available: result.available,
            quantity: result.quantity,
            unitPrice: result.unitPrice,
            totalPrice: result.totalPrice,
            deliveryTime: result.deliveryTime,
            inStock: result.inStock
          });
        } catch (error) {
          console.error(`Error checking availability with ${supplierId}:`, error);
        }
      }

      // Sort by best price
      availability.sort((a, b) => a.totalPrice - b.totalPrice);

      // Store availability check in database
      await pool.query(
        `INSERT INTO drug_availability_checks 
         (hospital_id, drug_name, quantity_requested, check_date, results)
         VALUES ($1, $2, $3, NOW(), $4)`,
        [hospitalId, drugName, quantity, JSON.stringify(availability)]
      );

      return availability;
    } catch (error) {
      console.error('Error checking drug availability:', error);
      throw error;
    }
  }

  // Place automatic restock order
  async placeRestockOrder(hospitalId, orderItems, supplierId = null) {
    try {
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const orderResults = [];
      let totalAmount = 0;

      // If no supplier specified, find best prices
      for (const item of orderItems) {
        let selectedSupplier = supplierId;
        let orderResult;

        if (!selectedSupplier) {
          // Find best supplier for this item
          const availability = await this.checkDrugAvailability(
            item.drugName,
            item.quantity,
            hospitalId
          );
          
          if (availability.length > 0 && availability[0].available) {
            selectedSupplier = availability[0].supplierId;
            orderResult = availability[0];
          }
        } else {
          // Use specified supplier
          orderResult = await this.mockCheckAvailability(
            selectedSupplier,
            item.drugName,
            item.quantity
          );
        }

        if (orderResult && orderResult.available) {
          orderResults.push({
            drugName: item.drugName,
            quantity: item.quantity,
            supplierId: selectedSupplier,
            unitPrice: orderResult.unitPrice,
            totalPrice: orderResult.totalPrice,
            status: 'ordered'
          });
          totalAmount += orderResult.totalPrice;
        } else {
          orderResults.push({
            drugName: item.drugName,
            quantity: item.quantity,
            status: 'unavailable',
            reason: 'Out of stock or insufficient quantity'
          });
        }
      }

      // Create order in database
      await pool.query(
        `INSERT INTO pharmacy_orders 
         (order_id, hospital_id, order_items, total_amount, order_status, 
          order_date, expected_delivery)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [
          orderId,
          hospitalId,
          JSON.stringify(orderResults),
          totalAmount,
          'pending',
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days delivery
        ]
      );

      // Simulate order confirmation from suppliers
      const confirmation = await this.mockOrderConfirmation(orderId, orderResults);

      return {
        orderId,
        orderItems: orderResults,
        totalAmount,
        currency: 'NGN',
        estimatedDelivery: confirmation.estimatedDelivery,
        status: 'confirmed'
      };
    } catch (error) {
      console.error('Error placing restock order:', error);
      throw error;
    }
  }

  // Set up automatic reordering rules
  async setupAutoReorder(hospitalId, rules) {
    try {
      const ruleId = `RULE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store auto-reorder rules
      for (const rule of rules) {
        await pool.query(
          `INSERT INTO auto_reorder_rules 
           (rule_id, hospital_id, drug_name, minimum_quantity, reorder_quantity, 
            preferred_supplier, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
           ON CONFLICT (hospital_id, drug_name) 
           DO UPDATE SET 
             minimum_quantity = $4,
             reorder_quantity = $5,
             preferred_supplier = $6,
             updated_at = NOW()`,
          [
            ruleId,
            hospitalId,
            rule.drugName,
            rule.minimumQuantity,
            rule.reorderQuantity,
            rule.preferredSupplier || null
          ]
        );
      }

      return {
        ruleId,
        rulesCreated: rules.length,
        status: 'active'
      };
    } catch (error) {
      console.error('Error setting up auto-reorder:', error);
      throw error;
    }
  }

  // Check inventory and trigger auto-reorders
  async checkAndReorder(hospitalId) {
    try {
      // Get current inventory levels
      const inventory = await pool.query(
        `SELECT i.*, r.minimum_quantity, r.reorder_quantity, r.preferred_supplier
         FROM inventory i
         LEFT JOIN auto_reorder_rules r ON i.drug_name = r.drug_name 
         WHERE i.hospital_id = $1 AND r.is_active = true 
         AND i.current_quantity <= r.minimum_quantity`,
        [hospitalId]
      );

      const reorders = [];
      
      for (const item of inventory.rows) {
        const orderResult = await this.placeRestockOrder(
          hospitalId,
          [{
            drugName: item.drug_name,
            quantity: item.reorder_quantity
          }],
          item.preferred_supplier
        );

        reorders.push(orderResult);
      }

      return {
        itemsReordered: reorders.length,
        orders: reorders,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking and reordering:', error);
      throw error;
    }
  }

  // Get drug price comparison
  async getPriceComparison(drugName, quantity) {
    try {
      const cacheKey = `${drugName}:${quantity}`;
      
      // Check cache (10 minutes TTL)
      if (this.priceCache.has(cacheKey)) {
        const cached = this.priceCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 600000) {
          return cached.data;
        }
      }

      const prices = [];

      for (const [supplierId, supplier] of Object.entries(this.suppliers)) {
        const priceInfo = await this.mockGetPrice(supplierId, drugName, quantity);
        
        prices.push({
          supplierId,
          supplierName: supplier.name,
          unitPrice: priceInfo.unitPrice,
          totalPrice: priceInfo.totalPrice,
          currency: 'NGN',
          deliveryTime: priceInfo.deliveryTime,
          minimumOrder: priceInfo.minimumOrder
        });
      }

      // Sort by price
      prices.sort((a, b) => a.totalPrice - b.totalPrice);

      // Cache the result
      this.priceCache.set(cacheKey, {
        data: prices,
        timestamp: Date.now()
      });

      return prices;
    } catch (error) {
      console.error('Error getting price comparison:', error);
      throw error;
    }
  }

  // Track order status
  async trackOrder(orderId) {
    try {
      // Get order from database
      const orderResult = await pool.query(
        'SELECT * FROM pharmacy_orders WHERE order_id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      // Simulate tracking update
      const trackingInfo = await this.mockTrackOrder(orderId, order);

      // Update order status if changed
      if (trackingInfo.status !== order.order_status) {
        await pool.query(
          'UPDATE pharmacy_orders SET order_status = $1, tracking_info = $2, updated_at = NOW() WHERE order_id = $3',
          [trackingInfo.status, JSON.stringify(trackingInfo), orderId]
        );
      }

      return trackingInfo;
    } catch (error) {
      console.error('Error tracking order:', error);
      throw error;
    }
  }

  // Get supplier catalog
  async getSupplierCatalog(supplierId, category = null) {
    try {
      const supplier = this.suppliers[supplierId];
      if (!supplier) {
        throw new Error(`Unknown supplier: ${supplierId}`);
      }

      // Simulate fetching catalog
      const catalog = await this.mockGetCatalog(supplierId, category);

      return {
        supplierId,
        supplierName: supplier.name,
        category,
        itemCount: catalog.items.length,
        items: catalog.items,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting supplier catalog:', error);
      throw error;
    }
  }

  // Mock functions for demonstration
  async mockCheckAvailability(supplierId, drugName, quantity) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const basePrice = Math.floor(Math.random() * 500) + 100; // NGN 100-600
    const available = Math.random() > 0.2; // 80% availability
    const inStock = Math.floor(Math.random() * 10000) + 500;

    return {
      available: available && inStock >= quantity,
      quantity: Math.min(quantity, inStock),
      unitPrice: basePrice,
      totalPrice: basePrice * quantity,
      currency: 'NGN',
      deliveryTime: `${Math.floor(Math.random() * 3) + 1} days`,
      inStock
    };
  }

  async mockOrderConfirmation(orderId, orderItems) {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      orderId,
      confirmationNumber: `CONF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      trackingNumber: `TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };
  }

  async mockGetPrice(supplierId, drugName, quantity) {
    await new Promise(resolve => setTimeout(resolve, 200));

    const basePrice = Math.floor(Math.random() * 500) + 100;
    const bulkDiscount = quantity > 1000 ? 0.9 : quantity > 500 ? 0.95 : 1;

    return {
      unitPrice: basePrice,
      totalPrice: basePrice * quantity * bulkDiscount,
      deliveryTime: `${Math.floor(Math.random() * 3) + 1} days`,
      minimumOrder: 100
    };
  }

  async mockTrackOrder(orderId, order) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statuses.indexOf(order.order_status);
    const nextStatus = currentIndex < statuses.length - 1 
      ? statuses[currentIndex + 1] 
      : order.order_status;

    return {
      orderId,
      status: nextStatus,
      trackingNumber: `TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      currentLocation: 'Lagos Distribution Center',
      estimatedDelivery: order.expected_delivery,
      deliveryProgress: ((currentIndex + 1) / statuses.length * 100).toFixed(0) + '%'
    };
  }

  async mockGetCatalog(supplierId, category) {
    await new Promise(resolve => setTimeout(resolve, 400));

    const items = Object.entries(this.medications)
      .filter(([name, info]) => !category || info.category === category)
      .map(([name, info]) => ({
        itemCode: `${supplierId}-${name}`,
        name: name.replace(/_/g, ' '),
        category: info.category,
        unit: info.unit,
        packSize: info.packSize,
        price: Math.floor(Math.random() * 500) + 100,
        availability: Math.random() > 0.2 ? 'in-stock' : 'out-of-stock'
      }));

    return { items };
  }
}

module.exports = new PharmacyIntegration();
