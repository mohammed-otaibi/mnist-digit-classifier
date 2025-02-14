const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const clearBtn = document.getElementById("clearBtn");
const predictBtn = document.getElementById("predictBtn");
const resultText = document.getElementById("result");

let drawing = false;

// إعداد `Canvas` بحيث تكون الخلفية سوداء والخط أبيض (مطابقة لبيانات MNIST)
ctx.fillStyle = "black";  // الخلفية سوداء كما هو الحال في MNIST
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.lineWidth = 15;  // زيادة سماكة الخط لجعل الرقم أكثر وضوحًا
ctx.lineCap = "round";
ctx.strokeStyle = "white";  // اللون الأبيض للرقم، كما هو الحال في MNIST

// بدء الرسم بالماوس
canvas.addEventListener("mousedown", () => {
    drawing = true;
});
canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.beginPath();
});
canvas.addEventListener("mousemove", draw);

function draw(event) {
    if (!drawing) return;
    ctx.lineTo(event.offsetX, event.offsetY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(event.offsetX, event.offsetY);
}

// زر المسح
clearBtn.addEventListener("click", () => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    resultText.innerText = "التوقع: ...";
});

// زر التصنيف
predictBtn.addEventListener("click", async () => {
    // إنشاء `Canvas` مؤقت لتغيير حجم الصورة إلى 28×28
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext("2d");

    // تحويل الخلفية إلى سوداء والخط إلى أبيض كما في MNIST
    tempCtx.fillStyle = "black";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // حساب حجم الرسم الحقيقي داخل `Canvas`
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const boundingBox = getBoundingBox(imageData);

    // حساب القياسات لتوسيط الرسم في 28x28 بكسل
    const scaleFactor = Math.min(28 / boundingBox.width, 28 / boundingBox.height);
    const offsetX = (28 - boundingBox.width * scaleFactor) / 2;
    const offsetY = (28 - boundingBox.height * scaleFactor) / 2;

    // نسخ الرسم إلى `Canvas` الجديد مع توسيطه
    tempCtx.drawImage(
        canvas,
        boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
        offsetX, offsetY, boundingBox.width * scaleFactor, boundingBox.height * scaleFactor
    );

    // تحويل الصورة إلى `Base64`
    const imageDataURL = tempCanvas.toDataURL("image/png");

    // إرسال الصورة إلى `Backend`
    const response = await fetch("http://localhost:3000/predict", {
        method: "POST",
        body: JSON.stringify({ image: imageDataURL }),
        headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
        resultText.innerText = "❌ خطأ في الاتصال بالخادم!";
        return;
    }

    const data = await response.json();
    resultText.innerText = `🔍 التوقع: ${data.prediction}`;
});

// دالة لحساب المساحة التي تحتوي على الرقم في `Canvas`
function getBoundingBox(imageData) {
    const { data, width, height } = imageData;
    let minX = width, maxX = 0, minY = height, maxY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i] !== 0) {  // إذا كان البكسل غير أسود
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
