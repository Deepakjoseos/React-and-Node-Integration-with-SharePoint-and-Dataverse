const express = require('express');
const { getFundingRequests, getSharePointDocumentLocation, uploadToSharePoint , getDataverseAccessToken ,downloadFromSharepoint,AddORUpdateDocumentType, deleteFileFromSharePoint } = require('./controllers');

const router = express.Router();

// Define routes
router.get('/api/fundingRequests/:name', getFundingRequests);
router.post('/api/getDataverseAccessToken', getDataverseAccessToken);
router.get('/api/sharepointdocumentlocation/:name', getSharePointDocumentLocation);
router.post('/api/uploadToSharePoint', uploadToSharePoint);
router.get('/api/downloadfromSharepoint', downloadFromSharepoint);
router.post('/api/updateDocumentType',AddORUpdateDocumentType);
router.delete('/api/deleteFileFromSharePoint',deleteFileFromSharePoint);





module.exports = {
  setupRoutes: (app) => {
    app.use(router);
  },
};
