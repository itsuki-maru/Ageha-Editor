<script setup lang="ts">
// 保存失敗や簡単な通知など、
// エディタ全体で共通利用するシンプルなメッセージモーダル。
defineProps<{
  visible: boolean;
  message: string;
}>();

defineEmits<{
  close: [];
}>();
</script>

<template>
  <div id="overlay-message" v-show="visible" @click.self="$emit('close')">
    <div id="content-message">
      <h2 class="modal-h2">メッセージ</h2>
      <div class="input-text-zone">
        <p>
          <strong>{{ message }}</strong>
        </p>
      </div>
      <div class="btn-close">
        <button id="message-close-btn" @click="$emit('close')">閉じる</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
#overlay-message {
  z-index: 3;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

#content-message {
  z-index: 4;
  width: 30%;
  padding: 1em;
  background: whitesmoke;
  border-radius: 10px;
  text-align: center;
}
</style>
