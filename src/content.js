;(() => {
  'use strict'

  // Extension bootstrap

  const CREATE_PATH = '/create'

  function isCreatePage() {
    return (
      window.location.hostname === 'www.clank.world' &&
      window.location.pathname === CREATE_PATH
    )
  }

  async function initDaedalus() {
    if (!isCreatePage()) {
      return
    }

    if (document.getElementById('daedalus-forge-root')) {
      return
    }

    if (!window.DaedalusForgePanel) {
      console.error('[Daedalus] Forge panel module was not found.')
      return
    }

    try {
      await window.DaedalusForgePanel.create()
    } catch (error) {
      console.error('[Daedalus] Failed to initialize:', error)
    }
  }

  initDaedalus()

  // Clank is an SPA, so guard against future client-side navigation changes.

  let lastPath = window.location.pathname

  const observer = new MutationObserver(() => {
    if (window.location.pathname === lastPath) {
      return
    }

    lastPath = window.location.pathname

    if (isCreatePage()) {
      initDaedalus()
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
})()
