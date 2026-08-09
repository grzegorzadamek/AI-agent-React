import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'service-account.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const emailToDelete = 'softwaremind.tester@gmail.com';

admin.auth().getUserByEmail(emailToDelete)
  .then(userRecord => {
    console.log('Znaleziono użytkownika:', userRecord.uid);
    return admin.auth().deleteUser(userRecord.uid);
  })
  .then(() => {
    console.log(`✅ Użytkownik ${emailToDelete} został usunięty z Authentication.`);
  })
  .catch(error => {
    if (error.code === 'auth/user-not-found') {
      console.log(`❌ Użytkownik ${emailToDelete} nie istnieje w Authentication.`);
    } else {
      console.error('Błąd:', error);
    }
  });