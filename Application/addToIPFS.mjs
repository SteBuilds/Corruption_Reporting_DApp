
/*

// =========================  Ancienne manière de faire avec js-ipfs  ==============================================

//import IPFS from 'ipfs-core';
import { create } from 'ipfs-core';
import fs from 'fs';

async function run() {
  console.log('Démarrage du nœud IPFS...');
  const node = await create();
  console.log('Nœud IPFS démarré avec succès.');

  // Lire et ajouter le fichier evidence_encrypted.zip à IPFS
  const evidenceData = fs.readFileSync('evidence_encrypted.zip');
  console.log('Ajout du fichier evidence_encrypted.zip à IPFS...');
  const { cid: evidenceCid } = await node.add({ content: evidenceData });
  console.log('Evidence CID:', evidenceCid.toString());
  fs.writeFileSync('evidence_cid', evidenceCid.toString());

  // Lire et ajouter le fichier names_encrypted.zip à IPFS
  const namesData = fs.readFileSync('names_encrypted.zip');
  console.log('Ajout du fichier names_encrypted.zip à IPFS...');
  const { cid: namesCid } = await node.add({ content: namesData });
  console.log('Names CID:', namesCid.toString());
  fs.writeFileSync('names_cid', namesCid.toString());

  console.log('Tous les fichiers ont été ajoutés à IPFS avec succès.');
}

run().catch(console.error); */

// ========================== Méthode actuelle avec Helia  ===============================

import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import fs from 'fs';

async function run() {
  console.log('Démarrage du nœud IPFS...');
  const helia = await createHelia();
  console.log('Nœud IPFS démarré avec succès.');

  // Créer une instance du module unixfs
  const fsUnix = unixfs(helia);

  // Lire et ajouter le fichier evidence_encrypted.zip à IPFS
  const evidenceData = fs.readFileSync('evidence_encrypted.zip');
  console.log('Ajout du fichier evidence_encrypted.zip à IPFS...');
  const evidenceCid = await fsUnix.addFile({
    path: 'evidence_encrypted.zip',
    content: evidenceData
  });
  //await helia.pin.add(evidenceCid);
  console.log('Evidence CID:', evidenceCid.toString());
  fs.writeFileSync('evidence_cid', evidenceCid.toString());
  
  // Lire et ajouter le fichier names_encrypted.zip à IPFS
  const namesData = fs.readFileSync('names_encrypted.zip');
  console.log('Ajout du fichier names_encrypted.zip à IPFS...');
  const namesCid = await fsUnix.addFile({
    path: 'names_encrypted.zip',
    content: namesData
  });
  //await helia.pin.add(namesCid);
  console.log('Names CID:', namesCid.toString());
  fs.writeFileSync('names_cid', namesCid.toString());

  // On peut vérifier les fichiers épinglés avec la méthode ls
  /* for await (const pin of helia.pin.ls()) {
    console.log(pin);
  } */

  // await helia.stop();
  // console.log('Nœud IPFS arrêté...');
}

run().catch(error => {
  console.error('Erreur : ', error);
});


