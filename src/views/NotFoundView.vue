<template>
  <div class="not-found">
    <h1 class="not-found__title">404</h1>
    <h2 class="not-found__subtitle">Page introuvable</h2>
    <p class="not-found__text">L'adresse que vous avez saisie ne correspond à aucune page.</p>
    <RouterLink to="/" class="not-found__btn">
      Retour au tableau de bord
    </RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
}

.not-found__title {
  font-size: 5rem;
  font-weight: 800;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1;
}

.not-found__subtitle {
  font-size: 1.5rem;
  color: var(--color-text);
  margin: 0.5rem 0;
}

.not-found__text {
  color: var(--color-text-muted);
  font-size: 0.9375rem;
  margin: 0.5rem 0 1.5rem;
}

.not-found__btn {
  display: inline-block;
  padding: 0.625rem 1.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-primary);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}

.not-found__btn:hover {
  opacity: 0.9;
}
</style>
