import { formidable } from 'formidable';
import fs from 'fs'; // Library สำหรับจัดการไฟล์

// ตั้งค่าเพื่อให้ Vercel ไม่ประมวลผล Body เอง แต่ให้ formidable จัดการ
export const config = {
  api: {
    bodyParser: false,
  },
};

// นี่คือ Backend ของเราที่จะเชื่อมต่อกับ Azure AI จริงๆ
export default async function handler(request, response) {
  // ดึง Key และ Endpoint ที่เราตั้งค่าไว้ใน Vercel Environment Variables
  const azureKey = process.env.AZURE_FACE_API_KEY;
  const azureEndpoint = process.env.AZURE_FACE_API_ENDPOINT;

  // ตรวจสอบว่า Key/Endpoint ถูกตั้งค่าไว้หรือไม่
  if (!azureKey || !azureEndpoint) {
    console.error("Azure credentials are not set in environment variables.");
    return response.status(500).json({ message: 'Server configuration error.' });
  }

  // สร้าง Promise เพื่อแปลง formidable ที่เป็น callback-style ให้ทำงานกับ async/await ได้
  const data = await new Promise((resolve, reject) => {
    const form = formidable();
    form.parse(request, (err, fields, files) => {
      if (err) return reject(err);
      // 'image' คือชื่อ field ที่เราตั้งใน FormData ของ Frontend
      resolve({ fields, files }); 
    });
  });

  try {
    // ดึงข้อมูลไฟล์รูปภาพที่อัปโหลดมา
    const imageFile = data.files.image[0];
    // อ่านข้อมูลรูปภาพจากตำแหน่งที่ถูกเก็บไว้ชั่วคราว
    const imageBuffer = fs.readFileSync(imageFile.filepath);

    // เตรียม URL สำหรับยิงไปที่ Azure
    const azureApiUrl = `${azureEndpoint}/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=true&returnFaceAttributes=age,gender,smile,emotion,headPose`;

    // ส่ง Request ไปยัง Azure AI ด้วย 'fetch'
    const azureResponse = await fetch(azureApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': azureKey,
      },
      body: imageBuffer,
    });

    // หาก Azure ตอบกลับมาว่ามีปัญหา ให้โยน Error
    if (!azureResponse.ok) {
      const errorData = await azureResponse.json();
      console.error("Azure API Error:", errorData);
      throw new Error(errorData.error.message || 'Azure API returned an error.');
    }

    // หากสำเร็จ นำข้อมูล JSON ที่ได้จาก Azure ส่งกลับไปให้ Frontend
    const analysisData = await azureResponse.json();
    console.log("Successfully received data from Azure.");

    return response.status(200).json(analysisData);

  } catch (error) {
    console.error("Backend Processing Error:", error);
    return response.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}