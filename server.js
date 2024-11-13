const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());


const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post('/api/send-bulk-email', upload.fields([
  { name: 'recipientFile', maxCount: 1 },
  { name: 'attachment', maxCount: 1 }
]), async (req, res) => {
  try {
    const { subject, body } = req.body;

    const workbook = XLSX.readFile(req.files.recipientFile[0].path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const emails = data
      .flat()
      .filter(email => email && 
        typeof email === 'string' && 
        email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));

    if (emails.length === 0) {
      return res.status(400).json({ error: 'No valid email addresses found' });
    }
 
    const CHUNK_SIZE = 100;
    let successCount = 0;

    for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
      const chunk = emails.slice(i, i + CHUNK_SIZE);
      
      const msg = {
        personalizations: chunk.map(email => ({
          to: [{ email: email }]
        })),
        from: "gokul@guvi.in",
        subject: subject,
        content: [{
          type: 'text/html',
          value: body
        }]
      };

      
      if (req.files.attachment) {
        const attachmentFile = req.files.attachment[0];
        msg.attachments = [{
          content: require('fs').readFileSync(attachmentFile.path).toString('base64'),
          filename: attachmentFile.originalname,
          type: attachmentFile.mimetype,
          disposition: 'attachment'
        }];
      }

      try {
        await sgMail.send(msg);
        successCount += chunk.length;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting delay
      } catch (error) {
        console.error('SendGrid Error:', error.response?.body?.errors);
      }
    }

    // Cleanup files
    require('fs').unlinkSync(req.files.recipientFile[0].path);
    if (req.files.attachment) {
      require('fs').unlinkSync(req.files.attachment[0].path);
    }

    res.json({
      message: 'Email sending completed',
      totalEmails: emails.length,
      successfulSent: successCount
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));