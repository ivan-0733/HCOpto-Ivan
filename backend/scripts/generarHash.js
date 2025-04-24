const bcrypt = require('bcryptjs');

async function generarHash() {
  const plainPassword = 'contraseña8';
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(plainPassword, saltRounds);
    console.log(`Hash generado para "${plainPassword}": ${hash}`);
  } catch (error) {
    console.error('Error generando hash:', error);
  }
}

generarHash();