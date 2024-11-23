const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const app = express();

const corsOptions = {
  origin: ['https://lunar-psr-enhancer.onrender.com', 'null'], // Allow both the hosted origin and file:// origin
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '1gb' })); // Increase body parser limit to 1 GB
app.use(bodyParser.urlencoded({ limit: '1gb', extended: true })); // Increase body parser limit to 1 GB

// Set up multer for file uploads
const upload = multer({ limits: { fileSize: 1024 * 1024 * 1024 } }); // 1 GB limit

// POST route to handle image processing
app.post('/process-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  try {
    console.log(`Processing file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    const response = await axios({
      method: 'post',
      url: 'http://localhost:5000/process-image', // Flask server URL
      data: req.file.buffer,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': req.file.buffer.length,
      },
      responseType: 'arraybuffer', // Expect binary response
      maxContentLength: Infinity, // Allow large content lengths
      maxBodyLength: Infinity, // Allow large body lengths
    });

    res.set('Content-Type', 'image/png');
    res.send(response.data);
  } catch (error) {
    console.error('Error processing image:', error.response ? error.response.data : error.message);
    res.status(500).send('Error processing image.');
  }
});

// POST route to handle form submissions
app.post('/send-email', (req, res) => {
  const { name, surname, email, message } = req.body;

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = 'New Contact Form Submission';
  sendSmtpEmail.htmlContent = `<p>Hey! lunar Rovers, you have a suggestion email received from ${name} ${surname} (${email}):</p><p>The Suggestion goes like this:</p><p>${message}</p>`;
  sendSmtpEmail.to = process.env.RECIPIENT_EMAILS.split(',').map(recipient => ({ email: recipient }));
  sendSmtpEmail.sender = { email: 'troy20052020@gmail.com' }; // Use a verified sender email address

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.SENDINBLUE_API_KEY;

  apiInstance.sendTransacEmail(sendSmtpEmail)
    .then(response => {
      console.log('Email sent successfully:', response);
      res.status(200).send('Message sent: ' + response.messageId);
    })
    .catch(error => {
      console.error('Error sending email:', error.response ? error.response.data : error.message);
      res.status(500).send('Internal Server Error');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});