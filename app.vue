<script setup>
import { ref, onMounted } from 'vue';

// LIFF ID ของคุณถูกใส่ไว้เรียบร้อยแล้ว
const LIFF_ID = '2007601116-6GoXj5DR';

// ตัวแปรสำหรับจัดการสถานะต่างๆ
const profile = ref(null);
const errorMessage = ref('');
const isLoading = ref(true);
const analysisResult = ref(null);
const isAnalyzing = ref(false);

// ตัวแปรสำหรับจัดการรูปภาพ
const selectedFile = ref(null);
const imagePreviewUrl = ref('');

// --- ฟังก์ชันหลัก ---

// ฟังก์ชันเมื่อมีการเลือกไฟล์
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    // สร้าง URL เพื่อแสดงภาพตัวอย่าง
    imagePreviewUrl.value = URL.createObjectURL(file);
    analysisResult.value = null; // รีเซ็ตผลลัพธ์เก่า
  }
};

// ฟังก์ชันเมื่อกดปุ่ม "วิเคราะห์รอยยิ้ม"
const analyzeSmile = async () => {
  if (!selectedFile.value) {
    alert('กรุณาเลือกรูปภาพก่อนครับ');
    return;
  }

  isAnalyzing.value = true;
  analysisResult.value = null;
  errorMessage.value = '';

  const formData = new FormData();
  formData.append('image', selectedFile.value);

  try {
    // ส่งรูปภาพไปยัง Backend API ของเรา
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'เกิดข้อผิดพลาดในการวิเคราะห์');
    }

    // เมื่อสำเร็จ นำผลลัพธ์มาแสดง
    analysisResult.value = data;

  } catch (e) {
    errorMessage.value = e.message;
  } finally {
    isAnalyzing.value = false;
  }
};


// ฟังก์ชันเริ่มต้นการเชื่อมต่อ LIFF
onMounted(async () => {
  try {
    const liffModule = await import('@line/liff');
    const liff = liffModule.default;
    
    await liff.init({ liffId: LIFF_ID });

    if (liff.isLoggedIn()) {
      profile.value = await liff.getProfile();
    } else {
      liff.login();
    }
  } catch (e) {
    console.error(e);
    errorMessage.value = "เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE: " + e.message;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="container">
    <div v-if="profile" class="profile-header">
      <img :src="profile.pictureUrl" alt="Profile Picture" class="profile-pic-small">
      <span>สวัสดี, {{ profile.displayName }}!</span>
    </div>

    <div class="card">
      <h3>AI Smile Assessment</h3>
      <p>อัปโหลดรูปถ่ายรอยยิ้มหน้าตรงของคุณเพื่อรับการประเมินเบื้องต้น</p>

      <div v-if="imagePreviewUrl" class="image-preview">
        <img :src="imagePreviewUrl" alt="Selected image preview">
      </div>
      
      <form @submit.prevent="analyzeSmile">
        <label for="file-upload" class="custom-file-upload">
          เลือกรูปภาพ
        </label>
        <input id="file-upload" type="file" @change="handleFileChange" accept="image/png, image/jpeg">
        
        <button type="submit" :disabled="!selectedFile || isAnalyzing">
          <span v-if="!isAnalyzing">วิเคราะห์รอยยิ้ม</span>
          <span v-else>กำลังวิเคราะห์...</span>
        </button>
      </form>
    </div>

    <div v-if="isAnalyzing" class="card result-card">
      <p>AI กำลังประมวลผล... กรุณารอสักครู่ ✨</p>
    </div>
    
    <div v-if="analysisResult" class="card result-card success">
      <h4>ผลการวิเคราะห์เบื้องต้น:</h4>
      <pre>{{ analysisResult }}</pre>
    </div>

    <div v-if="errorMessage" class="card result-card error">
      <h4>เกิดข้อผิดพลาด</h4>
      <p>{{ errorMessage }}</p>
    </div>

  </div>
</template>

<style>
/* สไตล์เวอร์ชันอัปเกรด */
:root { --line-green: #06c755; --bg-color: #f0f2f5; --card-bg: white; --text-color: #1c1e21; }
body { margin: 0; font-family: sans-serif; background-color: var(--bg-color); color: var(--text-color); }
.container { padding: 15px; max-width: 500px; margin: 0 auto; }
.profile-header { display: flex; align-items: center; margin-bottom: 15px; font-weight: bold; }
.profile-pic-small { width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; }
.card { background: var(--card-bg); padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; margin-bottom: 15px; }
.image-preview { margin-bottom: 20px; }
.image-preview img { max-width: 100%; max-height: 250px; border-radius: 8px; }
input[type="file"] { display: none; }
.custom-file-upload { display: inline-block; background-color: #e4e6eb; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-bottom: 15px; }
button { width: 100%; background-color: var(--line-green); color: white; border: none; padding: 12px; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background-color 0.2s; }
button:disabled { background-color: #a5d3b6; cursor: not-allowed; }
.result-card { text-align: left; }
.result-card h4 { margin-top: 0; }
.result-card.success { border-left: 5px solid var(--line-green); }
.result-card.error { border-left: 5px solid #d93025; color: #d93025; }
pre { background-color: #f0f2f5; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
</style>