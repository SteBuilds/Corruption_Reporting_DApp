const https = require("https");
const fs = require("fs");

// Vos clés d'API Infura
const projectId = "xxx";
const projectSecret = "xxx";

/* // Fonction pour ajouter un fichier à IPFS via Infura
async function addFile(filePath) {
    // Lecture du fichier
    const fileData = fs.readFileSync(filePath);
    // Extraction du nom du fichier à partir du chemin
    const fileName = filePath.split("/").pop();
  
    // Création d'une frontière pour la requête multipart
    const boundary = "--------------------------" + Date.now().toString(16);
    // Construction du corps de la requête
    const data = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="' + fileName + '"',
      'Content-Type: application/octet-stream',
      "",
      fileData,
      `--${boundary}--`,
    ].join("\r\n");
  
    // Options pour la requête HTTPS
    const options = {
      host: "ipfs.infura.io",
      port: 5001,
      path: "/api/v0/add",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        // Authentification basique avec les clés d'API
        Authorization: `Basic ${Buffer.from(projectId + ":" + projectSecret).toString("base64")}`,
        "Content-Length": Buffer.byteLength(data),
      },
    };
  
    // Envoi de la requête et traitement de la réponse
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          // Récupération du CID à partir de la réponse
          const result = JSON.parse(body);
          resolve(result.Hash);
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  }
  
  async function run() {
    // Lire et ajouter le fichier evidence_encrypted.zip à IPFS
    const evidenceCid = await addFile("evidence_encrypted.zip");
    console.log("Evidence CID:", evidenceCid);
    // Écrire le CID dans un fichier
    fs.writeFileSync("evidence_cid", evidenceCid);
  
    // Lire et ajouter le fichier names_encrypted.zip à IPFS
    const namesCid = await addFile("names_encrypted.zip");
    console.log("Names CID:", namesCid);
    // Écrire le CID dans un fichier
    fs.writeFileSync("names_cid", namesCid);
  }
  
  run().catch((error) => {
    console.error("Erreur : ", error);
  }); */
  
  async function addFile(filePath) {
    // Lecture du fichier
    const fileData = fs.readFileSync(filePath);
    const fileName = filePath.split('/').pop();
  
    // Création d'une frontière pour la requête multipart
    const boundary = '--------------------------' + Date.now().toString(16);
  
    // Définition de l'en-tête
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--`;
  
    // Calcul de la longueur totale des données
    const totalLength = header.length + fileData.length + footer.length;
  
    // Options pour la requête HTTPS
    const options = {
      host: 'ipfs.infura.io',
      port: 5001,
      path: '/api/v0/add',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Basic ${Buffer.from(projectId + ':' + projectSecret).toString('base64')}`,
        'Content-Length': totalLength,
      },
    };
  
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          // Récupération du CID à partir de la réponse
          const result = JSON.parse(body);
          resolve(result.Hash);
        });
      });
      req.on('error', reject);
      req.write(header); // Écrire l'en-tête
      req.write(fileData); // Écrire le fichier
      req.write(footer); // Écrire le pied de page
      req.end();
    });
  }
  
  async function run() {
    // Lire et ajouter le fichier evidence_encrypted.zip à IPFS
    const evidenceCid = await addFile("evidence_encrypted.zip");
    console.log("Evidence CID:", evidenceCid);
    // Écrire le CID dans un fichier
    fs.writeFileSync("evidence_cid", evidenceCid);
  
    // Lire et ajouter le fichier names_encrypted.zip à IPFS
    const namesCid = await addFile("names_encrypted.zip");
    console.log("Names CID:", namesCid);
    // Écrire le CID dans un fichier
    fs.writeFileSync("names_cid", namesCid);
  }
  
  run().catch((error) => {
    console.error("Erreur : ", error);
  });
  
