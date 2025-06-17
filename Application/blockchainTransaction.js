const Web3 = require('web3');
const fs = require('fs');


// Remplacez cette clé par votre clé privée
const privateKey = 'xxx';

// Utilisez l'URL fournie par Infura pour Goerli
const infuraUrl = 'https://goerli.infura.io/v3/xxx';

// Créez une instance de web3
// const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));
let web3 = new Web3(infuraUrl);


// Ajouter la clé privée
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

// L'adresse du compte à partir de la clé privée
const fromAddress = account.address;

// L'adresse de destination (ici j'utilise la même pour tester)
const toAddress = fromAddress;

function readFiles() {
    try {
      const evidenceHash = fs.readFileSync('evidence_hash.txt', 'utf-8');
      const aesKeyEvidenceEncrypted = fs.readFileSync('aes_key_evidence_encrypted.bin', 'base64');
      const evidenceCid = fs.readFileSync('evidence_cid', 'utf-8');

      const namesHash = fs.readFileSync('names_hash.txt', 'utf-8');
      const aesKeyNamesEncrypted = fs.readFileSync('aes_key_names_encrypted.bin', 'base64');
      const namesCid = fs.readFileSync('names_cid', 'utf-8');
  
      return {
        evidenceHash,
        aesKeyEvidenceEncrypted,
        evidenceCid,
        namesHash,
        aesKeyNamesEncrypted,
        namesCid
      };
    } catch (error) {
      console.error("Erreur lors de la lecture des fichiers:", error);
      return null;
    }
  }
  
  // Lire les fichiers
  const content = readFiles();
  if (!content) {
    console.error("Erreur lors de la lecture des fichiers.");
    return;
  }
  
  // Créer un objet contenant les données avec des noms descriptifs
  const dataObject = {
    evidenceHash: content.evidenceHash,
    aesKeyEvidenceEncrypted: content.aesKeyEvidenceEncrypted,
    evidenceCid: content.evidenceCid,
    namesHash: content.namesHash,
    aesKeyNamesEncrypted: content.aesKeyNamesEncrypted,
    namesCid: content.namesCid
  };
  
  // Convertir l'objet en chaîne JSON
  const jsonString = JSON.stringify(dataObject);
  
  // Utiliser la chaîne JSON directement comme données de la transaction
  const data = web3.utils.utf8ToHex(jsonString);


async function sendTransaction() {
try {
// Construire un objet transaction
    const tx = {
    from: fromAddress,
    to: toAddress,
    value: web3.utils.toWei('0', 'ether'),
    data: data
    };

    const gasEstimate = await web3.eth.estimateGas(tx);
    tx.gas = gasEstimate;

    const gasPrice = await web3.eth.getGasPrice();
    const totalFeesWei = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasEstimate));

    console.log(`Les frais de transaction estimés sont de ${web3.utils.fromWei(totalFeesWei, 'ether')} Ether.`);

    web3.eth.sendTransaction(tx)
    .on('transactionHash', (hash) => {
        console.log(`Transaction hash: ${hash}`);
    })
    /* .on('confirmation', (confirmationNumber, receipt) => {
        console.log(`Confirmation number: ${confirmationNumber}`);
    }) */
    .on('error', (error) => {
        console.error("Erreur lors de l'envoi de la transaction:", error);
    });
} catch (error) {
    console.error("Erreur lors de la préparation de la transaction:", error);
}
}
// Envoyer la transaction
sendTransaction();