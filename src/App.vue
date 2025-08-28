<script setup lang="ts">
import Editor from "./Editor.vue";
import { message } from '@tauri-apps/plugin-dialog';


async function openVersion() {
  await message(
    `Ageha Editor: Version ${__APP_VERSION__}`,
    { title: "Version", kind: "info" }
  );
}
</script>

<template>
  <div class="header-zone">
    <h1 class="app-header" id="application-title" v-on:dblclick="openVersion">Ageha Editor</h1>
  </div>
  <Editor></Editor>
</template>

<style>
.container {
  height: 100%;
}

.v-enter-active,
.v-leave-active {
  transition: all 0.3s ease-in-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.header-zone {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  border-bottom: solid 1px gray;
}

.app-header {
  color: #f0f0f0;
  text-shadow: 2px 1px 2px rgb(165, 165, 165);
  letter-spacing: 1px;
  font-size: 20px;
  margin: 0;
  margin-left: 10px;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>