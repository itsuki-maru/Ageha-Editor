<script setup lang="ts">
import Editor from "./Editor.vue";

</script>

<template>
  <h1 class="app-header" id="application-title">Ageha Editor</h1>
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

.app-header {
  color: #f0f0f0;
  text-shadow: 2px 1px 2px rgb(165, 165, 165);
  letter-spacing: 1px;
  font-size: 34px;
  margin: 0;
  margin-left: 10px;
  margin-bottom: 10px;
  border-bottom: solid 1px gray;
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