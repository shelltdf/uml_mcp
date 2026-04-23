import { createApp } from 'vue'
import App from './App.vue'
import { initDocumentLangFromStorage } from './composables/useI18n'
import { applyThemeToDocument, getStoredThemePreference } from './theme/themePreference'
import './styles/win-theme.css'

initDocumentLangFromStorage()
applyThemeToDocument(getStoredThemePreference())

createApp(App).mount('#app')
