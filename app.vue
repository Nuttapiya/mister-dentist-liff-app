<script setup>
import { ref, onMounted, computed } from 'vue';
import imageCompression from 'browser-image-compression';

const LIFF_ID = '2007601116-6GoXj5DR';

// --- 1. State Management ---
const profile = ref(null);
const errorMessage = ref('');
const isLoading = ref(true);
const isAnalyzing = ref(false);
const selectedFile = ref(null);
const imagePreviewUrl = ref('');
const analysisScores = ref({
  symmetry: null,
  cant: null,
  chin: null,
  mouthCentering: null,
});
const isModalVisible = ref(false);
const modalTitle = ref('');
const modalContent = ref('');

// --- 2. Legal & Policy Content ---
const termsOfService = `
<strong>1. วัตถุประสงค์ของบริการ</strong><br>
แอปพลิเคชันนี้เป็นเครื่องมือให้ข้อมูลเบื้องต้นเพื่อประเมินสุนทรียศาสตร์ของรอยยิ้มและใบหน้าโดยใช้เทคโนโลยี AI เท่านั้น ผลลัพธ์ที่ได้ไม่ใช่การวินิจฉัยทางการแพทย์ และไม่สามารถใช้แทนคำแนะนำ การตรวจ หรือการวินิจฉัยจากทันตแพทย์ผู้เชี่ยวชาญได้
<br><br>
<strong>2. การใช้งาน</strong><br>
ผู้ใช้ตกลงที่จะใช้บริการนี้เพื่อวัตถุประสงค์ส่วนบุคคลและให้ข้อมูลเท่านั้น และจะไม่นำผลลัพธ์ไปใช้อ้างอิงทางการแพทย์หรือทางกฎหมายใดๆ
<br><br>
<strong>3. ข้อจำกัดความรับผิด</strong><br>
คลินิกทันตกรรมมิสเตอร์เดนทิสท์และผู้พัฒนาจะไม่รับผิดชอบต่อความเสียหายหรือการตัดสินใจใดๆ ที่เกิดจากการใช้ข้อมูลที่ได้รับจากแอปพลิเคชันนี้แต่เพียงผู้เดียว การตัดสินใจเกี่ยวกับการรักษาจะต้องทำผ่านการปรึกษากับทันตแพทย์ตัวจริงเท่านั้น
`;
const privacyPolicy = `
<strong>1. ข้อมูลที่เรารวบรวม</strong><br>
เมื่อคุณใช้บริการนี้ เราจะเข้าถึงข้อมูลต่อไปนี้:<br>
- ข้อมูลโปรไฟล์ LINE ของคุณ (ชื่อที่แสดง, รูปโปรไฟล์, User ID) เพื่อการแสดงผลที่เป็นส่วนตัว<br>
- รูปภาพใบหน้าที่คุณอัปโหลดเพื่อการวิเคราะห์
<br><br>
<strong>2. วัตถุประสงค์ในการใช้ข้อมูล</strong><br>
- รูปภาพของคุณจะถูกส่งไปยังบริการภายนอก (Microsoft Azure Face API) เพื่อประมวลผลด้วย AI และจะถูกลบทิ้งตามนโยบายของผู้ให้บริการ ไม่มีการเก็บรักษาไว้ถาวร<br>
- ผลการวิเคราะห์และข้อมูลโปรไฟล์ของคุณจะถูกใช้เพื่อแสดงผลภายในแอป และเพื่อให้ทีมงานของเราสามารถให้บริการและให้คำแนะนำที่เหมาะสมหากคุณทำการติดต่อเข้ามาผ่านปุ่ม CTA<br>
- เราจะไม่นำข้อมูลหรือรูปภาพของคุณไปขายหรือเปิดเผยให้แก่บุคคลที่สามเพื่อวัตถุประสงค์ทางการตลาดอื่นใด
<br><br>
<strong>3. ความปลอดภัยของข้อมูล</strong><br>
เรามีมาตรการในการปกป้องข้อมูลของคุณจากการเข้าถึงโดยไม่ได้รับอนุญาต อย่างไรก็ตาม การส่งข้อมูลผ่านอินเทอร์เน็ตไม่มีความปลอดภัย 100%
`;

// --- 3. Business Logic (Calculations, Interpretations, Recommendations) ---
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
const calculateMouthCentering = (landmarks) => {
  if (!landmarks?.noseTip || !landmarks?.upperLipBottom || !landmarks?.pupilLeft || !landmarks?.pupilRight) return null;
  const midPointBetweenEyesX = (landmarks.pupilLeft.x + landmarks.pupilRight.x) / 2;
  const facialMidlineX = (landmarks.noseTip.x + midPointBetweenEyesX) / 2;
  const mouthCenterX = landmarks.upperLipBottom.x;
  const horizontalDeviation = Math.abs(mouthCenterX - facialMidlineX);
  const normalizationFactor = Math.abs(landmarks.pupilRight.x - landmarks.pupilLeft.x);
  if (normalizationFactor === 0) return 100;
  const deviationRatio = horizontalDeviation / normalizationFactor;
  const score = Math.max(0, (1 - deviationRatio / 0.15)) * 100;
  return score;
};
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
const mouthCenteringInterpretation = computed(() => {
  const score = analysisScores.value.mouthCentering;
  if (score === null) return '';
  if (score >= 90) return 'ยอดเยี่ยม! ตำแหน่งปากของคุณสมดุลกับแนวกึ่งกลางของใบหน้า';
  if (score >= 75) return 'ดี! ตำแหน่งปากมีการเบี่ยงเบนจากแนวกึ่งกลางเล็กน้อย';
  return 'ควรปรึกษา: ตำแหน่งปากของคุณอาจไม่สมดุลกับแนวกึ่งกลางใบหน้า';
});

// --- อัปเดต: เพิ่ม Mouth Centering ในการสร้างคำแนะนำ ---
const overallRecommendation = computed(() => {
  const { symmetry, cant, chin, mouthCentering } = analysisScores.value;
  if (symmetry === null || cant === null || chin === null || mouthCentering === null) return null;
  if (symmetry >= 95 && cant <= 2.0 && chin >= 90 && mouthCentering >= 90) return { title: "รอยยิ้มสมบูรณ์แบบ! ✨", message: "ผลการวิเคราะห์บ่งชี้ว่าคุณมีโครงสร้างรอยยิ้มและใบหน้าที่สมดุลในระดับดีเยี่ยม หากต้องการเสริมความมั่นใจให้ถึงขีดสุด การฟอกสีฟันอาจเป็นทางเลือกที่น่าสนใจสำหรับคุณ", cta: "สนใจโปรโมชั่นฟอกสีฟัน" };
  if (chin < 75) return { title: "พบข้อควรพิจารณาด้านโครงสร้างใบหน้า", message: "AI ตรวจพบว่าคางของคุณอาจไม่ได้อยู่ในตำแหน่งกึ่งกลางใบหน้า ซึ่งอาจส่งผลต่อการสบฟันและรูปหน้าโดยรวม การจัดฟันอาจเป็นทางเลือกหนึ่งในการแก้ปัญหานี้", cta: "สนใจปรึกษาเรื่องจัดฟัน" };
  if (chin >= 90 && mouthCentering < 75) return { title: "พบตำแหน่งปากที่ไม่สมดุล", message: "AI ตรวจพบว่าตำแหน่งปากของคุณไม่สมดุลกับใบหน้าแม้ว่าโครงสร้างคางจะดี ปัญหานี้มักเกี่ยวข้องกับการเรียงตัวของฟัน การจัดฟันสามารถช่วยแก้ไขเรื่องนี้ได้โดยตรง", cta: "สนใจปรึกษาเรื่องการจัดฟัน" };
  if (cant > 4.0) return { title: "พบความเอียงของรอยยิ้ม", message: "AI ตรวจพบว่าระนาบรอยยิ้มของคุณอาจมีความเอียงเมื่อเทียบกับดวงตา การทำวีเนียร์ หรือการจัดฟัน สามารถช่วยปรับองศาของรอยยิ้มให้สวยงามและน่าดึงดูดยิ่งขึ้น", cta: "สนใจปรึกษาเรื่องวีเนียร์/จัดฟัน" };
  if (symmetry < 85) return { title: "พบความไม่สมมาตรของรอยยิ้ม", message: "AI ตรวจพบว่ามุมปากของคุณอาจยกตัวไม่เท่ากันเล็กน้อย การปรับปรุงรอยยิ้มด้วยการจัดฟันจะช่วยให้รอยยิ้มของคุณดูสมดุลและสวยงามยิ่งขึ้นได้", cta: "สนใจปรึกษาเรื่องจัดฟัน" };
  return { title: "รอยยิ้มของคุณอยู่ในเกณฑ์ที่ดี", message: "ผลการวิเคราะห์โดยรวมของคุณอยู่ในเกณฑ์ดี หากต้องการให้รอยยิ้มสวยงามสมบูรณ์แบบในทุกมิติมากยิ่งขึ้น สามารถนัดเข้ามาเพื่อปรึกษาและวางแผนการรักษาเฉพาะบุคคลได้เลย", cta: "สนใจนัดปรึกษาทันตแพทย์" };
});

// --- 4. Event Handlers & Lifecycle Hooks ---
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    imagePreviewUrl.value = URL.createObjectURL(file);
    analysisScores.value = { symmetry: null, cant: null, chin: null, mouthCentering: null };
    errorMessage.value = '';
  }
};
const analyzeSmile = async () => {
  if (!selectedFile.value) { alert('กรุณาเลือกรูปภาพก่อนครับ'); return; }
  isAnalyzing.value = true;
  errorMessage.value = '';
  analysisScores.value = { symmetry: null, cant: null, chin: null, mouthCentering: null };
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
        analysisScores.value.mouthCentering = calculateMouthCentering(faceData.faceLandmarks);
      } else { errorMessage.value = "AI ตรวจจับใบหน้าได้ แต่ไม่สามารถหาตำแหน่งสำคัญบนใบหน้าได้ กรุณาลองรูปที่ชัดเจนยิ่งขึ้น"; }
    } else { errorMessage.value = "AI ไม่สามารถตรวจจับใบหน้าในรูปภาพนี้ได้ กรุณาลองรูปอื่นที่เห็นใบหน้าชัดเจนครับ"; }
  } catch (e) { errorMessage.value = e.message; } 
  finally { isAnalyzing.value = false; }
};
const handleCtaClick = async () => {
  if (!overallRecommendation.value) return;
  const messageToCopy = `สวัสดีค่ะ สนใจ "${overallRecommendation.value.cta}" จากผลการวิเคราะห์ของ AI Smile Assessment ค่ะ`;
  try {
    await navigator.clipboard.writeText(messageToCopy);
    alert('ข้อความสำหรับปรึกษาถูกคัดลอกแล้ว!\n\nกรุณานำไปวางในห้องแชทเพื่อพูดคุยกับแอดมินต่อได้เลยค่ะ');
    const liffModule = await import('@line/liff');
    const liff = liffModule.default;
    if (liff.isInClient()) {
        liff.closeWindow();
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    alert('เกิดข้อผิดพลาด: ไม่สามารถคัดลอกข้อความได้โดยอัตโนมัติ');
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
    <div v-if="profile" class="profile-header"><img :src="profile.pictureUrl" class="profile-pic-small"><span>สวัสดี, {{ profile.displayName }}!</span></div>
    <div class="card"><h4 class="brand-name">Mister Dentist</h4><h3>AI Smile Assessment</h3><p>อัปโหลดรูปถ่ายรอยยิ้มหน้าตรงของคุณเพื่อรับการประเมินเบื้องต้น</p><div v-if="imagePreviewUrl" class="image-preview"><img :src="imagePreviewUrl"></div><div><label for="file-upload" class="custom-file-upload">เลือกรูปภาพ</label><input id="file-upload" type="file" @change="handleFileChange" accept="image/png, image/jpeg"><button type="button" @click="analyzeSmile" :disabled="!selectedFile || isAnalyzing"><span v-if="!isAnalyzing">วิเคราะห์รอยยิ้ม</span><span v-else>กำลังวิเคราะห์...</span></button></div></div>
    <div v-if="isAnalyzing" class="card result-card"><p>AI กำลังประมวลผล... กรุณารอสักครู่ ⏳</p></div>
    <div v-if="analysisScores.symmetry !== null" class="result-details">
      <div class="card result-card"><h4><span class="emoji">📐</span> ความสมมาตรของรอยยิ้ม</h4><div class="score-display"><div class="score-value">{{ analysisScores.symmetry.toFixed(1) }}<span>%</span></div><div class="progress-bar-container"><div class="progress-bar" :style="{ width: analysisScores.symmetry + '%' }"></div></div></div><p class="interpretation">{{ symmetryInterpretation }}</p></div>
      <div class="card result-card"><h4><span class="emoji">📏</span> ความเอียงของรอยยิ้ม</h4><div class="score-display"><div class="score-value">{{ analysisScores.cant.toFixed(2) }}<span>°</span></div></div><p class="interpretation">{{ cantInterpretation }}</p></div>
      <div class="card result-card"><h4><span class="emoji">📍</span> ความสมมาตรของคาง</h4><div class="score-display"><div class="score-value">{{ analysisScores.chin.toFixed(1) }}<span>%</span></div><div class="progress-bar-container"><div class="progress-bar" :style="{ width: analysisScores.chin + '%' }"></div></div></div><p class="interpretation">{{ chinInterpretation }}</p></div>
      <div class="card result-card"><h4><span class="emoji">👄</span> ตำแหน่งปาก</h4><div class="score-display"><div class="score-value">{{ analysisScores.mouthCentering.toFixed(1) }}<span>%</span></div><div class="progress-bar-container"><div class="progress-bar" :style="{ width: analysisScores.mouthCentering + '%' }"></div></div></div><p class="interpretation">{{ mouthCenteringInterpretation }}</p></div>
    </div>
    <div v-if="overallRecommendation" class="card recommendation-card"><h3><span class="emoji">💡</span> บทสรุปและคำแนะนำสำหรับคุณ</h3><h4>{{ overallRecommendation.title }}</h4><p>{{ overallRecommendation.message }}</p><button class="cta-button" @click="handleCtaClick">{{ overallRecommendation.cta }}</button></div>
    <div v-if="errorMessage" class="card result-card error"><h4>เกิดข้อผิดพลาด</h4><p>{{ errorMessage }}</p></div>

    <footer class="footer-links">
        <p>การวิเคราะห์นี้เป็นการประเมินเบื้องต้นโดย AI และไม่สามารถใช้แทนการวินิจฉัยจากทันตแพทย์ผู้เชี่ยวชาญได้</p>
        <a href="#" @click.prevent="showModal('terms')">ข้อตกลงในการใช้งาน</a> | 
        <a href="#" @click.prevent="showModal('privacy')">นโยบายความเป็นส่วนตัว</a>
    </footer>
    <div v-if="isModalVisible" class="modal-overlay" @click="isModalVisible = false"><div class="modal-content" @click.stop><div class="modal-header"><h3>{{ modalTitle }}</h3><button class="close-button" @click="isModalVisible = false">&times;</button></div><div class="modal-body" v-html="modalContent"></div></div></div>
  </div>
</template>

<style>
/* สไตล์เวอร์ชันสมบูรณ์ */
:root { --line-green: #06c755; --bg-color: #f0f2f5; --card-bg: white; --text-color: #1c1e21; --progress-bg: #e9ebee; --primary-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
body { margin: 0; font-family: var(--primary-font); background-color: var(--bg-color); color: var(--text-color); }
.container { padding: 15px; max-width: 500px; margin: 0 auto; padding-bottom: 30px; }
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
.footer-links { text-align: center; margin-top: 30px; padding: 0 10px;}
.footer-links p { font-size: 12px; color: #888; margin-bottom: 5px; }
.footer-links a { font-size: 12px; color: #555; text-decoration: underline; cursor: pointer; }
.footer-links a:hover { color: var(--line-green); }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
.modal-header h3 { margin: 0; font-size: 18px; }
.close-button { background: none; border: none; font-size: 24px; cursor: pointer; }
.modal-body { font-size: 14px; line-height: 1.7; text-align: left; }
.modal-body strong { color: #333; }
.brand-name {
  color: #888; /* สีเทาอ่อน */
  font-weight: 500; /* ความหนาตัวอักษรระดับกลาง */
  font-size: 16px; /* ขนาดตัวอักษร */
  margin-bottom: 0; /* ลดระยะห่างด้านล่าง */
  letter-spacing: 0.5px; /* เพิ่มระยะห่างระหว่างตัวอักษรเล็กน้อย */
}
</style>