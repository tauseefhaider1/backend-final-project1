// middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";

const createUploader = (folderName) => {
  // ✅ Change this to save to "uploads/avatars" without "public/"
  const uploadDir = path.join(process.cwd(), "uploads", folderName);
  
  console.log(`📁 Upload directory: ${uploadDir}`);
  
  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`✅ Created upload directory: ${uploadDir}`);
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      console.log(`📁 Saving file to: ${uploadDir}`);
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const filename = `avatar-${uniqueSuffix}${ext}`;
      console.log(`📁 Generated filename: ${filename}`);
      cb(null, filename);
    }
  });

  return multer({ 
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });
};

export default createUploader;