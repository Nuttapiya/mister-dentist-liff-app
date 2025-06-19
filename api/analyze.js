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

  // --- DEBUGGING LOGS ---
  console.log("--- New Analysis Request Received ---");
  console.log("Azure Endpoint from Env Var:", azureEndpoint);
  console.log("Azure Key from Env Var (last 4 chars):", azureKey ? '...' + azureKey.slice(-4) : "Not Set!");
  // ------------------------

  if (!azureKey || !azureEndpoint) {
    console.error("Azure credentials are not set in environment variables.");
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

    // --- DEBUGGING LOGS ---
    console.log("Image buffer created, size:", imageBuffer.length, "bytes");
    // ------------------------

    const azureApiUrl = `${azureEndpoint}/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=true&returnFaceAttributes=age,gender,smile,emotion,headPose`;

    // --- DEBUGGING LOGS ---
    console.log("Calling Azure API with URL:", azureApiUrl);
    // ------------------------

    const azureResponse = await fetch(azureApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': azureKey,
      },
      body: imageBuffer,
    });

    const responseText = await azureResponse.text(); // อ่าน response เป็น text ก่อนเสมอ
    console.log("Azure raw response text:", responseText);

    if (!azureResponse.ok) {
      const errorData = JSON.parse(responseText);
      console.error("Azure API Error:", errorData);
      throw new Error(errorData.error.message || 'Azure API returned an error.');
    }

    const analysisData = JSON.parse(responseText);
    console.log("Successfully parsed data from Azure.");

    return response.status(200).json(analysisData);

  } catch (error) {
    console.error("Backend Processing Error:", error);
    return response.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}