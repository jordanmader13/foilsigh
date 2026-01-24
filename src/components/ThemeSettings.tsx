import { useState } from 'react'

export const REVEAL_THEMES = [
  { id: 'black', name: 'Black' },
  { id: 'white', name: 'White' },
  { id: 'league', name: 'League' },
  { id: 'beige', name: 'Beige' },
  { id: 'sky', name: 'Sky' },
  { id: 'night', name: 'Night' },
  { id: 'serif', name: 'Serif' },
  { id: 'simple', name: 'Simple' },
  { id: 'solarized', name: 'Solarized' },
  { id: 'blood', name: 'Blood' },
  { id: 'moon', name: 'Moon' },
  { id: 'dracula', name: 'Dracula' },
] as const

export type ThemeId = typeof REVEAL_THEMES[number]['id']

export interface ThemeConfig {
  theme: ThemeId
  primaryColor: string
  secondaryColor: string
  tertiaryColor: string
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  theme: 'black',
  primaryColor: '#42affa',
  secondaryColor: '#ffffff',
  tertiaryColor: '#969696',
}

interface ThemeSettingsProps {
  config: ThemeConfig
  onChange: (config: ThemeConfig) => void
  isOpen: boolean
  onClose: () => void
}

export function ThemeSettings({ config, onChange, isOpen, onClose }: ThemeSettingsProps) {
  const [localConfig, setLocalConfig] = useState(config)

  const handleChange = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    const newConfig = { ...localConfig, [key]: value }
    setLocalConfig(newConfig)
    onChange(newConfig)
  }

  if (!isOpen) return null

  return (
    <div className="theme-settings-overlay" onClick={onClose}>
      <div className="theme-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="theme-settings-header">
          <h3>Theme Settings</h3>
          <button className="close-button" onClick={onClose}>x</button>
        </div>

        <div className="theme-settings-content">
          <div className="setting-group">
            <label>Base Theme</label>
            <select
              value={localConfig.theme}
              onChange={(e) => handleChange('theme', e.target.value as ThemeId)}
            >
              {REVEAL_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>Primary Color</label>
            <div className="color-input-row">
              <input
                type="color"
                value={localConfig.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
              />
              <span className="color-hint">Links, accents</span>
            </div>
          </div>

          <div className="setting-group">
            <label>Secondary Color</label>
            <div className="color-input-row">
              <input
                type="color"
                value={localConfig.secondaryColor}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
              />
              <span className="color-hint">Headings</span>
            </div>
          </div>

          <div className="setting-group">
            <label>Tertiary Color</label>
            <div className="color-input-row">
              <input
                type="color"
                value={localConfig.tertiaryColor}
                onChange={(e) => handleChange('tertiaryColor', e.target.value)}
              />
              <span className="color-hint">Body text</span>
            </div>
          </div>

          <button
            className="reset-button"
            onClick={() => {
              setLocalConfig(DEFAULT_THEME_CONFIG)
              onChange(DEFAULT_THEME_CONFIG)
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  )
}
