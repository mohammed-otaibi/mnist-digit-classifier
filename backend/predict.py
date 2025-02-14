import sys
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image

# التحقق من تمرير `image_path`
if len(sys.argv) < 2:
    print("❌ خطأ: لم يتم تمرير `image_path` إلى `predict.py`")
    sys.exit(1)

# استقبال مسار الصورة من `Node.js`
image_path = sys.argv[1]

# تحميل النموذج المدرب
MODEL_PATH = "MNIST_CNN_Models.pt"

class CNN(nn.Module):
    def __init__(self):
        super(CNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, stride=1, padding=1)
        self.relu1 = nn.ReLU()
        self.pool1 = nn.MaxPool2d(kernel_size=2, stride=2)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, stride=1, padding=1)
        self.relu2 = nn.ReLU()
        self.pool2 = nn.MaxPool2d(kernel_size=2, stride=2)
        self.fc1 = nn.Linear(32 * 7 * 7, 128)
        self.relu3 = nn.ReLU()
        self.fc2 = nn.Linear(128, 10)

    def forward(self, x):
        x = self.pool1(self.relu1(self.conv1(x)))
        x = self.pool2(self.relu2(self.conv2(x)))
        x = x.view(x.size(0), -1)
        x = self.relu3(self.fc1(x))
        x = self.fc2(x)
        return x

# تحميل النموذج
model = CNN()
model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device("cpu")))
model.eval()

# تحويل الصورة إلى `Tensor` مع `Normalize` مطابق لـ `MNIST`
transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((28, 28)),
    transforms.Pad(4),  # إضافة حدود سوداء لحماية الرقم
    transforms.CenterCrop(28),  # توسيط الرقم داخل 28x28
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,))
])

try:
    # تحميل الصورة وتحويلها إلى `Tensor`
    image = Image.open(image_path).convert("L")
    image = transform(image).unsqueeze(0)

    # تشغيل التنبؤ
    with torch.no_grad():
        output = model(image)
        probabilities = torch.nn.functional.softmax(output, dim=1)  # حساب الاحتمالات
        top_probs, top_classes = torch.topk(probabilities, 3)  # استخراج أعلى 3 احتمالات

    # تنسيق الاحتمالات كنسبة مئوية
    top_probs_percent = [round(prob * 100, 1) for prob in top_probs[0].tolist()]
    top_classes_list = top_classes[0].tolist()

    # طباعة النتائج
    print(f"🎯 التوقعات: {top_classes_list}")
    print(f"📊 الاحتمالات: {top_probs_percent}%")

except Exception as e:
    print(f"❌ خطأ أثناء معالجة الصورة: {e}")
    sys.exit(1)
