<script setup>
import { ref, onMounted } from 'vue';
import liff from '@line/liff';

// -- ตั้งค่า --
// นำ LIFF ID ที่คัดลอกมาวางที่นี่
    const LIFF_ID = '2007601116-6GoXj5DR';
// -----------

// สร้างตัวแปรสำหรับเก็บข้อมูลแบบ Real-time
const profile = ref(null);
const error = ref(null);
const isLoading = ref(true);

// onMounted คือคำสั่งที่จะทำงานอัตโนมัติเมื่อหน้าเว็บถูกโหลดขึ้นมา
onMounted(() => {
  // เริ่มต้นการเชื่อมต่อกับ LIFF SDK
  liff.init({
    liffId: LIFF_ID
  })
  .then(() => {
    // เมื่อเชื่อมต่อสำเร็จ
    console.log('LIFF initialized successfully.');

    // ตรวจสอบว่าผู้ใช้ล็อกอินเข้าสู่ LINE แล้วหรือยัง
    if (!liff.isLoggedIn()) {
      // ถ้ายังไม่ล็อกอิน ให้พาไปหน้าล็อกอินของ LINE
      // (ปกติถ้าเปิดใน LINE จะล็อกอินให้อัตโนมัติ)
      liff.login();
      return;
    }

    // ถ้าล็อกอินแล้ว ให้ดึงข้อมูลโปรไฟล์
    liff.getProfile()
      .then(profileData => {
        // นำข้อมูลที่ได้ไปเก็บในตัวแปร profile ของเรา
        profile.value = profileData;
        console.log('Profile loaded:', profileData);
      })
      .catch(err => {
        // จัดการ Error หากดึงโปรไฟล์ไม่สำเร็จ
        console.error('Profile loading error:', err);
        error.value = 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้';
      });
  })
  .catch(err => {
    // จัดการ Error หากการเชื่อมต่อ LIFF เริ่มต้นไม่สำเร็จ
    console.error('LIFF initialization failed:', err);
    error.value = 'ไม่สามารถเริ่มต้นการเชื่อมต่อกับ LINE ได้';
  })
  .finally(() => {
    // เมื่อทุกอย่างเสร็จสิ้น (ไม่ว่าจะสำเร็จหรือล้มเหลว)
    isLoading.value = false;
  });
});
</script>

<template>
    <div class="container">
        <div v-if="isLoading" class="card loading">
            <p>กำลังเชื่อมต่อกับ LINE...</p>
        </div>

        <div v-else-if="error" class="card error">
            <h3>เกิดข้อผิดพลาด</h3>
            <p>{{ error }}</p>
        </div>

        <div v-else-if="profile" class="card success">
            <img :src="profile.pictureUrl" alt="Profile Picture" class="profile-pic">
            <h1>สวัสดี, {{ profile.displayName }}!</h1>
            <p>ยินดีต้อนรับสู่ AI Smile Assessment</p>
            <p class="user-id">Your LINE User ID: {{ profile.userId }}</p>
            <hr>
            <p>ตอนนี้ระบบพร้อมสำหรับขั้นตอนต่อไปแล้ว!</p>
        </div>
    </div>
</template>

<style>
    /* สไตล์เบื้องต้นเพื่อให้ดูง่าย */
    body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f0f2f5;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }

    .container {
        width: 100%;
        max-width: 400px;
        padding: 20px;
    }

    .card {
        background-color: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    .loading, .error {
        padding: 40px;
    }

        .error h3 {
            color: #d93025;
        }

    .profile-pic {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        border: 4px solid #06c755;
        margin-bottom: 16px;
    }

    h1 {
        margin: 0 0 8px 0;
        font-size: 22px;
    }

    .user-id {
        font-size: 12px;
        color: #888;
        word-wrap: break-word;
    }
</style>