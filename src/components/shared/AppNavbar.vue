<script setup lang="ts">
import { onMounted } from 'vue'
import { useSilosStore } from '@/stores/silos.store'

const silosStore = useSilosStore()

onMounted(() => {
  if (silosStore.silos.length === 0) {
    silosStore.fetchSilos()
  }
})
</script>

<template>
  <header class="app-navbar">
    <RouterLink to="/" class="navbar-brand">
      {{ silosStore.theme?.nom ?? 'Blog Redactor SEO' }}
    </RouterLink>

    <nav class="navbar-links">
      <RouterLink to="/" class="navbar-link">Dashboard</RouterLink>
      <RouterLink to="/linking" class="navbar-link">Maillage</RouterLink>
      <RouterLink to="/post-publication" class="navbar-link">GSC</RouterLink>
      <RouterLink to="/labo" class="navbar-link">Labo</RouterLink>
      <RouterLink to="/explorateur" class="navbar-link">Explorateur</RouterLink>
    </nav>

    <RouterLink to="/config" class="navbar-config" title="Configuration du thème">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.2" />
        <path d="M6.83 1.58l-.23 1.37a5.02 5.02 0 00-1.22.7L4.08 3.2l-1.17 2.02.93.99c-.06.26-.09.52-.09.79s.03.53.09.79l-.93.99 1.17 2.02 1.3-.45c.37.29.78.52 1.22.7l.23 1.37h2.34l.23-1.37c.44-.18.85-.41 1.22-.7l1.3.45 1.17-2.02-.93-.99c.06-.26.09-.52.09-.79s-.03-.53-.09-.79l.93-.99-1.17-2.02-1.3.45a5.02 5.02 0 00-1.22-.7L9.17 1.58H6.83z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
      </svg>
    </RouterLink>
  </header>
</template>

<style scoped>
.app-navbar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 2rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.navbar-brand {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
  margin-right: auto;
}

.navbar-brand:hover {
  text-decoration: none;
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.navbar-link {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-decoration: none;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}

.navbar-link:hover {
  color: var(--color-primary);
  background: var(--color-bg-hover);
  text-decoration: none;
}

.navbar-link.router-link-active {
  color: var(--color-primary);
  font-weight: 600;
}

.navbar-config {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}

.navbar-config:hover {
  color: var(--color-primary);
  background: var(--color-bg-hover);
  text-decoration: none;
}
</style>
