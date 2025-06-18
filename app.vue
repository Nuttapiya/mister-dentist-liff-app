<script setup>
    import { ref, onMounted } from 'vue';

    // -- ตั้งค่า --
    // นำ LIFF ID ที่คัดลอกมาวางที่นี่
    const LIFF_ID = '2007601116-6GoXj5DR';
    // -----------

    // สร้างตัวแปรสำหรับเก็บข้อมูลแบบ Real-time
    const profile = ref(null);
    const error = ref(null);
    const isLoading = ref(true);

    // onMounted คือคำสั่งที่จะทำงาน "เฉพาะในฝั่งเบราว์เซอร์" เท่านั้น
    onMounted(async () => {
        try {
            // --- จุดที่แก้ไข ---
            // เราจะทำการ import ตัว liff ต่อเมื่ออยู่ในเบราว์เซอร์แล้วเท่านั้น
            const liffModule = await import('@line/liff');
            const liff = liffModule.default;
            // ------------------

            // เริ่มต้นการเชื่อมต่อกับ LIFF SDK
            await liff.init({ liffId: LIFF_ID });

            console.log('LIFF initialized successfully.');

            // ตรวจสอบว่าผู้ใช้ล็อกอินเข้าสู่ LINE แล้วหรือยัง
            if (!liff.isLoggedIn()) {
                liff.login();
                return;
            }

            // ถ้าล็อกอินแล้ว ให้ดึงข้อมูลโปรไฟล์
            const profileData = await liff.getProfile();
            profile.value = profileData;
            console.log('Profile loaded:', profileData);

        } catch (err) {
            console.error('LIFF Error:', err);
            error.value = `เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE: ${err.message}`;
        } finally {
            isLoading.value = false;
        }
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