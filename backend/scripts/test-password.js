// test-password.js
const bcrypt = require('bcryptjs');

async function testPassword() {
  const storedHash = '$2a$10$vLinc24UGvUR0Iq5iFuf6.BoW5a/9s4h0JIdO4dik54H09adNUaI2';
  const inputPassword = 'contraseña4';

  try {
    const result = await bcrypt.compare(inputPassword, storedHash);
    console.log(`La contraseña "${inputPassword}" ${result ? 'SÍ' : 'NO'} coincide con el hash.`);
  } catch (error) {
    console.error('Error al comparar:', error);
  }
}

testPassword();