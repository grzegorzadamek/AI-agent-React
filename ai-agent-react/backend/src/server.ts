import { app } from './app.js'
import { env } from './config/env.js'
import * as fs from 'fs';   // <-- masz już import, używaj go!

app.listen(env.PORT, () => {
  console.log('Current working directory:', process.cwd());
  console.log('GOOGLE_APPLICATION_CREDENTIALS path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log('File exists?', fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || ''));
  console.log(`Backend running on http://localhost:${env.PORT}`);
});