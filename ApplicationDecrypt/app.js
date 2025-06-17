const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const cors = require('cors');


const app = express();
app.use(cors());


// Configuration de Multer pour stocker les fichiers dans le dossier "Uploads"
const upload = multer({ dest: 'Uploads/' });

// Création du dossier "Decrypted" s'il n'existe pas
const decryptedFolder = 'Decrypted';
if (!fs.existsSync(decryptedFolder)) {
    fs.mkdirSync(decryptedFolder);
}

app.post('/decrypt', upload.fields([{ name: 'fileToDecrypt', maxCount: 1 }, { name: 'privateKeyFile', maxCount: 1 }]), async (req, res) => {
    console.log('Début du décryptage');
    if (!req.files['fileToDecrypt'] || !req.files['privateKeyFile']) {
        res.status(400).send('Les fichiers requis sont manquants.');
        return;
    }
    
    try {
        const fileToDecryptPath = req.files['fileToDecrypt'][0].path;
        const privateKeyFilePath = req.files['privateKeyFile'][0].path;
        const keyToDecrypt = Buffer.from(req.body.keyToDecrypt, 'base64');
        const fileHash = req.body.fileHash;

        // Récupérez la clé privée depuis le fichier
        const privateKey = fs.readFileSync(privateKeyFilePath, 'utf8');

        // Décryptez la clé avec la clé privée
        const decryptedKey = crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, keyToDecrypt);

        // Chemin de sortie pour le fichier décrypté avec l'extension .zip
        const outputFilePath = path.join(decryptedFolder, 'decrypted_file.zip');

        // Déchiffrer le fichier avec la clé déchiffrée
        decryptWithAES(fileToDecryptPath, outputFilePath, decryptedKey, err => {
            if (err) {
                console.error('Une erreur s’est produite lors du décryptage:', err);
            } else {
                // Vérification du Hash
                const actualHash = createHash(outputFilePath);
                if (actualHash !== fileHash) { // Est-ce que le hash reçu et le hash actuel correspondent ?
                    console.log("Le hash des 2 fichiers ne correspond pas !")
                    //return; // Si on veut arrêter le programme quand les hash ne correspondent pas
                } else {
                    console.log("Le hash des 2 fichiers correspond !")
                }

                res.send('Données envoyées avec succès !'); // Réponse au navigateur
                // Vide le dossier "uploads"
                clearDirectory('uploads');
                console.log('Décryptage effectué avec succès !');
            }
        });
    } catch (error) {
        console.error('Une erreur est apparue:', error);
        res.send('Une erreur est apparue...');
    }
});

function decryptWithAES(inputFilePath, outputFilePath, key, callback) {
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
        const input = fs.createReadStream(inputFilePath);
        const output = fs.createWriteStream(outputFilePath);

        input.pipe(decipher).pipe(output);

        output.on('finish', () => callback(null));
    } catch (err) {
        callback(err);
    }
}

function createHash(filePath) {
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);

    hash.update(data);

    return hash.digest('hex');
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

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
