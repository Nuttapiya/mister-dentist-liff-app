// นี่คือ Backend ของเราที่ทำงานบน Vercel (Serverless Function)

export default async function handler(request, response) {
  // อนุญาตให้ request จากทุกที่เข้ามาได้ (สำหรับทดสอบ)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // จัดการ preflight request สำหรับ CORS
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // ตรวจสอบว่าเป็นการส่งข้อมูลแบบ POST หรือไม่
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // ในขั้นตอนนี้ เราจะยังไม่เชื่อมต่อกับ Azure
    // เราแค่จะทดสอบว่า Backend รับรูปภาพได้สำเร็จหรือไม่
    
    // Vercel จะจัดการข้อมูลที่ส่งมาให้เรา
    // เราไม่จำเป็นต้อง parse multipart/form-data เอง
    // แต่ในขั้นตอนนี้ เราแค่จะส่งข้อความตอบกลับไปก่อน
    
    console.log("Backend received a request!");

    // ส่งข้อความสำเร็จกลับไปให้ Frontend (ชั่วคราว)
    return response.status(200).json({ 
      message: "Backend received the image successfully!",
      analysis: {
        symmetry: "95%",
        smile_line: "Good",
        comment: "This is a placeholder result from the backend."
      }
    });

  } catch (error) {
    console.error("Backend Error:", error);
    return response.status(500).json({ message: 'Internal Server Error' });
  }
}