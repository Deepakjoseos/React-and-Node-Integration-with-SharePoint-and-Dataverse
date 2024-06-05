const axios = require('axios');
const spauth = require('node-sp-auth');
const fs = require('fs');
const formidable = require('formidable');
require('dotenv').config();
let DataverseaccessToken = '';
let tokenExpirationTime = 0; // Initialize token expiration time



/*----------------------------------------------GET Dataverse Access token Code Starts Here-------------------------------------------------------*/
const getDataverseAccessToken = async () => {
  // Check if the current access token is still valid
  if (DataverseaccessToken && Date.now() < tokenExpirationTime) {
    return DataverseaccessToken; // Return the existing token if it's still valid
  }
  try {
    // Retrieve environment variables from process.env
    const clientId = process.env.clientId;
    const clientSecret = process.env.client_secret;
    const tenantId = process.env.tenantId;
    const resource = process.env.scope;

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    // Send POST request to token endpoint to obtain access token
    const response = await axios.post(
      tokenEndpoint,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: resource,
      })
    );
    // Store the access token and its expiration time
    DataverseaccessToken = response.data.access_token;
    tokenExpirationTime = Date.now() + response.data.expires_in * 1000; // Convert seconds to milliseconds

    // Return the access token
    return DataverseaccessToken;
  } catch (error) {
    console.error('Error fetching access token:', error.response?.status, error.response?.data);
    throw new Error('Error fetching access token');
  }
};
/*----------------------------------------------GET Dataverse Access token Code Ends Here-------------------------------------------------------*/


/*-------------------------------------Get Fund Request Data from the Dataverse Code Starts-------------------------------------------------------*/
const getFundingRequests = async (req, res) => {
  try {
    const { name } = req.params;

    const accessToken = await getDataverseAccessToken(); // Always ensure you have a valid token

    const apiUrl = `${process.env.DataverseURL}/dyn_fundingrequests(${name})`;

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const fundprogramId = response.data._dyn_fundingprogramid_value;
    const contactId = response.data._dyn_contactid_value;

    const programResponse = await axios.get(`${process.env.DataverseURL}/dyn_fundingprograms(${fundprogramId})`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const programCode = programResponse.data.dyn_programcode;

    const contactResponse = await axios.get(`${process.env.DataverseURL}/contacts(${contactId})`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const fullName = contactResponse.data.fullname;

    // Construct the response object including fullname and programcode
    const responseData = {
      ...response.data,
      Applicantfullname: fullName,
      Fundingprogramcode: programCode,
    };

    // Send the response including fullname and programcode
    res.json(responseData);

  } catch (error) {
    console.error('Error fetching funding requests:', error.response?.status, error.response?.data);
    res.status(500).json({ error: 'Internal server error' });
  }
};
/*----------------------------------------Get Fund Request Data from the Dataverse Code Ends-----------------------------------------------------*/


/*----------------------------------------Get SharePoints Data from the SharePoint API Code Starts-----------------------------------------------*/
const getSharePointDocumentLocation = async (req, res) => {
  try {
    const { name } = req.params;

    // Ensure we have a valid access token
    const accessToken = await getDataverseAccessToken();

    const apiUrl = `${process.env.DataverseURL}/sharepointdocumentlocations?$filter=_regardingobjectid_value eq '${name}'`;

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.data && Array.isArray(response.data.value) && response.data.value.length > 0) {
      const firstDocumentLocation = response.data.value[0];

      if (firstDocumentLocation && firstDocumentLocation.relativeurl) {
        const SPurl = process.env.SharePointURL;
        const SPfolderPath = `/sites/nonprofitdev/dyn_fundingrequest/${firstDocumentLocation.relativeurl}`;

        const options = await spauth.getAuth(SPurl, {
          username: process.env.SP_Username,
          password: process.env.SP_Password,
          online: true,
        });
        const headers = options.headers;
        headers['Accept'] = 'application/json;odata=verbose';

        const spResponse = await axios.get(`${SPurl}/_api/web/GetFolderByServerRelativeUrl('${SPfolderPath}')/Files`, { headers });
        const files = spResponse.data.d.results;

        // Fetch Choices Values and add it with rest of the data
        const ChoiceApiUrl = `${process.env.SharePointURL}/_api/web/lists/getbytitle('Funding Request')/fields?$filter=InternalName eq 'DocumentType'`;
        const choiceResponse = await axios.get(ChoiceApiUrl, { headers });
        const documentType = choiceResponse.data.d.results[0].Choices.results;

        // Match files with their corresponding list items
        const fileDetails = await Promise.all(files.map(async (file) => {
          let documentType = null;
          let documentID = null;

          if (file.ListItemAllFields && file.ListItemAllFields.__deferred && file.ListItemAllFields.__deferred.uri) {
              try {
                  // Fetch additional details using the ListItemAllFields URI
                  const listItemResponse = await axios.get(file.ListItemAllFields.__deferred.uri, { headers });
                  documentType = listItemResponse.data.d.DocumentType;
                  documentID = listItemResponse.data.d.DocumentID; 
              } catch (error) {
                  console.error("Error fetching ListItemAllFields details:", error);
              }
          }

          let modifiedByTitle = null;
          try {
              const ModifiedByNameAPI = await axios.get(`${file.ModifiedBy.__deferred.uri}`, { headers });
              modifiedByTitle = ModifiedByNameAPI.data.d.Title;
          } catch (error) {
              console.error("Error fetching ModifiedBy:", error);
          }

          return {
              UniqueId: file.UniqueId,
              fileName: file.Name,
              ServerRelativeUrl: file.ServerRelativeUrl,
              documentType: documentType,
              documentID: documentID,
              timeLastModified: file.TimeLastModified,
              modifiedByTitle: modifiedByTitle,
          };
      }));

        // console.log(fileDetails,'DOcid')
        // Send the combined data as a response
        res.status(200).json({ SPfolderPath, fileDetails, documentType });

      } else {
        console.log('Relative URL not found in the first document location object');
        res.status(404).json({ error: 'Relative URL not found' });
      }
    } else {
      console.log('No document locations found in the response');
      res.status(404).json({ error: 'No document locations found' });
    }
  } catch (error) {
    console.error('Error fetching SharePoint requests:', error.response?.status, error.response?.data);
    res.status(500).json({ error: 'Internal server error' });
  }
};
/*--------------------------------------------Get SharePoints Data from the SharePoint API Code Ends----------------------------------------------*/



/*------------------------------------------------Upload File code Starts Here-------------------------------------------------------------------*/
class SharePointFileUploader {
  constructor(username, password, siteUrl) {
    this.username = username;
    this.password = password;
    this.siteUrl = siteUrl;
  }
  async authenticate() {
    const creds = {
      username: this.username,
      password: this.password,
    };
    const auth = await spauth.getAuth(this.siteUrl, creds);
    this.cookies = auth.headers.Cookie;
  }

  

  async getAuthHeaders() {
    await this.authenticate();
    return { Cookie: this.cookies };
  }

  async getRequestDigest(authHeaders) {
    const url = `${this.siteUrl}/_api/contextinfo`;
    const response = await axios.post(url, {}, { headers: authHeaders });
    return response.data.FormDigestValue;
  }

  async uploadFile(filePath, fileName, folderPath, authHeaders, requestDigest) {
    const fileBuffer = fs.readFileSync(filePath);
    const url = `${this.siteUrl}/_api/web/getfolderbyserverrelativeurl('${folderPath}')/files/add(url='${fileName}',overwrite=true)`;

    const response = await axios.post(url, fileBuffer, {
      headers: {
        ...authHeaders,
        'X-RequestDigest': requestDigest,
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/octet-stream',
      },
    });

    if (response.status === 200 || response.status === 201) {
      console.log(`File '${fileName}' uploaded successfully`);
    } else {
      throw new Error(`Error uploading file '${fileName}': ${response.statusText}`);
    }
  }

  async uploadFiles(files, folderPath) {
    try {
      const authHeaders = await this.getAuthHeaders();
      const requestDigest = await this.getRequestDigest(authHeaders);

      for (const file of files) {
        await this.uploadFile(file.filePath, file.fileName, folderPath, authHeaders, requestDigest);
      }
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}

const uploadToSharePoint = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).send('Error parsing the files');
    }

    const file = files.file;
    if (!file) {
      return res.status(400).send('No file uploaded');
    }
    const filePath = file[0].filepath;
    const fileName = fields.filename[0];
    const folderPath = fields.FolderPath[0];
    const documentType = fields.documentType[0];
    const documentId = fields.documentID[0];
    
    try {
      const filesToUpload = [{ filePath, fileName }];
      const uploader = new SharePointFileUploader(
        process.env.SP_Username,
        process.env.SP_Password,
        process.env.SharePointURL
      );

      await uploader.uploadFiles(filesToUpload, folderPath);

      // After uploading, update the Document Type
      const url = `${process.env.SharePointURL}/_api/Web/GetFolderByServerRelativeUrl('${folderPath}')/Files('${fileName}')/ListItemAllFields`;

      // Payload for updating the Document Type
      const payload = {
        DocumentType: documentType,
        DocumentID: documentId
      };

      // Get authentication headers
      const authHeaders = await uploader.getAuthHeaders();
      const requestDigest = await uploader.getRequestDigest(authHeaders);

      try {
        // Make the POST request to update the item
        const response = await axios.post(url, payload, {
          headers: {
            ...authHeaders,
            'X-RequestDigest': requestDigest,
            'Accept': 'application/json;odata=verbose',
            'Content-Type': 'application/json',
            'X-HTTP-Method': 'MERGE',
            'If-Match': '*'
          }
        });
        res.status(200).send(`File '${fileName}' uploaded and metadata updated successfully`);
      } catch (error) {
        if (error.response && error.response.status === 403) {
          // If we get a 403 Unauthorized, re-authenticate and retry
          console.log('Unauthorized access. Reauthenticating...');
          await uploader.authenticate();
          const retryAuthHeaders = await uploader.getAuthHeaders();
          const retryRequestDigest = await uploader.getRequestDigest(retryAuthHeaders);

          // Retry the POST request to update the item
          const retryResponse = await axios.post(url, payload, {
            headers: {
              ...retryAuthHeaders,
              'X-RequestDigest': retryRequestDigest,
              'Accept': 'application/json;odata=verbose',
              'Content-Type': 'application/json',
              'X-HTTP-Method': 'MERGE',
              'If-Match': '*'
            }
          });
          res.status(200).send(`File '${fileName}' uploaded and metadata updated successfully`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error uploading files to SharePoint:', error);
      res.status(500).send(`Failed to upload file '${fileName}' to SharePoint`);
    }
  });
};

/*----------------------------------------Upload File code Ends Here--------------------------------------------------------------------------*/

/*-------------------------------------Download SharePoint files Code Starts Here-------------------------------------------------------------*/
const downloadFromSharepoint = async (req, res) => { 
  try {
    // Extract serverRelativeUrl from query parameters
    const { serverRelativeUrl } = req.query;

    const SPurl = process.env.SharePointURL;

    // Authenticate with SharePoint
    const authOptions = await spauth.getAuth(SPurl, {
      username: process.env.SP_Username, // Use environment variables
      password: process.env.SP_Password, // Use environment variables
      online: true
    });

    // Construct the download URL
    const downloadUrl = `${SPurl}/_api/Web/GetFileByServerRelativePath(decodedurl='${serverRelativeUrl}')/$value`;

    // Get the file content from SharePoint
    const response = await axios.get(downloadUrl, {
      headers: authOptions.headers,
      responseType: 'arraybuffer' // Ensure we get the file as binary data
    });

    // Send the binary data directly
    res.send(response.data);
  } catch (error) {
    console.error('Error downloading file from SharePoint:', error);
    res.status(500).send('Failed to download file');
  }
};
/*-------------------------------------Download SharePoint files Code Ends Here-------------------------------------------------------------*/

const AddORUpdateDocumentType = async (req, res) => {
  const { fileName, newDocumentType, folderpath } = req.body;
  try {
    // Create an instance of SharePointFileUploader with your credentials
    const uploader = new SharePointFileUploader(process.env.SP_Username, process.env.SP_Password, process.env.SharePointURL);

    // Authenticate with SharePoint
    const authHeaders = await uploader.getAuthHeaders();
    const requestDigest = await uploader.getRequestDigest(authHeaders);

    // SharePoint API endpoint for updating a file
    const url = `${process.env.SharePointURL}/_api/Web/GetFolderByServerRelativeUrl('${folderpath}')/Files('${fileName}')/ListItemAllFields`;

    // Payload for the update
    const payload = {
      DocumentType: newDocumentType
    };

    // Make the POST request to update the item
    const response = await axios.post(url, payload, {
      headers: {
        ...authHeaders,
        'X-RequestDigest': requestDigest,
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json',
        'X-HTTP-Method': 'MERGE',
        'If-Match': '*'
      }
    });

    // Send response to client
    res.status(200).send('Update successful');
  } catch (error) {
    // Handle errors
    if (error.response) {
      // Server responded with a status other than 2xx
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
      res.status(error.response.status).send(`Error updating file: ${error.response.data.error.message}`);
    } else if (error.request) {
      // Request was made but no response was received
      console.error('Error request data:', error.request);
      res.status(500).send('Error updating file: No response from server');
    } else {
      // Something happened in setting up the request
      console.error('Error message:', error.message);
      res.status(500).send(`Error updating file: ${error.message}`);
    }
  }
};


// Delete SharePoint File Code starts from here

const deleteFileFromSharePoint = async (req, res) => {
  const { serverRelativeUrl } = req.query;
  const { fileName } = req.query;
  console.log(fileName, "filepath");

  try {
    const uploader = new SharePointFileUploader(
      process.env.SP_Username,
      process.env.SP_Password,
      process.env.SharePointURL
    );

    let authHeaders = await uploader.getAuthHeaders();
    let requestDigest = await uploader.getRequestDigest(authHeaders);

    const deleteUrl = `${process.env.SharePointURL}/_api/web/GetFileByServerRelativePath(decodedurl='${serverRelativeUrl}')`;

    try {
      const response = await axios.delete(deleteUrl, {
        headers: { ...authHeaders, 'X-RequestDigest': requestDigest },
      });

      res.status(200).send(`File ${fileName} deleted.`);
    } catch (error) {
      if (error.response && error.response.status === 403) {
        // If we get a 403 Unauthorized, re-authenticate and retry
        console.log('Unauthorized access. Reauthenticating...');
        await uploader.authenticate();
        const retryAuthHeaders = await uploader.getAuthHeaders();
        const retryRequestDigest = await uploader.getRequestDigest(retryAuthHeaders);

        const retryResponse = await axios.delete(deleteUrl, {
          headers: { ...retryAuthHeaders, 'X-RequestDigest': retryRequestDigest },
        });

        res.status(200).send(`File ${fileName} deleted.`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
      res.status(error.response.status).send(`Error deleting file: ${error.response.data['odata.error'].message.value}`);
    } else if (error.request) {
      console.error('Error request data:', error.request);
      res.status(500).send('Error deleting file: No response from server');
    } else {
      console.error('Error message:', error.message);
      res.status(500).send(`Error deleting file: ${error.message}`);
    }
  }
};



// Delete SharePoint File Code starts ends here

module.exports = {
  getDataverseAccessToken,
  getFundingRequests,
  getSharePointDocumentLocation,
  uploadToSharePoint,
  downloadFromSharepoint,
  AddORUpdateDocumentType,
  deleteFileFromSharePoint
};
