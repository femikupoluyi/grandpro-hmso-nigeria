const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pharmacyIntegration = require('../integrations/pharmacyIntegrationEnhanced');
const logger = require('../utils/logger');

// Check drug availability across suppliers
router.post('/check-availability', authenticateToken, async (req, res) => {
  try {
    const { drugName, quantity, hospitalId } = req.body;
    
    if (!drugName || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drug name and quantity are required' 
      });
    }
    
    const availability = await pharmacyIntegration.checkDrugAvailability(
      drugName, 
      quantity, 
      hospitalId || req.user.hospitalId
    );
    
    logger.info('Drug availability checked', { drugName, quantity });
    res.json({ success: true, data: availability });
  } catch (error) {
    logger.error('Availability check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compare prices across suppliers
router.post('/compare-prices', authenticateToken, async (req, res) => {
  try {
    const { drugName, quantity } = req.body;
    
    const prices = await pharmacyIntegration.comparePrices(drugName, quantity);
    
    res.json({ success: true, data: prices });
  } catch (error) {
    logger.error('Price comparison error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Place order with supplier
router.post('/place-order', authenticateToken, authorizeRoles('admin', 'pharmacist', 'inventory_manager'), async (req, res) => {
  try {
    const { supplierId, items, hospitalId, urgency, deliveryAddress, notes } = req.body;
    
    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Supplier ID and items are required' 
      });
    }
    
    const order = await pharmacyIntegration.placeOrder(supplierId, {
      items,
      hospitalId: hospitalId || req.user.hospitalId,
      urgency,
      deliveryAddress,
      notes,
      paymentMethod: req.body.paymentMethod
    });
    
    logger.info('Order placed', { orderId: order.orderId, supplierId });
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Order placement error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track order status
router.get('/track-order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { supplierId } = req.query;
    
    if (!supplierId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Supplier ID is required' 
      });
    }
    
    const tracking = await pharmacyIntegration.trackOrder(orderId, supplierId);
    
    res.json({ success: true, data: tracking });
  } catch (error) {
    logger.error('Order tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set up automatic reordering
router.post('/setup-auto-reorder', authenticateToken, authorizeRoles('admin', 'pharmacist'), async (req, res) => {
  try {
    const { drugName, reorderPoint, reorderQuantity, hospitalId } = req.body;
    
    if (!drugName || !reorderPoint || !reorderQuantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drug name, reorder point, and reorder quantity are required' 
      });
    }
    
    const rule = await pharmacyIntegration.setupAutoReorder(
      drugName,
      hospitalId || req.user.hospitalId,
      reorderPoint,
      reorderQuantity
    );
    
    logger.info('Auto-reorder rule created', { ruleId: rule.ruleId });
    res.json({ success: true, data: rule });
  } catch (error) {
    logger.error('Auto-reorder setup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process automatic reorders
router.post('/process-auto-reorders', authenticateToken, authorizeRoles('admin', 'system'), async (req, res) => {
  try {
    const { hospitalId } = req.body;
    
    const orders = await pharmacyIntegration.processAutoReorders(
      hospitalId || req.user.hospitalId
    );
    
    logger.info('Auto-reorders processed', { count: orders.length });
    res.json({ success: true, data: { processed: orders.length, orders } });
  } catch (error) {
    logger.error('Auto-reorder processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook endpoint for supplier updates
router.post('/webhook/:supplierId', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const signature = req.headers['x-webhook-signature'];
    
    // Verify webhook signature (implementation depends on supplier)
    // For now, we'll accept all webhooks in sandbox mode
    
    const result = await pharmacyIntegration.handleWebhook(supplierId, req.body);
    
    logger.info('Webhook processed', { supplierId, event: req.body.event });
    res.json({ success: true, received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get supplier list
router.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = Object.entries(pharmacyIntegration.suppliers).map(([id, supplier]) => ({
      id,
      name: supplier.name,
      type: supplier.type,
      specialization: supplier.specialization
    }));
    
    res.json({ success: true, data: suppliers });
  } catch (error) {
    logger.error('Supplier list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
