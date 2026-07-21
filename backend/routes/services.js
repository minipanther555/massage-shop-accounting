const express = require('express');

const router = express.Router();
const database = require('../models/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const requireManagerAuth = [authenticateToken, authorizeRole('manager')];

function normalizePromotionSettings(body) {
  const enabled = body.enabled === true || body.enabled === 'true' || body.enabled === 1;
  const startMinute = Number(body.start_minute);
  const endMinute = Number(body.end_minute);
  const graceMinutes = Number(body.manual_override_grace_minutes);

  if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute > 1439) {
    throw new Error('start_minute must be an integer from 0 through 1439');
  }
  if (!Number.isInteger(endMinute) || endMinute < 1 || endMinute > 1440) {
    throw new Error('end_minute must be an integer from 1 through 1440');
  }
  if (startMinute >= endMinute) {
    throw new Error('end_minute must be later than start_minute; use 1440 for midnight');
  }
  if (!Number.isInteger(graceMinutes) || graceMinutes < 0 || graceMinutes > 120) {
    throw new Error('manual_override_grace_minutes must be an integer from 0 through 120');
  }

  return {
    enabled,
    startMinute,
    endMinute,
    graceMinutes
  };
}

async function getPromotionSettings() {
  const settings = await database.get(
    `SELECT enabled, start_minute, end_minute, manual_override_grace_minutes, updated_at
     FROM time_window_promotion_settings WHERE id = 1`
  );
  return settings ? { ...settings, enabled: Boolean(settings.enabled) } : null;
}

// Get all services (admin view - includes inactive)
router.get('/', async (req, res) => {
  try {
    const { includeInactive = 'false' } = req.query;

    let sql = 'SELECT * FROM services';
    const params = [];

    if (includeInactive !== 'true') {
      sql += ' WHERE active = true';
    }

    sql += ' ORDER BY service_name ASC, duration_minutes ASC';

    const services = await database.all(sql, params);
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get all payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    const methods = await database.all(
      'SELECT * FROM payment_methods WHERE active = true ORDER BY method_name ASC'
    );
    res.json(methods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Manager-only branch-local time-window promotion configuration.
router.get('/promotion-settings', ...requireManagerAuth, async (req, res) => {
  try {
    const settings = await getPromotionSettings();
    if (!settings) return res.status(404).json({ error: 'Promotion settings are not initialized for this branch' });
    return res.json(settings);
  } catch (error) {
    console.error('Error fetching promotion settings:', error);
    return res.status(500).json({ error: 'Failed to fetch promotion settings' });
  }
});

router.put('/promotion-settings', ...requireManagerAuth, async (req, res) => {
  try {
    const settings = normalizePromotionSettings(req.body);
    await database.run(
      `UPDATE time_window_promotion_settings
       SET enabled = ?, start_minute = ?, end_minute = ?,
           manual_override_grace_minutes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [settings.enabled ? 1 : 0, settings.startMinute, settings.endMinute, settings.graceMinutes]
    );
    const updated = await getPromotionSettings();
    return res.json(updated);
  } catch (error) {
    if (error && error.message && error.message.includes('minute')) return res.status(400).json({ error: error.message });
    console.error('Error updating promotion settings:', error);
    return res.status(500).json({ error: 'Failed to update promotion settings' });
  }
});

// Get single service by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    const service = await database.get(
      'SELECT * FROM services WHERE id = ?',
      [parseInt(id)]
    );

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Add new service
router.post('/', async (req, res) => {
  try {
    const {
      service_name,
      duration_minutes,
      location,
      price,
      masseuse_fee,
      active = true
    } = req.body;

    // Validate required fields
    if (!service_name || !duration_minutes || !location || !price || !masseuse_fee) {
      return res.status(400).json({
        error: 'Missing required fields: service_name, duration_minutes, location, price, masseuse_fee'
      });
    }

    // Validate data types
    if (isNaN(parseInt(duration_minutes)) || parseInt(duration_minutes) <= 0) {
      return res.status(400).json({ error: 'duration_minutes must be a positive integer' });
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }

    if (isNaN(parseFloat(masseuse_fee)) || parseFloat(masseuse_fee) < 0) {
      return res.status(400).json({ error: 'masseuse_fee must be a non-negative number' });
    }

    // Validate location
    if (!['In-Shop', 'Home Service'].includes(location)) {
      return res.status(400).json({ error: 'location must be either "In-Shop" or "Home Service"' });
    }

    const result = await database.run(
      'INSERT INTO services (service_name, duration_minutes, location, price, masseuse_fee, active) VALUES (?, ?, ?, ?, ?, ?)',
      [service_name, parseInt(duration_minutes), location, parseFloat(price), parseFloat(masseuse_fee), active]
    );

    const newService = await database.get(
      'SELECT * FROM services WHERE id = ?',
      [result.id]
    );

    res.status(201).json(newService);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({
        error: 'Service already exists with this name, duration, and location combination'
      });
    } else {
      console.error('Error creating service:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
});

// Bulk update services (for price increases, etc.)
router.patch('/bulk/update', async (req, res) => {
  try {
    const {
      serviceIds,
      updates,
      filters = {}
    } = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates specified' });
    }

    // Validate updates
    const allowedFields = ['price', 'masseuse_fee', 'active'];
    for (const field of Object.keys(updates)) {
      if (!allowedFields.includes(field)) {
        return res.status(400).json({ error: `Field '${field}' cannot be updated in bulk` });
      }
    }

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const whereValues = [];

    if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
      whereClause += ` AND id IN (${serviceIds.map(() => '?').join(',')})`;
      whereValues.push(...serviceIds);
    }

    if (filters.location) {
      whereClause += ' AND location = ?';
      whereValues.push(filters.location);
    }

    if (filters.serviceType) {
      whereClause += ' AND service_name = ?';
      whereValues.push(filters.serviceType);
    }

    if (filters.active !== undefined) {
      whereClause += ' AND active = ?';
      whereValues.push(filters.active);
    }

    // Check for multipliers first
    const hasMultipliers = Object.values(updates).some((v) => typeof v === 'string' && v.startsWith('multiply:'));

    if (hasMultipliers) {
      // For multipliers, fetch current values first, then update each selected service.
      const selectSql = `SELECT id, price, masseuse_fee FROM services ${whereClause}`;
      const currentServices = await database.all(selectSql, whereValues);

      let totalChanges = 0;
      for (const service of currentServices) {
        const updateParts = [];
        const updateValues = [];

        for (const [field, value] of Object.entries(updates)) {
          if (typeof value === 'string' && value.startsWith('multiply:')) {
            const multiplier = parseFloat(value.split(':')[1]);
            if (isNaN(multiplier) || multiplier <= 0) {
              return res.status(400).json({ error: `Invalid multiplier value for ${field}` });
            }
            const currentValue = service[field];
            const newValue = Math.round(currentValue * multiplier * 100) / 100;
            updateParts.push(`${field} = ?`);
            updateValues.push(newValue);
          } else {
            updateParts.push(`${field} = ?`);
            updateValues.push(value);
          }
        }

        const updateSql = `UPDATE services SET ${updateParts.join(', ')} WHERE id = ?`;
        await database.run(updateSql, [...updateValues, service.id]);
        totalChanges++;
      }

      res.json({
        message: `Successfully updated ${totalChanges} service(s)`,
        changes: totalChanges
      });
      return;
    }

    // For non-multiplier updates, build SET clause
    const setClause = Object.keys(updates).map((field) => `${field} = ?`).join(', ');
    const setValues = [];

    for (const [field, value] of Object.entries(updates)) {
      // Handle direct value updates
      if (field === 'price' || field === 'masseuse_fee') {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          return res.status(400).json({ error: `${field} must be a non-negative number` });
        }
        setValues.push(parseFloat(value));
      } else {
        setValues.push(value);
      }
    }

    // Simple direct value update
    const sql = `UPDATE services SET ${setClause} ${whereClause}`;
    const allValues = [...setValues, ...whereValues];

    const result = await database.run(sql, allValues);

    res.json({
      message: `Successfully updated ${result.changes} service(s)`,
      changes: result.changes
    });
  } catch (error) {
    console.error('Error bulk updating services:', error);
    res.status(500).json({ error: 'Failed to bulk update services' });
  }
});

// Update service
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    // Check if service exists
    const existingService = await database.get(
      'SELECT * FROM services WHERE id = ?',
      [parseInt(id)]
    );

    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Build update query dynamically
    const allowedFields = ['service_name', 'duration_minutes', 'location', 'price', 'masseuse_fee', 'active'];
    const updates = [];
    const values = [];

    for (const [field, value] of Object.entries(updateData)) {
      if (allowedFields.includes(field)) {
        updates.push(`${field} = ?`);

        // Validate and transform values
        if (field === 'duration_minutes') {
          if (isNaN(parseInt(value)) || parseInt(value) <= 0) {
            return res.status(400).json({ error: 'duration_minutes must be a positive integer' });
          }
          values.push(parseInt(value));
        } else if (field === 'price' || field === 'masseuse_fee') {
          if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
            return res.status(400).json({ error: `${field} must be a non-negative number` });
          }
          values.push(parseFloat(value));
        } else if (field === 'location') {
          if (!['In-Shop', 'Home Service'].includes(value)) {
            return res.status(400).json({ error: 'location must be either "In-Shop" or "Home Service"' });
          }
          values.push(value);
        } else if (field === 'active') {
          values.push(Boolean(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(parseInt(id)); // Add ID for WHERE clause

    const sql = `UPDATE services SET ${updates.join(', ')} WHERE id = ?`;
    await database.run(sql, values);

    // Return updated service
    const updatedService = await database.get(
      'SELECT * FROM services WHERE id = ?',
      [parseInt(id)]
    );

    res.json(updatedService);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({
        error: 'Service already exists with this name, duration, and location combination'
      });
    } else {
      console.error('Error updating service:', error);
      res.status(500).json({ error: 'Failed to update service' });
    }
  }
});

// Delete service (permanent deletion)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    // Check if service exists
    const existingService = await database.get(
      'SELECT * FROM services WHERE id = ?',
      [parseInt(id)]
    );

    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Permanently delete the service
    await database.run(
      'DELETE FROM services WHERE id = ?',
      [parseInt(id)]
    );

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Add new payment method
router.post('/payment-methods', async (req, res) => {
  try {
    const { method_name } = req.body;

    if (!method_name) {
      return res.status(400).json({ error: 'Missing method_name' });
    }

    const result = await database.run(
      'INSERT INTO payment_methods (method_name) VALUES (?)',
      [method_name]
    );

    const newMethod = await database.get(
      'SELECT * FROM payment_methods WHERE id = ?',
      [result.id]
    );

    res.status(201).json(newMethod);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Payment method already exists' });
    } else {
      console.error('Error creating payment method:', error);
      res.status(500).json({ error: 'Failed to create payment method' });
    }
  }
});

module.exports = router;
