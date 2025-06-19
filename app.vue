<script setup>
import { ref, onMounted } from 'vue';

// ใส่ LIFF ID ของคุณที่นี่
const LIFF_ID = '2007601116-6GoXj5DR';

const displayName = ref('');
const errorMessage = ref('');

onMounted(async () => {
  try {
    const liffModule = await import('@line/liff');
    const liff = liffModule.default;

    await liff.init({ liffId: LIFF_ID });

    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      displayName.value = profile.displayName;
    } else {
      // ถ้าไม่ล็อกอิน ก็ให้ไปหน้าล็อกอิน
      liff.login();
    }
  } catch (e) {
    console.error(e);
    errorMessage.value = "เกิดข้อผิดพลาด: " + e.message;
  }
});
</script>

<template>
  <div style="padding: 20px; font-family: sans-serif; text-align: center;">
    <div v-if="displayName">
      <h1>สวัสดี, {{ displayName }}!</h1>
      <p>การเชื่อมต่อ LIFF สำเร็จ!</p>
    </div>
    <div v-else-if="errorMessage">
      <p style="color: red;">{{ errorMessage }}</p>
    </div>
    <div v-else>
      <p>กำลังโหลด...</p>
    </div>
  </div>
</template>