const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Global search across multiple entities
router.get('/global', [
  query('q').isLength({ min: 1 }).withMessage('Search query is required'),
  query('type').optional().isIn(['all', 'medicines', 'facilities', 'doctors', 'pharmacies']).withMessage('Invalid search type'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('lat').optional().isFloat().withMessage('Latitude must be a valid number'),
  query('lng').optional().isFloat().withMessage('Longitude must be a valid number'),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q, type = 'all', page = 1, limit = 20, lat, lng, radius = 10 } = req.query;
    const offset = (page - 1) * limit;
    const searchTerm = `%${q}%`;

    let results = {};
    let totalCount = 0;

    // Search medicines
    if (type === 'all' || type === 'medicines') {
      const medicineQuery = `
        SELECT 
          m.id, m.name, m.description, m.category, m.manufacturer,
          m.price, m.prescription_required, m.stock_quantity,
          f.id as facility_id, f.name as facility_name, f.type as facility_type,
          f.latitude, f.longitude, f.address
        FROM medicines m
        LEFT JOIN pharmacy_medicines pm ON m.id = pm.medicine_id
        LEFT JOIN healthcare_facilities f ON pm.facility_id = f.id
        WHERE (m.name LIKE ? OR m.description LIKE ? OR m.category LIKE ? OR m.manufacturer LIKE ?)
        AND m.deleted_at IS NULL
        AND (f.deleted_at IS NULL OR f.deleted_at IS NULL)
        ${lat && lng ? 'AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL' : ''}
        ORDER BY 
          CASE 
            WHEN m.name LIKE ? THEN 1
            WHEN m.name LIKE ? THEN 2
            ELSE 3
          END,
          m.name
        LIMIT ? OFFSET ?
      `;

      const medicineParams = [
        searchTerm, searchTerm, searchTerm, searchTerm,
        q, searchTerm,
        parseInt(limit), offset
      ];

      const medicines = await db.executeQuery(medicineQuery, medicineParams);

      // Apply distance filtering if coordinates provided
      if (lat && lng) {
        const filteredMedicines = medicines.filter(medicine => {
          if (!medicine.latitude || !medicine.longitude) return false;
          const distance = calculateDistance(
            parseFloat(lat), parseFloat(lng),
            parseFloat(medicine.latitude), parseFloat(medicine.longitude)
          );
          return distance <= radius;
        });

        results.medicines = filteredMedicines;
        totalCount += filteredMedicines.length;
      } else {
        results.medicines = medicines;
        totalCount += medicines.length;
      }
    }

    // Search healthcare facilities
    if (type === 'all' || type === 'facilities') {
      let facilityQuery = `
        SELECT 
          f.id, f.name, f.type, f.description, f.address, f.phone, f.email,
          f.latitude, f.longitude, f.rating, f.review_count,
          f.opening_hours, f.services, f.insurance_accepted
        FROM healthcare_facilities f
        WHERE (f.name LIKE ? OR f.description LIKE ? OR f.services LIKE ?)
        AND f.deleted_at IS NULL
      `;

      const facilityParams = [searchTerm, searchTerm, searchTerm];

      if (lat && lng) {
        facilityQuery += ' AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL';
      }

      facilityQuery += `
        ORDER BY 
          CASE 
            WHEN f.name LIKE ? THEN 1
            WHEN f.name LIKE ? THEN 2
            ELSE 3
          END,
          f.rating DESC, f.review_count DESC
        LIMIT ? OFFSET ?
      `;

      facilityParams.push(q, searchTerm, parseInt(limit), offset);

      const facilities = await db.executeQuery(facilityQuery, facilityParams);

      // Apply distance filtering if coordinates provided
      if (lat && lng) {
        const filteredFacilities = facilities.filter(facility => {
          if (!facility.latitude || !facility.longitude) return false;
          const distance = calculateDistance(
            parseFloat(lat), parseFloat(lng),
            parseFloat(facility.latitude), parseFloat(facility.longitude)
          );
          return distance <= radius;
        });

        results.facilities = filteredFacilities;
        totalCount += filteredFacilities.length;
      } else {
        results.facilities = facilities;
        totalCount += facilities.length;
      }
    }

    // Search doctors (healthcare professionals)
    if (type === 'all' || type === 'doctors') {
      const doctorQuery = `
        SELECT 
          u.id, u.first_name, u.last_name, u.email, u.profile_picture,
          up.specialization, up.license_number, up.years_experience,
          f.id as facility_id, f.name as facility_name, f.type as facility_type,
          f.latitude, f.longitude, f.address
        FROM users u
        LEFT JOIN patient_profiles up ON u.id = up.user_id
        LEFT JOIN healthcare_facilities f ON up.facility_id = f.id
        WHERE u.role = 'doctor' 
        AND u.deleted_at IS NULL
        AND (up.specialization LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)
        ${lat && lng ? 'AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL' : ''}
        ORDER BY 
          CASE 
            WHEN (u.first_name LIKE ? OR u.last_name LIKE ?) THEN 1
            WHEN up.specialization LIKE ? THEN 2
            ELSE 3
          END,
          u.first_name, u.last_name
        LIMIT ? OFFSET ?
      `;

      const doctorParams = [
        searchTerm, searchTerm, searchTerm,
        q, q, searchTerm,
        parseInt(limit), offset
      ];

      const doctors = await db.executeQuery(doctorQuery, doctorParams);

      // Apply distance filtering if coordinates provided
      if (lat && lng) {
        const filteredDoctors = doctors.filter(doctor => {
          if (!doctor.latitude || !doctor.longitude) return false;
          const distance = calculateDistance(
            parseFloat(lat), parseFloat(lng),
            parseFloat(doctor.latitude), parseFloat(doctor.longitude)
          );
          return distance <= radius;
        });

        results.doctors = filteredDoctors;
        totalCount += filteredDoctors.length;
      } else {
        results.doctors = doctors;
        totalCount += doctors.length;
      }
    }

    // Search pharmacies specifically
    if (type === 'all' || type === 'pharmacies') {
      const pharmacyQuery = `
        SELECT 
          f.id, f.name, f.description, f.address, f.phone, f.email,
          f.latitude, f.longitude, f.rating, f.review_count,
          f.opening_hours, f.services, f.insurance_accepted,
          COUNT(DISTINCT pm.medicine_id) as medicine_count
        FROM healthcare_facilities f
        LEFT JOIN pharmacy_medicines pm ON f.id = pm.facility_id
        WHERE f.type = 'pharmacy'
        AND (f.name LIKE ? OR f.description LIKE ? OR f.services LIKE ?)
        AND f.deleted_at IS NULL
        ${lat && lng ? 'AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL' : ''}
        GROUP BY f.id
        ORDER BY 
          CASE 
            WHEN f.name LIKE ? THEN 1
            WHEN f.name LIKE ? THEN 2
            ELSE 3
          END,
          f.rating DESC, medicine_count DESC
        LIMIT ? OFFSET ?
      `;

      const pharmacyParams = [
        searchTerm, searchTerm, searchTerm,
        q, searchTerm,
        parseInt(limit), offset
      ];

      const pharmacies = await db.executeQuery(pharmacyQuery, pharmacyParams);

      // Apply distance filtering if coordinates provided
      if (lat && lng) {
        const filteredPharmacies = pharmacies.filter(pharmacy => {
          if (!pharmacy.latitude || !pharmacy.longitude) return false;
          const distance = calculateDistance(
            parseFloat(lat), parseFloat(lng),
            parseFloat(pharmacy.latitude), parseFloat(pharmacy.longitude)
          );
          return distance <= radius;
        });

        results.pharmacies = filteredPharmacies;
        totalCount += filteredPharmacies.length;
      } else {
        results.pharmacies = pharmacies;
        totalCount += pharmacies.length;
      }
    }

    res.json({
      query: q,
      type,
      results,
      total_count: totalCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      filters: {
        location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng), radius: parseFloat(radius) } : null
      }
    });

  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced medicine search
router.get('/medicines', [
  query('q').optional().isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('category').optional().isLength({ min: 1 }).withMessage('Category must not be empty'),
  query('manufacturer').optional().isLength({ min: 1 }).withMessage('Manufacturer must not be empty'),
  query('prescription_required').optional().isBoolean().withMessage('Prescription required must be boolean'),
  query('min_price').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('max_price').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('in_stock').optional().isBoolean().withMessage('In stock must be boolean'),
  query('lat').optional().isFloat().withMessage('Latitude must be a valid number'),
  query('lng').optional().isFloat().withMessage('Longitude must be a valid number'),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort').optional().isIn(['name', 'price', 'rating', 'distance']).withMessage('Invalid sort option'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      q, category, manufacturer, prescription_required, min_price, max_price,
      in_stock, lat, lng, radius = 10, page = 1, limit = 20,
      sort = 'name', order = 'asc'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE m.deleted_at IS NULL';
    const params = [];

    if (q) {
      whereClause += ' AND (m.name LIKE ? OR m.description LIKE ? OR m.category LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      whereClause += ' AND m.category = ?';
      params.push(category);
    }

    if (manufacturer) {
      whereClause += ' AND m.manufacturer = ?';
      params.push(manufacturer);
    }

    if (prescription_required !== undefined) {
      whereClause += ' AND m.prescription_required = ?';
      params.push(prescription_required === 'true' ? 1 : 0);
    }

    if (min_price !== undefined) {
      whereClause += ' AND m.price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price !== undefined) {
      whereClause += ' AND m.price <= ?';
      params.push(parseFloat(max_price));
    }

    if (in_stock !== undefined) {
      if (in_stock === 'true') {
        whereClause += ' AND m.stock_quantity > 0';
      } else {
        whereClause += ' AND m.stock_quantity = 0';
      }
    }

    let joinClause = 'LEFT JOIN pharmacy_medicines pm ON m.id = pm.medicine_id';
    let facilityJoin = 'LEFT JOIN healthcare_facilities f ON pm.facility_id = f.id';

    if (lat && lng) {
      whereClause += ' AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL';
    }

    let orderClause = `ORDER BY m.${sort} ${order.toUpperCase()}`;
    if (sort === 'distance' && lat && lng) {
      // For distance sorting, we'll need to calculate distances in the query
      orderClause = 'ORDER BY distance ASC';
    }

    const query = `
      SELECT 
        m.id, m.name, m.description, m.category, m.manufacturer,
        m.price, m.prescription_required, m.stock_quantity,
        f.id as facility_id, f.name as facility_name, f.type as facility_type,
        f.latitude, f.longitude, f.address, f.rating as facility_rating
        ${lat && lng ? ', (6371 * acos(cos(radians(?)) * cos(radians(f.latitude)) * cos(radians(f.longitude) - radians(?)) + sin(radians(?)) * sin(radians(f.latitude)))) as distance' : ''}
      FROM medicines m
      ${joinClause}
      ${facilityJoin}
      ${whereClause}
      ${lat && lng ? 'HAVING distance <= ?' : ''}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    if (lat && lng) {
      params.push(parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius), parseInt(limit), offset);
    } else {
      params.push(parseInt(limit), offset);
    }

    const medicines = await db.executeQuery(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM medicines m
      ${joinClause}
      ${facilityJoin}
      ${whereClause}
      ${lat && lng ? 'HAVING distance <= ?' : ''}
    `;

    const countParams = lat && lng ? params.slice(0, -2) : params.slice(0, -2);
    const countResult = await db.executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      medicines,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        query: q,
        category,
        manufacturer,
        prescription_required,
        price_range: min_price || max_price ? { min: min_price, max: max_price } : null,
        in_stock,
        location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng), radius: parseFloat(radius) } : null
      },
      sort: { field: sort, order: order.toUpperCase() }
    });

  } catch (error) {
    console.error('Error in medicine search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Symptom-based medicine search
router.get('/medicines/symptoms', [
  query('symptoms').isArray({ min: 1 }).withMessage('At least one symptom is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { symptoms, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // This is a basic implementation - in a real app, you'd have a symptoms-to-medicines mapping table
    const symptomTerms = symptoms.map(symptom => `%${symptom}%`);
    const placeholders = symptomTerms.map(() => '?').join(' OR ');

    const query = `
      SELECT 
        m.id, m.name, m.description, m.category, m.manufacturer,
        m.price, m.prescription_required, m.stock_quantity,
        COUNT(CASE WHEN m.stock_quantity > 0 THEN 1 END) as available_facilities
      FROM medicines m
      WHERE m.deleted_at IS NULL
      AND (
        m.description LIKE ${placeholders}
        OR m.category LIKE ${placeholders}
        OR m.name LIKE ${placeholders}
      )
      GROUP BY m.id
      ORDER BY available_facilities DESC, m.name
      LIMIT ? OFFSET ?
    `;

    const params = [...symptomTerms, ...symptomTerms, ...symptomTerms, parseInt(limit), offset];
    const medicines = await db.executeQuery(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM medicines m
      WHERE m.deleted_at IS NULL
      AND (
        m.description LIKE ${placeholders}
        OR m.category LIKE ${placeholders}
        OR m.name LIKE ${placeholders}
      )
    `;

    const countParams = [...symptomTerms, ...symptomTerms, ...symptomTerms];
    const countResult = await db.executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      symptoms,
      medicines,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error in symptom-based search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router; 