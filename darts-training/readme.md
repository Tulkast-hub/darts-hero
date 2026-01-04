# Darts Training Plugin v0.1

This plugin powers a darts training app with ranks and rewards, plus a React (Vite + TypeScript) frontend.

## Quick start

1. Copy the `darts-training` folder into `wp-content/plugins/`.
2. **Build the frontend**:
   ```bash
   cd wp-content/plugins/darts-training/public/app
   npm install
   npm run build
   ```
   This creates `public/app/dist/manifest.json` and bundle files.
3. Activate **Darts Training** in WordPress.
4. Add the shortcode `[darts_training]` to a page.

### Vite Dev Mode (optional)
Add to `wp-config.php`:
```php
define('DT_VITE_DEV', true);
```
Start Vite:
```bash
cd wp-content/plugins/darts-training/public/app
npm run dev
```
Visit any page with the shortcode to load the dev server.

## Training flow
- Start a session via the React UI, it calls `/wp-json/darts/v1/session` with `game_key`.
- End a session with `payload` such as `{accuracy: 62, difficulty: 3, volume: 90}`.
- XP is computed and applied to your per-game rank (Bronze→Master).

## Tables
- `wp_dt_user_stats`, `wp_dt_sessions`, `wp_dt_levels`, `wp_dt_rewards`, `wp_dt_user_rewards`

## Security
- Uses WP nonces & permission checks for REST routes.
