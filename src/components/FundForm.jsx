import * as React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

export default function FormPropsTextFields({ requestData }) {
  const getStatusLabel = (statusCode) => {
    if (statusCode === 1) {
      return 'Requested';
    } else if (statusCode === 100000001) {
      return 'Approved';
    }
    return statusCode;
  };
  return (
    <Box
      component="form"
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center', // Center align the form
      }}
      noValidate
      autoComplete="off"
    >
      <Grid container spacing={3}>
        {/* First Column */}
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ padding: 2, backgroundColor: '#ffffff', boxShadow: '0px 3px 6px #00000029' }}>
            <TextField
              required
              fullWidth
              id="outlined-required-request-number"
              label="Request Number"
              value={requestData.dyn_requestnumber}
              sx={{ marginBottom: 2 }} // Add space below the TextField
            />
            <TextField
              fullWidth
              required
              id="outlined-required-funding-program"
              label="Funding Program"
              value={requestData.Fundingprogramcode}
              sx={{ marginBottom: 2 }} // Add space below the TextField
            />
            <TextField
              fullWidth
              required
              id="outlined-required-applicant"
              label="Applicant"
              value={requestData.Applicantfullname}
              sx={{ marginBottom: 2 }} // Add space below the TextField
            />
            <TextField
              fullWidth
              required
              id="outlined-required-request-amount"
              label="Request Amount"
              value={requestData.dyn_requestedamount}
              sx={{ marginBottom: 2 }} // Add space below the TextField
            />
            <TextField
              fullWidth
              id="outlined-required-status-reason"
              label="Status Reason"
              value={getStatusLabel(requestData.statuscode)}
            />
          </Paper>
        </Grid>

        {/* Second Column */}
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ padding: 2, backgroundColor: '#ffffff', boxShadow: '0px 3px 6px #00000029' }}>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'left' }}>
              Payment Summary
            </Typography>
            <TextField
              required
              fullWidth
              id="filled-required-awarded-amount"
              label="Awarded Amount"
              value={requestData.dyn_awardedamount}
              sx={{ marginTop: 2 }}
            />
            <TextField
              fullWidth
              id="filled-read-only-total-amount-paid"
              label="Total Amount Paid"
              value={requestData.dyn_totalamountpaid}
              sx={{ marginTop: 2 }}
            />
            <TextField
              fullWidth
              id="filled-helper-text-total-amount-paid"
              label="Total Amount Scheduled"
              value={requestData.dyn_totalamountscheduled}
              sx={{ marginTop: 2 }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
