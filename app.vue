<script setup>
    import { ref, onMounted } from 'vue';

    // ��� LIFF ID �ͧ�س�����
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
                // ��������͡�Թ ������˹����͡�Թ
                liff.login();
            }
        } catch (e) {
            console.error(e);
            errorMessage.value = "�Դ��ͼԴ��Ҵ: " + e.message;
        }
    });
</script>

<template>
    <div style="padding: 20px; font-family: sans-serif; text-align: center;">
        <div v-if="displayName">
            <h1>���ʴ�, {{ displayName }}!</h1>
            <p>����������� LIFF �����!</p>
        </div>
        <div v-else-if="errorMessage">
            <p style="color: red;">{{ errorMessage }}</p>
        </div>
        <div v-else>
            <p>���ѧ��Ŵ...</p>
        </div>
    </div>
</template>