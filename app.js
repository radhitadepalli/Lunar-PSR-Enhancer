const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

// Set up storage engine for Multer
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // Limit file size to 10MB
}).single('image');

// Route for homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to handle image upload and processing
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(500).send('Error uploading file');
        }

        // File uploaded successfully
        const imagePath = req.file.path;

        // Call Python script for image processing
        const pythonProcess = spawn('python', ['process_image.py', imagePath]);

        // Collect the output from the Python script
        pythonProcess.stdout.on('data', (data) => {
            const processedFilePath = data.toString().trim();

            // Send processed image as download
            res.download(processedFilePath, (err) => {
                if (err) {
                    res.status(500).send('Error downloading file');
                }

                // Optionally, delete the uploaded and processed images after download
                fs.unlink(imagePath, () => {});
                fs.unlink(processedFilePath, () => {});
            });
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python error: ${data}`);
            res.status(500).send('Error processing image');
        });
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
