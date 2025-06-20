<script setup>
import { ref, onMounted, computed } from 'vue';
import imageCompression from 'browser-image-compression';

const LIFF_ID = '2007601116-6GoXj5DR';

const profile = ref(null);
const errorMessage = ref('');
const isLoading = ref(true);
const isAnalyzing = ref(false);
const selectedFile = ref(null);
const imagePreviewUrl = ref('');

// --- ตัด 'lipFullness' ออก เหลือ 3 การวิเคราะห์ ---
const analysisScores = ref({
  symmetry: null,
  cant: null,
  chin: null,
});

// --- ฟังก์ชันคำนวณ 3 ตัว (เหมือนเดิม) ---
const calculateSmileSymmetry = (landmarks) => {
  if (!landmarks?.mouthLeft || !landmarks?.mouthRight || !landmarks?.pupilLeft) return null;
  const verticalDifference = Math.abs(landmarks.mouthLeft.y - landmarks.mouthRight.y);
  const normalizationFactor = Math.abs(landmarks.mouthLeft.y - landmarks.pupilLeft.y);
  if (normalizationFactor === 0) return 100;
  const errorRatio = verticalDifference / normalizationFactor;
  const score = Math.max(0, (1 - errorRatio / 0.2)) * 100;
  return score;
};
const calculateSmileCant = (landmarks) => {
  if (!landmarks?.pupilLeft || !landmarks?.pupilRight || !landmarks?.mouthLeft || !landmarks?.mouthRight) return null;
  const getAngle = (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  const eyeAngle = getAngle(landmarks.pupilLeft, landmarks.pupilRight);
  const mouthAngle = getAngle(landmarks.mouthLeft, landmarks.mouthRight);
  return Math.abs(eyeAngle - mouthAngle);
};
const calculateChinDeviation = (landmarks) => {
  if (!landmarks?.noseTip || !landmarks?.underLipBottom || !landmarks?.pupilLeft || !landmarks?.pupilRight) return null;
  const midPointBetweenEyesX = (landmarks.pupilLeft.x + landmarks.pupilRight.x) / 2;
  const facialMidlineX = (landmarks.noseTip.x + midPointBetweenEyesX) / 2;
  const horizontalDeviation = Math.abs(landmarks.underLipBottom.x - facialMidlineX);
  const normalizationFactor = Math.abs(landmarks.pupilRight.x - landmarks.pupilLeft.x);
  if (normalizationFactor === 0) return 100;
  const deviationRatio = horizontalDeviation / normalizationFactor;
  const score = Math.max(0, (1 - deviationRatio / 0.1)) * 100;
  return score;
};

// --- ฟังก์ชันตีความผล 3 ตัว (เหมือนเดิม) ---
const symmetryInterpretation = computed(() => {
  const score = analysisScores.value.symmetry;
  if (score === null) return '';
  if (score >= 95) return 'ยอดเยี่ยม! รอยยิ้มของคุณมีความสมมาตรในระดับที่ดีมาก';
  if (score >= 85) return 'ดี! มีความสมมาตรในระดับที่ดี อาจปรับปรุงได้เล็กน้อย';
  return 'ควรปรึกษา: รอยยิ้มของคุณอาจมีความไม่สมมาตรที่ชัดเจน';
});
const cantInterpretation = computed(() => {
  const angle = analysisScores.value.cant;
  if (angle === null) return '';
  if (angle <= 2.0) return 'ยอดเยี่ยม! ระนาบรอยยิ้มของคุณขนานกับดวงตาเป็นอย่างดี';
  if (angle <= 4.0) return 'ดี! มีความเอียงเล็กน้อย ซึ่งถือว่าอยู่ในเกณฑ์ปกติ';
  return 'ควรปรึกษา: ระนาบรอยยิ้มของคุณมีความเอียงที่อาจสังเกตเห็นได้';
});
const chinInterpretation = computed(() => {
  const score = analysisScores.value.chin;
  if (score === null) return '';
  if (score >= 90) return 'ยอดเยี่ยม! คางของคุณอยู่ในตำแหน่งกึ่งกลางใบหน้าที่สมดุล';
  if (score >= 75) return 'ดี! มีการเบี่ยงเบนจากแนวกึ่งกลางเล็กน้อย ซึ่งพบได้ทั่วไป';
  return 'ควรปรึกษา: คางของคุณมีการเบี่ยงเบนจากแนวกึ่งกลางที่อาจส่งผลต่อโครงสร้างใบหน้า';
});

// --- ฟังก์ชันใหม่: สร้างบทสรุปและคำแนะนำบริการ ---
const overallRecommendation = computed(() => {
  const { symmetry, cant, chin } = analysisScores.value;
  if (symmetry === null || cant === null || chin === null) return null;

  // Case 1: Perfect Score
  if (symmetry >= 95 && cant <= 2.0 && chin >= 90) {
    return {
      title: "รอยยิ้มสมบูรณ์แบบ! ✨",
      message: "ผลการวิเคราะห์บ่งชี้ว่าคุณมีโครงสร้างรอยยิ้มและใบหน้าที่สมดุลในระดับดีเยี่ยม หากต้องการเสริมความมั่นใจให้ถึงขีดสุด การฟอกสีฟันอาจเป็นทางเลือกที่น่าสนใจสำหรับคุณ",
      cta: "ดูโปรโมชั่นฟอกสีฟัน"
    };
  }
  // Case 2: Major Issue (Chin or Cant)
  if (chin < 75) {
    return {
      title: "พบข้อควรพิจารณาด้านโครงสร้างใบหน้า",
      message: "AI ตรวจพบว่าคางของคุณอาจไม่ได้อยู่ในตำแหน่งกึ่งกลางใบหน้า ซึ่งอาจส่งผลต่อการสบฟันและรูปหน้าโดยรวม การจัดฟันอาจเป็นทางเลือกหนึ่งในการแก้ปัญหานี้",
      cta: "ปรึกษาเรื่องการจัดฟัน"
    };
  }
  if (cant > 4.0) {
    return {
      title: "พบความเอียงของรอยยิ้ม",
      message: "AI ตรวจพบว่าระนาบรอยยิ้มของคุณอาจมีความเอียงเมื่อเทียบกับดวงตา การทำวีเนียร์ หรือการจัดฟัน สามารถช่วยปรับองศาของรอยยิ้มให้สวยงามและน่าดึงดูดยิ่งขึ้น",
      cta: "ปรึกษาเรื่องวีเนียร์/จัดฟัน"
    };
  }
  // Case 3: Minor Issue (Symmetry)
  if (symmetry < 85) {
    return {
      title: "พบความไม่สมมาตรของรอยยิ้ม",
      message: "AI ตรวจพบว่ามุมปากของคุณอาจยกตัวไม่เท่ากันเล็กน้อย การปรับปรุงรอยยิ้มด้วยการจัดฟันจะช่วยให้รอยยิ้มของคุณดูสมดุลและสวยงามยิ่งขึ้นได้",
      cta: "ปรึกษาเรื่องจัดฟันใส"
    };
  }
  // Case 4: Generally Good
  return {
    title: "รอยยิ้มของคุณอยู่ในเกณฑ์ที่ดี",
    message: "ผลการวิเคราะห์โดยรวมของคุณอยู่ในเกณฑ์ดี หากต้องการให้รอยยิ้มสวยงามสมบูรณ์แบบในทุกมิติ สามารถนัดเข้ามาเพื่อปรึกษาและวางแผนการรักษาเฉพาะบุคคลได้เลย",
    cta: "นัดปรึกษาทันตแพทย์"
  };
});

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    imagePreviewUrl.value = URL.createObjectURL(file);
    analysisScores.value = { symmetry: null, cant: null, chin: null };
    errorMessage.value = '';
  }
};
const analyzeSmile = async () => {
  if (!selectedFile.value) { alert('กรุณาเลือกรูปภาพก่อนครับ'); return; }
  isAnalyzing.value = true;
  errorMessage.value = '';
  analysisScores.value = { symmetry: null, cant: null, chin: null };

  try {
    const options = { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true };
    const compressedFile = await imageCompression(selectedFile.value, options);
    const formData = new FormData();
    formData.append('image', compressedFile);
    const response = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) { throw new Error(data.message || 'เกิดข้อผิดพลาดในการวิเคราะห์จากเซิร์ฟเวอร์'); }

    if (data && data.length > 0) {
      const faceData = data[0];
      if (faceData.faceLandmarks) {
        analysisScores.value.symmetry = calculateSmileSymmetry(faceData.faceLandmarks);
        analysisScores.value.cant = calculateSmileCant(faceData.faceLandmarks);
        analysisScores.value.chin = calculateChinDeviation(faceData.faceLandmarks);
      } else {
        errorMessage.value = "AI ตรวจจับใบหน้าได้ แต่ไม่สามารถหาตำแหน่งสำคัญบนใบหน้าได้ กรุณาลองรูปที่ชัดเจนยิ่งขึ้น";
      }
    } else {
      errorMessage.value = "AI ไม่สามารถตรวจจับใบหน้าในรูปภาพนี้ได้ กรุณาลองรูปอื่นที่เห็นใบหน้าชัดเจนครับ";
    }
  } catch (e) {
    errorMessage.value = e.message;
  } finally {
    isAnalyzing.value = false;
  }
};
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
      <div>
        <label for="file-upload" class="custom-file-upload">เลือกรูปภาพ</label>
        <input id="file-upload" type="file" @change="handleFileChange" accept="image/png, image/jpeg">
        <button type="button" @click="analyzeSmile" :disabled="!selectedFile || isAnalyzing">
          <span v-if="!isAnalyzing">วิเคราะห์รอยยิ้ม</span>
          <span v-else>กำลังวิเคราะห์...</span>
        </button>
      </div>
    </div>

    <div v-if="isAnalyzing" class="card result-card"><p>AI กำลังประมวลผล... กรุณารอสักครู่ ✨</p></div>
    
    <div v-if="analysisScores.symmetry !== null" class="result-details">
      <div class="card result-card">
        <h4><span class="emoji">📐</span> ความสมมาตรของรอยยิ้ม</h4>
        <div class="score-display"><div class="score-value">{{ analysisScores.symmetry.toFixed(1) }}<span>%</span></div>
          <div class="progress-bar-container"><div class="progress-bar" :style="{ width: analysisScores.symmetry + '%' }"></div></div>
        </div>
        <p class="interpretation">{{ symmetryInterpretation }}</p>
      </div>
      <div class="card result-card">
        <h4><span class="emoji">📏</span> ความเอียงของรอยยิ้ม</h4>
        <div class="score-display"><div class="score-value">{{ analysisScores.cant.toFixed(2) }}<span>°</span></div></div>
        <p class="interpretation">{{ cantInterpretation }}</p>
      </div>
      <div class="card result-card">
        <h4><span class="emoji">📍</span> ความสมมาตรของคาง</h4>
        <div class="score-display"><div class="score-value">{{ analysisScores.chin.toFixed(1) }}<span>%</span></div>
          <div class="progress-bar-container"><div class="progress-bar" :style="{ width: analysisScores.chin + '%' }"></div></div>
        </div>
        <p class="interpretation">{{ chinInterpretation }}</p>
      </div>
    </div>
    
    <div v-if="overallRecommendation" class="card recommendation-card">
      <h3><span class="emoji">💡</span> บทสรุปและคำแนะนำสำหรับคุณ</h3>
      <h4>{{ overallRecommendation.title }}</h4>
      <p>{{ overallRecommendation.message }}</p>
      <button class="cta-button">{{ overallRecommendation.cta }}</button>
    </div>
    <div v-if="errorMessage" class="card result-card error">
      <h4>เกิดข้อผิดพลาด</h4>
      <p>{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style>
/* สไตล์เวอร์ชันสุดท้าย */
:root { --line-green: #06c755; --bg-color: #f0f2f5; --card-bg: white; --text-color: #1c1e21; --progress-bg: #e9ebee; --primary-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
body { margin: 0; font-family: var(--primary-font); background-color: var(--bg-color); color: var(--text-color); }
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
.result-details { margin-top: 15px; }
.result-card { text-align: left; }
.result-card h4 { margin-top: 0; font-size: 16px; display: flex; align-items: center;}
.result-card .emoji { font-size: 22px; margin-right: 10px; }
.result-card.error { border-left: 5px solid #d93025; color: #d93025; }
.score-display { display: flex; align-items: center; margin: 10px 0; }
.score-value { font-size: 24px; font-weight: bold; color: var(--line-green); min-width: 80px; }
.score-value span { font-size: 16px; font-weight: normal; margin-left: 2px; }
.progress-bar-container { flex-grow: 1; height: 10px; background-color: var(--progress-bg); border-radius: 5px; overflow: hidden; }
.progress-bar { height: 100%; background-color: var(--line-green); border-radius: 5px; transition: width 0.5s ease-in-out; }
.interpretation { font-size: 14px; color: #606770; margin: 0; padding-top: 5px; border-top: 1px solid #eee; }
.recommendation-card { margin-top: 25px; border: 2px solid var(--line-green); background: linear-gradient(135deg, #e8f8f0, #ffffff); }
.recommendation-card h3 { font-size: 20px; }
.recommendation-card h4 { font-size: 18px; color: #333; margin-top: 10px; }
.recommendation-card p { font-size: 15px; color: #333; line-height: 1.6; }
.recommendation-card .cta-button { margin-top: 15px; }
</style>