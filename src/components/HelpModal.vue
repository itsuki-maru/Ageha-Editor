<script setup lang="ts">
import Help from "./Help.vue";

// Help.vue をモーダルとして表示するための薄いラッパーであり、
// 閉じる操作やオーバーレイ表示だけを担当する。
defineProps<{
  visible: boolean;
}>();

defineEmits<{
  close: [];
}>();
</script>

<template>
  <transition>
    <div id="overlay-help" v-show="visible" @click.self="$emit('close')">
      <div id="content-help">
        <Help />
        <button class="btn-help-close" @click="$emit('close')">閉じる</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 0.3s ease-in-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

#overlay-help {
  z-index: 1;
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

#content-help {
  z-index: 2;
  height: 100%;
  width: 70%;
  padding: 1em;
  margin-left: 47%;
  background: #fff;
  overflow-y: scroll;
}

.btn-help-close {
  font-size: 12px;
  margin-bottom: 15px;
}
</style>
