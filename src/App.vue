<script setup lang="ts">
import Editor from "./Editor.vue";
import Viewer from "./Viewer.vue";
import { ref } from "vue";
import { message } from '@tauri-apps/plugin-dialog';
import { useLocalStorageStore } from "./stores/localStorages";
import { useRustArgsStore } from './stores/markdownDatas';


// ローカルストレージ情報ストア
const localStorageItem = useLocalStorageStore();
const isViewerMode = ref(true);
if (localStorageItem.isViewerModeFromLocalStrage === "false") isViewerMode.value = false;

// Rustの引数取得ストア
const rustArgsStore = useRustArgsStore();
if (rustArgsStore.rustArgsData.file_abs_path === "") isViewerMode.value = false;

async function openVersion() {
  await message(
    `Ageha Editor: Version ${__APP_VERSION__}`,
    { title: "Version", kind: "info" }
  );
}

const handlerMode = (): void => {
  if (isViewerMode.value) {
    isViewerMode.value = false;
    localStorageItem.setViewerMode(false);
  } else {
    isViewerMode.value = true;
    localStorageItem.setViewerMode(true);
  }
}
</script>

<template>
  <div class="header-zone">
    <h1 class="app-header" id="application-title" v-on:dblclick="openVersion">Ageha Editor</h1>
    <div class="switch-btn-container" title="閲覧モードと編集モードの切替">
      <label for="switch" class="switch-label">
        <div class="switch">
          <input type="checkbox" id="switch" v-model="isViewerMode" v-on:click="handlerMode()">
                <div class="toggle-base"></div>
                <div class="circle"></div>
                <div class="slider"></div>
        </div>
      </label>
    </div>
  </div>
  <Viewer v-if="isViewerMode"></Viewer>
  <Editor v-else></Editor>
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
  font-size: 34px;
  margin: 0;
  margin-left: 10px;
}

.switch-label {
  position: relative;
  display: flex;
  align-items: center;
}

input[type='checkbox'] {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.toggle-base {
  width: 56px;
  border-radius: 16px;
  height: 32px;
  background-color: #ababab;
}

input:checked~.base {
  background-color: rgb(184, 215, 255);
  transition: 0.5s;
}

input:checked~.circle {
  transform: translateX(100%);
  background-color: blue;
}

.circle {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: white;
  transition: 0.5s;
}

.switch {
  position: relative;
}

.switch-btn-container {
  display: flex;
  justify-content: space-between;
}

.private-public-label {
  font-size: 16px;
  margin-left: 5px;
  margin-top: 6px;
  font-weight: bold;
}

.private-public-label p {
  text-shadow: 1px 1px 2px rgb(202, 202, 202);
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