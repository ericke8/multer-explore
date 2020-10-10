require('dotenv').config()
var AWS = require("aws-sdk");
const express = require("express");
const multer = require("multer")
const app = express();
const multerS3 = require('multer-s3')

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

const uploadFile = (fileName, fileContent) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileName,
    Body: fileContent
  };
  console.log(params)

  s3.upload(params, function (err, data) {
    if (err) {
      throw err;
    }
    console.log(`File uploaded successfully. ${data.Location}`);
  });
};

var diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

var memStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png') {
    cb(null, true);
  } else {
    console.log('file type bad')
    req.fileValidationError = 'invalid file type';
    cb(new Error('invalid file type'), false);
  }
};

var diskUpload = multer({ storage: diskStorage, fileFilter: fileFilter });

var memUpload = multer({ storage: memStorage, fileFilter: fileFilter });

var multers3Upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname)
    }
  })
})

app.post('/v1/upload', diskUpload.single('file'), (req, res, next) => {
  try {
    return res.status(201).json({
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error(error);
  }
});

app.post('/v2/upload', (req, res) => {
  let proc = diskUpload.single('file');
  proc(req, res, function (err) {
    if (err) {
      console.log(err.message)
      return res.status(400).json({ message: err.message });
    }
    console.log('File received')
    return res.status(201).json({
      message: 'File uploaded successfully'
    });

  })
});

app.post('/v3/upload', (req, res) => {
  let proc = memUpload.single('file');
  proc(req, res, function (err) {
    if (err) {
      console.log(err.message)
      return res.status(400).json({ message: err.message });
    }
    var data = req.file
    console.log(req.file)
    uploadFile(Date.now() + '-' + req.file.originalname, data.buffer)
    console.log('File received')
    return res.status(201).json({
      message: 'File uploaded successfully'
    })
  })
});

app.post('/v4/upload', (req, res) => {
  let proc = multers3Upload.single('file');
  proc(req, res, function (err) {
    if (err) {
      console.log(err.message)
      return res.status(400).json({ message: err.message });
    }
    console.log('File received')
    return res.status(201).json({
      message: 'File uploaded successfully'
    })
  })
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on ${port}`);
});