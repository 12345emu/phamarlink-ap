// Password generation utility
const crypto = require('crypto');

/**
 * Generate a secure random password
 * @param {number} length - Length of the password (default: 12)
 * @returns {string} Generated password
 */
function generatePassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  // Ensure at least one character from each category
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to randomize positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const bcrypt = require('bcrypt');
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Generate a temporary password and hash it
 * @param {number} length - Length of the password (default: 12)
 * @returns {Promise<{password: string, hash: string}>} Object with plain password and hash
 */
async function generateSecurePassword(length = 12) {
  const password = generatePassword(length);
  const hash = await hashPassword(password);
  
  return {
    password,
    hash
  };
}

module.exports = {
  generatePassword,
  hashPassword,
  generateSecurePassword
};
