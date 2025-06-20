<script setup>
import { ref, onMounted, computed } from 'vue';

// LIFF ID ของคุณ
const LIFF_ID = '2007601116-6GoXj5DR';

// ตัวแปรสำหรับจัดการสถานะต่างๆ
const profile = ref(null);
const errorMessage = ref('');
const isLoading = ref(true);
const isAnalyzing = ref(false);

// ตัวแปรสำหรับจัดการรูปภาพ
const selectedFile = ref(null);
const imagePreviewUrl = ref('');

// ตัวแปรสำหรับเก็บผลการวิเคราะห์
const analysisScores = ref({
  symmetry: null,
});

// --- ฟังก์ชันคำนวณ ---
const calculateSmileSymmetry = (landmarks) => {
  // เพิ่มการตรวจสอบให้ละเอียดขึ้น
  if (!landmarks || !landmarks.mouthLeft || !landmarks.mouthRight || !landmarks.pupilLeft) {
    return null; 
  }
  const verticalDifference = Math.abs(landmarks.mouthLeft.y - landmarks.mouthRight.y);
  const normalizationFactor = Math.abs(landmarks.mouthLeft.y - landmarks.pupilLeft.y);
  if (normalizationFactor === 0) return 100;
  const errorRatio = verticalDifference / normalizationFactor;
  const score = Math.max(0, (1 - errorRatio / 0.2)) * 100;
  return score;
};

const symmetryInterpretation = computed(() => {
  const score = analysisScores.value.symmetry;
  if (score === null) return '';
  if (score >= 95) return 'ยอดเยี่ยม! รอยยิ้มของคุณมีความสมมาตรในระดับที่ดีมาก';
  if (score >= 85) return 'ดี! มีความสมมาตรในระดับที่ดี อาจปรับปรุงได้เล็กน้อย';
  if (score >= 70) return 'ปานกลาง มีความเบี้ยวเล็กน้อยที่สามารถสังเกตได้';
  return 'ควรปรึกษา: รอยยิ้มของคุณอาจมีความไม่สมมาตรที่ชัดเจน';
});

// --- ฟังก์ชันหลักที่แก้ไขให้แข็งแรงขึ้น ---
const analyzeSmile = async () => {
  if (!selectedFile.value) { alert('กรุณาเลือกรูปภาพก่อนครับ'); return; }
  
  console.log("Analyze button clicked. Starting process..."); // เพิ่ม Log เพื่อตรวจสอบว่าฟังก์ชันถูกเรียกใช้
  
  isAnalyzing.value = true;
  errorMessage.value = '';
  analysisScores.value = { symmetry: null };

  const formData = new FormData();
  formData.append('image', selectedFile.value);

  try {
    const response = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await response.json();

    if (!response.ok) {
      // ถ้าหลังบ้านส่ง Error กลับมา ให้แสดง Error นั้น
      throw new Error(data.message || 'เกิดข้อผิดพลาดในการวิเคราะห์จากเซิร์ฟเวอร์');
    }

    console.log("Received data from backend:", data); // เพิ่ม Log เพื่อดูข้อมูลที่ได้รับ

    if (data && data.length > 0) {
      const faceData = data[0]; // ข้อมูลใบหน้าที่ 1 ที่เจอ
      
      // **จุดสำคัญที่เพิ่มเข้ามา: ตรวจสอบว่ามี faceLandmarks หรือไม่**
      if (faceData.faceLandmarks) {
        const score = calculateSmileSymmetry(faceData.faceLandmarks);
        analysisScores.value.symmetry = score;
        console.log("Symmetry score calculated:", score);
      } else {
        // กรณีที่ Azure เจอใบหน้า แต่หา Landmark ไม่เจอ
        errorMessage.value = "AI ตรวจจับใบหน้าได้ แต่ไม่สามารถหาตำแหน่งสำคัญบนใบหน้าได้ กรุณาลองรูปที่ชัดเจนยิ่งขึ้น";
      }
    } else {
      errorMessage.value = "AI ไม่สามารถตรวจจับใบหน้าในรูปภาพนี้ได้ กรุณาลองรูปอื่นที่เห็นใบหน้าชัดเจนครับ";
    }

  } catch (e) {
    console.error("Analysis failed:", e); // เพิ่ม Log Error ที่ละเอียดขึ้น
    errorMessage.value = e.message;
  } finally {
    isAnalyzing.value = false;
  }
};

// ฟังก์ชันเริ่มต้น LIFF (เหมือนเดิม)
onMounted(async () => {
  try {
    isLoading.value = true;
    const liffModule = await import('@line/liff');
    const liff = liffModule.default;
    await liff.init({ liffId: LIFF_ID });
    if (liff.isLoggedIn()) { profile.value = await liff.getProfile(); } 
    else { liff.login(); }
  } catch (e) {
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
      <div v-if="imagePreviewUrl" class="image-preview"><img :src="imagePreviewUrl" alt="Selected image preview"></div>
      <form @submit.prevent="analyzeSmile">
        <label for="file-upload" class="custom-file-upload">เลือกรูปภาพ</label>
        <input id="file-upload" type="file" @change="handleFileChange" accept="image/png, image/jpeg">
        <button type="submit" :disabled="!selectedFile || isAnalyzing">
          <span v-if="!isAnalyzing">วิเคราะห์รอยยิ้ม</span>
          <span v-else>กำลังวิเคราะห์...</span>
        </button>
      </form>
    </div>

    <div v-if="isAnalyzing" class="card result-card"><p>AI กำลังประมวลผล... กรุณารอสักครู่ ✨</p></div>
    
    <div v-if="analysisScores.symmetry !== null" class="card result-card">
      <h4><span class="emoji">📐</span> ความสมมาตรของรอยยิ้ม</h4>
      <div class="score-display">
        <div class="score-value">{{ analysisScores.symmetry.toFixed(1) }}<span>%</span></div>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: analysisScores.symmetry + '%' }"></div>
        </div>
      </div>
      <p class="interpretation">{{ symmetryInterpretation }}</p>
    </div>

    <div v-if="errorMessage" class="card result-card error">
      <h4>เกิดข้อผิดพลาด</h4>
      <p>{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style>
/* สไตล์เหมือนเดิมทุกประการ ไม่มีการเปลี่ยนแปลง */
:root { --line-green: #06c755; --bg-color: #f0f2f5; --card-bg: white; --text-color: #1c1e21; --progress-bg: #e9ebee; }
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
.result-card h4 { margin-top: 0; font-size: 18px; display: flex; align-items: center;}
.result-card .emoji { font-size: 24px; margin-right: 10px; }
.result-card.error { border-left: 5px solid #d93025; color: #d93025; }
.score-display { display: flex; align-items: center; margin: 15px 0; }
.score-value { font-size: 28px; font-weight: bold; color: var(--line-green); margin-right: 15px; }
.score-value span { font-size: 16px; font-weight: normal; }
.progress-bar-container { flex-grow: 1; height: 10px; background-color: var(--progress-bg); border-radius: 5px; overflow: hidden; }
.progress-bar { height: 100%; background-color: var(--line-green); border-radius: 5px; transition: width 0.5s ease-in-out; }
.interpretation { font-size: 14px; color: #606770; margin-top: 0; }
</style>