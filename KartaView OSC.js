/**
 * Docs: http://doc.kartaview.org/#tag/Sequence
 * Goal: retrieve sequences, then retrieve photos of each sequence one by one
 * Solution: Promise, async/await
 */

const https = require('https');
const fs = require('fs');

let count = 1;
let MAX_PHOTOS = 10;

function requestPhoto(photoUrl) {
  return new Promise((resolve, reject) => {
    const req = https.get(photoUrl, (response) => {
      const file = fs.createWriteStream(`KartaView_${count.toString().padStart(4, '0')}.jpg`);
      response.pipe(file);

      file.on("finish", () => {
        console.log(`${count++} Photo Download Completed`);
        file.close();
        resolve();
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
  })
}

async function requestSequence(sequenceId) {
  return new Promise((resolve, reject) => {
    const req = https.get(`https://api.openstreetcam.org/2.0/sequence/${sequenceId}/photos?itemsPerPage=500`, (res) => {
      let photoRawData = '';
      res.on('data', (chunk) => {
        photoRawData += chunk;
      });

      res.on('end', async () => {
        const photoData = JSON.parse(photoRawData);
        console.log(`Number of photos for sequenceId ${sequenceId}: ${photoData.result.data.length}, hasMoreData: ${photoData.result.hasMoreData}`);

        for (let photo of photoData.result.data) {
          count <= MAX_PHOTOS && await requestPhoto(photo['fileurlLTh']);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

async function request() {
  // retrieve sequences (countryCode: DE, withPhoto: true)
  // tLeft, bRight to get more precise location
  https.get('https://api.openstreetcam.org/2.0/sequence/?countryCode=DE&withPhotos=true&itemsPerPage=500', (res) => {
    let sequenceRawData = '';
    res.on('data', (chunk) => {
      sequenceRawData += chunk;
    });

    // retrieve photos
    res.on('end', async () => {
      console.log('Successfully Retrieved Sequences.')
      const sequenceData = JSON.parse(sequenceRawData);
      console.log(`Number of sequences: ${sequenceData.result.data.length}, hasMoreData: ${sequenceData.result.hasMoreData}`);

      console.log('Now Retrieving Photos...')
      for (let sequence of sequenceData.result.data) {
        // this sequence has photos, address includes 'berlin' (can be null)
        if (
          sequence.hasOwnProperty('address') &&
          typeof sequence['address'] === 'string' &&
          sequence['address'].toLowerCase().includes('berlin') &&
          sequence.hasOwnProperty('countActivePhotos') &&
          sequence['countActivePhotos'] > 0
        ) {
          await requestSequence(sequence['id']);
        }
      }
    });
  });
}

request();