<script setup lang="ts">
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Blog Redactor SEO</h1>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}
</style>
