import { formidable } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request, response) {
  const azureKey = process.env.AZURE_FACE_API_KEY;
  const azureEndpoint = process.env.AZURE_FACE_API_ENDPOINT;

  if (!azureKey || !azureEndpoint) {
    return response.status(500).json({ message: 'Server configuration error.' });
  }

  const data = await new Promise((resolve, reject) => {
    const form = formidable();
    form.parse(request, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  try {
    const imageFile = data.files.image[0];
    const imageBuffer = fs.readFileSync(imageFile.filepath);
    
    // --- โค้ดส่วนที่สำคัญที่สุด ---
    // URL นี้ได้เอา `returnFaceId=true` ที่เป็นปัญหาออกไปแล้ว
    const cleanEndpoint = azureEndpoint.endsWith('/') ? azureEndpoint.slice(0, -1) : azureEndpoint;
    const azureApiUrl = `${cleanEndpoint}/face/v1.0/detect?returnFaceLandmarks=true&detectionModel=detection_01&returnRecognitionModel=false`;
    // ----------------------------

    console.log("Calling Azure API with the ABSOLUTELY FINAL corrected URL:", azureApiUrl);

    const azureResponse = await fetch(azureApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': azureKey,
      },
      body: imageBuffer,
    });
    
    const responseText = await azureResponse.text();

    if (!azureResponse.ok) {
      console.error("Azure API Error Raw Response:", responseText);
      const errorData = JSON.parse(responseText);
      throw new Error(errorData.error.message || 'Azure API returned an error.');
    }

    const analysisData = JSON.parse(responseText);
    console.log("SUCCESS! Received valid data from Azure.");

    return response.status(200).json(analysisData);

  } catch (error) {
    console.error("Backend Processing Error:", error);
    return response.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}