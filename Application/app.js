const express = require('express');
const app = express();
const path = require('path');
const rsaKeysFolder = 'Clés RSA';

const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const crypto = require('crypto');

const { generateKeyPairSync } = require('crypto');

const { exec } = require('child_process');

// Générer une clé AES aléatoire
const aesKey = crypto.randomBytes(32);

// Chiffrer les données avec AES
function encryptWithAES(inputFilePath, outputFilePath, callback) {
    try {
      const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, Buffer.alloc(16, 0));
      const input = fs.createReadStream(inputFilePath);
      const output = fs.createWriteStream(outputFilePath);
  
      // Gérer les erreurs de flux
      input.on('error', callback);
      output.on('error', callback);
  
      // Chiffrer le fichier
      input.pipe(cipher).pipe(output);
  
      // Appeler le callback à la fin du chiffrement
      output.on('finish', () => callback(null));
    } catch (err) {
      callback(err);
    }
  }

// Vérifie si le dossier avec les clés existe, sinon le crée
if (!fs.existsSync(rsaKeysFolder)) {
    fs.mkdirSync(rsaKeysFolder);
}

// Fonction pour générer et sauvegarder une paire de clés
function generateAndSaveKeys(publicKeyName, privateKeyName) {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });

    try {
        fs.writeFileSync(path.join(rsaKeysFolder, publicKeyName), publicKey.export({
            type: 'pkcs1',
            format: 'pem',
        }));
    } catch (error) {
        console.error('Une erreur est survenue lors de l\'écriture du fichier:', error);
    }

    try {
        fs.writeFileSync(path.join(rsaKeysFolder, privateKeyName), privateKey.export({
            type: 'pkcs1',
            format: 'pem',
        }));
    } catch (error) {
        console.error('Une erreur est survenue lors de l\'écriture du fichier:', error);
    }
}

// Vérifie si la première paire de clés existe, sinon les génère
if (!fs.existsSync(path.join(rsaKeysFolder, 'public_key1.pem')) || !fs.existsSync(path.join(rsaKeysFolder, 'private_key1.pem'))) {
    generateAndSaveKeys('public_key1.pem', 'private_key1.pem');
}

// Vérifie si la deuxième paire de clés existe, sinon les génère
if (!fs.existsSync(path.join(rsaKeysFolder, 'public_key2.pem')) || !fs.existsSync(path.join(rsaKeysFolder, 'private_key2.pem'))) {
    generateAndSaveKeys('public_key2.pem', 'private_key2.pem');
}
  
// Charger les clés publiques
const publicKey1FromFile = fs.readFileSync(path.join(rsaKeysFolder, 'public_key1.pem'), 'utf8');
const publicKey2FromFile = fs.readFileSync(path.join(rsaKeysFolder, 'public_key2.pem'), 'utf8');

// Fonction qui sert à créér un hash de chacun des zips avant le chiffrement pour vérifier par la suite l'intégrité des données
function createHash(filePath) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256');
        hash.update(fileBuffer);
        return hash.digest('hex'); // retourne le hash en format hexadécimal
    } catch (err) {
        console.error(`Une erreur s'est produite lors de la création du hash pour le fichier ${filePath}: ${err}`);
        return null; // ou toute autre valeur ou action que vous souhaitez retourner en cas d'erreur
    }
}

// Chiffrer la clé AES avec RSA
function encryptAESKeyWithRSA(publicKey, callback) {
    try {
      const encryptedKey = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      }, aesKey);
  
      callback(null, encryptedKey);
    } catch (err) {
      callback(err);
    }
  }

// Fonction qui sert à vider le dossier uploads une fois que le zip a été créé 
function clearDirectory(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error(`Une erreur s'est produite lors de la lecture du dossier: ${err}`);
            return;
        }
        let fileCount = files.length;
        if (fileCount === 0) {
            console.log('Aucun fichier à supprimer dans le dossier uploads.');
            return;
        }
        for (const file of files) {
            const filePath = path.join(directory, file);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Une erreur s'est produite lors de la suppression du fichier ${file} dans le dossier uploads: ${err}`);
                }
                fileCount--;
                if (fileCount === 0) {
                    console.log(`Fichiers dans le dossier uploads supprimés avec succès!`);
                }
            });
        }
    });
}

let upload = multer({dest: 'uploads/'});

// Middleware qui sert à accéder aux champs texte qui sont envoyés par le formulaire côté client
app.use(express.urlencoded({ extended: true }));

app.post('/upload', upload.fields([{name: 'img', maxCount: 10}, {name: 'vid', maxCount: 10}, {name: 'aud', maxCount: 10}]), async(req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            // Création du ZIP
            let output = fs.createWriteStream('evidence.zip');
            let archive = archiver('zip');

            archive.pipe(output);

            // Ajouter les images, videos et audios au ZIP
            if (req.files['img']) {
                req.files['img'].forEach((file) => {
                    archive.append(fs.createReadStream(file.path), {name: 'images/' + file.originalname});
                });
            }
            
            if (req.files['vid']) {
                req.files['vid'].forEach((file) => {
                    archive.append(fs.createReadStream(file.path), {name: 'videos/' + file.originalname});
                });
            }
            
            if (req.files['aud']) {
                req.files['aud'].forEach((file) => {
                    archive.append(fs.createReadStream(file.path), {name: 'audios/' + file.originalname});
                });
            }

            let descriptionContent = req.body.description;
            archive.append(descriptionContent, {name: 'description.txt'});
            archive.finalize();

            output.on('close', function () {
                console.log((archive.pointer() / 1000000) + ' total MO pour le fichier evidence.zip');
                // Créer le hash pour evidence.zip
                const evidenceHash = createHash('evidence.zip');
                if (evidenceHash) {
                    fs.writeFileSync('evidence_hash.txt', evidenceHash);
                    console.log("Hash du fichier 'evidence.zip' sauvegardé avec succès !");
                }

                // Chiffrer le fichier ZIP avec AES
                encryptWithAES('evidence.zip', 'evidence_encrypted.zip', (err) => {
                    if (err) {
                        console.error("Une erreur s'est produite : ", err);
                    } else {
                        console.log("Chiffrement du fichier preuves réussi !");
                    }
                });

                // Chiffrer la clé AES avec RSA et sauvegarder
                encryptAESKeyWithRSA(publicKey1FromFile, (err, encryptedAESKey) => {
                    if (err) {
                        console.error('Une erreur s’est produite lors du chiffrement de la clé AES: ', err);
                    } else {
                        fs.writeFileSync('aes_key_evidence_encrypted.bin', encryptedAESKey);
                        console.log('Clé AES chiffrée et sauvegardée avec succès avec la clé publique numéro 1 ! (preuves)');
                    }
                    });

                resolve();
            });

            archive.on('error', function (err) {
                throw err;
            });
        })

        await new Promise((resolve, reject) => {
            // Création du Zip pour le noms des personnes concernées
            let namesOutput = fs.createWriteStream('names.zip');
            let namesArchive = archiver('zip');

            namesOutput.on('close', function () {
                // Créer le hash pour names.zip
                const namesHash = createHash('names.zip');
                if (namesHash) {
                    fs.writeFileSync('names_hash.txt', namesHash);
                    console.log("Hash du fichier 'names.zip' sauvegardé avec succès !");
                }
                console.log((namesArchive.pointer() / 1000000) + ' total MO pour le fichier names.zip');

                // Chiffrer le fichier ZIP avec AES
                encryptWithAES('names.zip', 'names_encrypted.zip', (err) => {
                    if (err) {
                        console.error("Une erreur s'est produite : ", err);
                    } else {
                        console.log("Chiffrement du fichier personnes réussi !");
                    }
                });

                // Chiffrer la clé AES avec RSA et sauvegarder
                encryptAESKeyWithRSA(publicKey2FromFile, (err, encryptedAESKey) => {
                if (err) {
                    console.error('Une erreur s’est produite lors du chiffrement de la clé AES: ', err);
                } else {
                    fs.writeFileSync('aes_key_names_encrypted.bin', encryptedAESKey);
                    console.log('Clé AES chiffrée et sauvegardée avec succès avec la clé publique numéro 2 ! (personnes) ');
                }
                });
                resolve();
            });

            namesArchive.on('error', function (err) {
                throw err;
            });

            namesArchive.pipe(namesOutput);

            let namesContent = req.body.names;
            namesArchive.append(namesContent, {name: 'names.txt'});
            namesArchive.finalize();
        })
        res.send('Vos fichiers ont bien été envoyés.');

        // Vide le dossier "uploads"
        clearDirectory('uploads');

        // Exécute le script addToIPFSWithInfura.js
        exec('node addToIPFSWithInfura.js', (error, stdout, stderr) => {
            if (error) {
                console.error(`Erreur lors de l'exécution de addToIPFSWithInfura.js : ${error}`);
            } else {
                console.log(`Sortie de addToIPFSWithInfura.js : ${stdout}`);
            }
            if (stderr) {
                console.error(`Erreur standard : ${stderr}`);
            }

            // Exécute le script blockchainTransaction.js seulement quand addToIPFSWithInfura.js est terminé
            exec('node blockchainTransaction.js', (error, stdout, stderr) => {
                if (error) {
                console.error(`Erreur lors de l'exécution de blockchainTransaction.js : ${error}`);
                } else {
                console.log(`Sortie de blockchainTransaction.js : ${stdout}`);
                }
                if (stderr) {
                    console.error(`Erreur standard : ${stderr}`);
                }
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Une erreur est apparue...');
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
