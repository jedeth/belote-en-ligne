// test-https.js
const https = require('https');
const fs = require('fs');

console.log('Démarrage du serveur de test HTTPS...');

try {
  // On s'assure que les fichiers de certificat existent
  const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  };

  https.createServer(options, (req, res) => {
    res.writeHead(200);
    res.end('Bonjour, le serveur HTTPS de test fonctionne !');
  }).listen(8443, () => {
    console.log('Mini-serveur de test démarré. Rendez-vous sur https://localhost:8443');
  });

} catch (error) {
  console.error('\nERREUR: Impossible de lire les fichiers key.pem et cert.pem.');
  console.error('Veuillez vous assurer qu\'ils sont bien à la racine du projet.\n');
}