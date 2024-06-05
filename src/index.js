const express = require('express');
const cors = require('cors');

const {
  getFundingRequests,
  getSharePointDocumentLocation,
  uploadToSharePoint,
  downloadFromSharepoint,
  AddORUpdateDocumentType,
  deleteFileFromSharePoint
} = require('./controllers');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Use body-parser middleware

// Define routes
app.get('/api/fundingRequests/:name', getFundingRequests);
app.get('/api/sharepointdocumentlocation/:name', getSharePointDocumentLocation);
app.post('/api/uploadToSharePoint', uploadToSharePoint);
app.get('/api/downloadfromSharepoint', downloadFromSharepoint);
app.post('/api/updateDocumentType',AddORUpdateDocumentType);
app.delete('/api/deleteFileFromSharePoint',deleteFileFromSharePoint);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
