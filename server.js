const clamd = require('clamdjs');
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const {Storage} = require('@google-cloud/storage');

const app = express();
const PORT = process.env.PORT || 8080;
const scanner = clamd.createScanner('127.0.0.1', 3310);

//const CLOUD_STORAGE_BUCKET = process.env.CLOUD_STORAGE_BUCKET || 'unscanned-documents'
const CLOUD_STORAGE_BUCKET = process.env.UNSCANNED_BUCKET || 'unscanned-documents';
const CLEAN_BUCKET = process.env.CLEAN_BUCKET || 'clean-documents';
const QUARANTINED_BUCKET = process.env.QUARANTINED_BUCKET || 'quarantined-documents';

app.use(bodyParser.json());

// Creates a client
const storage = new Storage();

// Get the bucket which is declared as an environment variable
let srcbucket = storage.bucket(CLOUD_STORAGE_BUCKET);

const run = () => app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

app.post('/scan', async (req, res) => {
  console.log('REQ BODY', req.body);
  try {
    let filename = req.body.filename;

    const options = {
      destination: `/unscanned_files/${filename}`,
    };

    //Downloads the file
    await storage
      .bucket(CLOUD_STORAGE_BUCKET)
      .file(req.body.filename)
      .download(options);

    console.log(`FILENAME IS: /unscanned_files/${filename}`);

    const result = await scanner.scanFile(`/unscanned_files/${filename}`);
    if (result.indexOf('OK') > -1) {
      // Move document to the bucket that holds clean documents
      await moveProcessedFiles(filename, true);

      // Delete file from the local directory on the container
      deleteLocalCopy(`/unscanned_files/${filename}`, filename);

      // Respond to API client
      res.json({status: 'success'});
    } else {
      // Move document to the bucket that holds clean documents
      await moveProcessedFiles(filename, false);

      // Delete file from the local directory on the container
      deleteLocalCopy(`/unscanned_files/${filename}`, filename);

      // Respond to API client
      res.json({
        message: result,
        status: 'error'
      });
    }
  } catch(e) {
    res.json({
      message: e.toString(),
      status: 'error'
    });
  }
})


const deleteLocalCopy = (loc, filename) => {
  fs.unlink(loc, (err) => {
    if (err) {
      console.log(`Error deleting file ${filename}`);
    } else {
      console.log(`File ${filename} was deleted successfully`);
    }
  });
}

const moveProcessedFiles = async (filename, isClean) => {
  const srcfile = srcbucket.file(filename);
  //const destinationBucketName = isClean ? 'gs://clean-documents' : 'gs://quarantined-documents'
  const destinationBucketName = isClean ? `gs://${CLEAN_BUCKET}` : `gs://${QUARANTINED_BUCKET}`;
  const destinationBucket = storage.bucket(destinationBucketName);
  await srcfile.move(destinationBucket);
}

run();