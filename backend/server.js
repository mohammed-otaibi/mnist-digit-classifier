const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const port = 3000;

// تفعيل CORS للسماح للواجهة الأمامية بالوصول إلى الخادم
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// تقديم الملفات الثابتة من `frontend/`
app.use(express.static(path.join(__dirname, "../frontend")));

// إعداد مجلد `uploads/` لحفظ الصور مؤقتًا
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// مسار `GET /` لخدمة `index.html`
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// استقبال الصورة من `Frontend` ومعالجتها
app.post("/predict", (req, res) => {
    if (!req.body.image) {
        return res.status(400).json({ error: "❌ لم يتم استلام صورة من `Frontend`" });
    }

    const base64Data = req.body.image.replace(/^data:image\/png;base64,/, "");
    const imagePath = path.join(__dirname, "uploads", "input.png");

    // حفظ الصورة المستلمة من `Frontend`
    fs.writeFileSync(imagePath, base64Data, "base64");
    console.log(`📷 تم حفظ الصورة في: ${imagePath}`);

    // استدعاء `Python Script` لمعالجة الصورة
    const pythonProcess = spawn("python3", ["predict.py", imagePath]);

    pythonProcess.stdout.on("data", (data) => {
        const prediction = data.toString().trim();
        console.log(`🔍 التوقع من CNN Model: ${prediction}`);
        if (!res.headersSent) {
            res.json({ prediction });
        }
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error(`❌ خطأ في Python: ${data}`);
        if (!res.headersSent) {
            res.status(500).json({ error: "حدث خطأ أثناء تنفيذ النموذج" });
        }
    });

    pythonProcess.on("close", (code) => {
        console.log(`🔄 انتهى تشغيل Python (الكود: ${code})`);
    });
});

// بدء تشغيل الخادم
app.listen(port, () => {
    console.log(`🚀 الخادم يعمل على http://localhost:${port}`);
});
