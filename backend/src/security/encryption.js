const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

class EncryptionService {
  constructor() {
    // Use environment variable or generate a secure key
    this.algorithm = 'aes-256-gcm';
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY || this.generateMasterKey();
    this.saltRounds = 12;
    
    // Initialize key derivation
    this.initializeKeyDerivation();
  }

  // Initialize key derivation for different data types
  initializeKeyDerivation() {
    this.dataKeys = {
      pii: this.deriveKey('pii_data'),
      medical: this.deriveKey('medical_records'),
      financial: this.deriveKey('financial_data'),
      session: this.deriveKey('session_data')
    };
  }

  // Generate master key (should be stored securely)
  generateMasterKey() {
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('Generated new master key. Store this securely: ', key.substring(0, 10) + '...');
    return key;
  }

  // Derive a key from master key for specific purpose
  deriveKey(purpose) {
    return crypto.pbkdf2Sync(
      this.masterKey,
      purpose,
      100000,
      32,
      'sha256'
    );
  }

  // Encrypt data at rest
  encryptData(text, dataType = 'pii') {
    try {
      const key = this.dataKeys[dataType] || this.dataKeys.pii;
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Return encrypted data with IV and auth tag
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        version: '1.0'
      };
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data
  decryptData(encryptedData, dataType = 'pii') {
    try {
      const key = this.dataKeys[dataType] || this.dataKeys.pii;
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash passwords
  async hashPassword(password) {
    try {
      // Check password strength
      if (!this.isPasswordStrong(password)) {
        throw new Error('Password does not meet security requirements');
      }
      
      const salt = await bcrypt.genSalt(this.saltRounds);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (error) {
      logger.error('Password hashing error:', error);
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification error:', error);
      return false;
    }
  }

  // Check password strength
  isPasswordStrong(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  // Encrypt PII (Personally Identifiable Information)
  encryptPII(data) {
    const fieldsToEncrypt = ['ssn', 'nationalId', 'phoneNumber', 'email', 'address'];
    const encryptedData = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (data[field]) {
        encryptedData[field] = this.encryptData(data[field], 'pii');
      }
    }
    
    return encryptedData;
  }

  // Decrypt PII
  decryptPII(data) {
    const fieldsToDecrypt = ['ssn', 'nationalId', 'phoneNumber', 'email', 'address'];
    const decryptedData = { ...data };
    
    for (const field of fieldsToDecrypt) {
      if (data[field] && typeof data[field] === 'object' && data[field].encrypted) {
        try {
          decryptedData[field] = this.decryptData(data[field], 'pii');
        } catch (error) {
          logger.error(`Failed to decrypt field ${field}:`, error);
          decryptedData[field] = '[DECRYPTION_ERROR]';
        }
      }
    }
    
    return decryptedData;
  }

  // Encrypt medical records
  encryptMedicalRecord(record) {
    const sensitiveFields = ['diagnosis', 'treatment', 'medications', 'labResults'];
    const encryptedRecord = { ...record };
    
    for (const field of sensitiveFields) {
      if (record[field]) {
        const dataToEncrypt = typeof record[field] === 'object' 
          ? JSON.stringify(record[field]) 
          : record[field];
        encryptedRecord[field] = this.encryptData(dataToEncrypt, 'medical');
      }
    }
    
    return encryptedRecord;
  }

  // Decrypt medical records
  decryptMedicalRecord(record) {
    const sensitiveFields = ['diagnosis', 'treatment', 'medications', 'labResults'];
    const decryptedRecord = { ...record };
    
    for (const field of sensitiveFields) {
      if (record[field] && typeof record[field] === 'object' && record[field].encrypted) {
        try {
          const decrypted = this.decryptData(record[field], 'medical');
          // Parse JSON if the original was an object
          try {
            decryptedRecord[field] = JSON.parse(decrypted);
          } catch {
            decryptedRecord[field] = decrypted;
          }
        } catch (error) {
          logger.error(`Failed to decrypt medical field ${field}:`, error);
          decryptedRecord[field] = '[DECRYPTION_ERROR]';
        }
      }
    }
    
    return decryptedRecord;
  }

  // Encrypt financial data
  encryptFinancialData(data) {
    const sensitiveFields = ['accountNumber', 'routingNumber', 'creditCardNumber', 'cvv'];
    const encryptedData = { ...data };
    
    for (const field of sensitiveFields) {
      if (data[field]) {
        encryptedData[field] = this.encryptData(data[field], 'financial');
      }
    }
    
    return encryptedData;
  }

  // Generate secure token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate session token
  generateSessionToken(userId, expiresIn = 3600) {
    const payload = {
      userId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (expiresIn * 1000),
      nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const token = this.encryptData(JSON.stringify(payload), 'session');
    return Buffer.from(JSON.stringify(token)).toString('base64');
  }

  // Verify session token
  verifySessionToken(token) {
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      const payload = JSON.parse(this.decryptData(tokenData, 'session'));
      
      if (payload.expiresAt < Date.now()) {
        throw new Error('Token expired');
      }
      
      return payload;
    } catch (error) {
      logger.error('Session token verification error:', error);
      return null;
    }
  }

  // Anonymize data for analytics
  anonymizeData(data) {
    const anonymized = { ...data };
    
    // Remove direct identifiers
    delete anonymized.name;
    delete anonymized.email;
    delete anonymized.phone;
    delete anonymized.address;
    delete anonymized.nationalId;
    delete anonymized.ssn;
    
    // Hash quasi-identifiers
    if (anonymized.dateOfBirth) {
      // Keep only year for age range
      anonymized.ageRange = this.getAgeRange(new Date(anonymized.dateOfBirth));
      delete anonymized.dateOfBirth;
    }
    
    if (anonymized.zipCode) {
      // Keep only first 3 digits
      anonymized.zipCodePrefix = anonymized.zipCode.substring(0, 3);
      delete anonymized.zipCode;
    }
    
    // Generate anonymous ID
    anonymized.anonymousId = crypto.createHash('sha256')
      .update(`${data.id || ''}${Date.now()}`)
      .digest('hex');
    
    return anonymized;
  }

  // Get age range for anonymization
  getAgeRange(dateOfBirth) {
    const age = Math.floor((Date.now() - dateOfBirth) / (365 * 24 * 60 * 60 * 1000));
    if (age < 18) return '0-17';
    if (age < 30) return '18-29';
    if (age < 40) return '30-39';
    if (age < 50) return '40-49';
    if (age < 60) return '50-59';
    if (age < 70) return '60-69';
    return '70+';
  }

  // Encrypt file
  async encryptFile(buffer, filename) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.dataKeys.medical, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        originalName: filename,
        encryptedAt: new Date()
      };
    } catch (error) {
      logger.error('File encryption error:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  // Decrypt file
  async decryptFile(encryptedData) {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.dataKeys.medical, iv);
      
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encryptedData.encrypted),
        decipher.final()
      ]);
      
      return decrypted;
    } catch (error) {
      logger.error('File decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  // Generate data encryption key for database field-level encryption
  generateDataEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Rotate encryption keys
  async rotateKeys() {
    logger.info('Starting key rotation process...');
    
    // Generate new keys
    const newMasterKey = this.generateMasterKey();
    const oldKeys = this.dataKeys;
    
    // Update keys
    this.masterKey = newMasterKey;
    this.initializeKeyDerivation();
    
    // Store key rotation record (in production, use secure key management service)
    const rotationRecord = {
      timestamp: new Date(),
      oldKeyHash: crypto.createHash('sha256').update(JSON.stringify(oldKeys)).digest('hex'),
      newKeyHash: crypto.createHash('sha256').update(JSON.stringify(this.dataKeys)).digest('hex'),
      version: Date.now()
    };
    
    logger.info('Key rotation completed', rotationRecord);
    return rotationRecord;
  }

  // Secure data transmission
  createSecureTransmission(data, recipientPublicKey) {
    // Generate ephemeral key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    // Encrypt data with AES
    const sessionKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', sessionKey, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Encrypt session key with recipient's public key
    const encryptedSessionKey = crypto.publicEncrypt(
      recipientPublicKey,
      sessionKey
    );
    
    return {
      encryptedData: encrypted,
      encryptedSessionKey: encryptedSessionKey.toString('base64'),
      iv: iv.toString('hex'),
      senderPublicKey: publicKey,
      timestamp: Date.now()
    };
  }
}

module.exports = new EncryptionService();
