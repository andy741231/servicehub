---
name: service-hub-subapp-template
description: Boilerplate walkthrough and checkpoints to follow when copying this folder for a new sub-app.
---

# New Sub-App Template (`client/src/pages/_template`)

## How to use this template

1. **Copy the directory:** Copy this `_template` folder to `client/src/pages/<new-app-id>`.
2. **Rename components:** Rename internal boilerplate file and component references to match your new sub-app.
3. **Register the app:** Open `client/src/config/apps.js` and add your app's meta config (id, path, icon, description).
4. **Define routes:**
   - Import your main container component in the app shell routing structure.
   - Attach route guards mapping to your sub-app id.

## Default Scaffold Files
- `index.jsx` - Standard entry point wrapper checking permission access.
- `Dashboard.jsx` - Boilerplate workspace layout.
