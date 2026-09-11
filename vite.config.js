import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import inlineEdit from './vite-plugin-inline-edit.js';

export default defineConfig({
  // inlineEdit supplies the manifest of editable copy, and under `vite dev` an endpoint that writes
  // edits back to source. A production build gets the manifest only — there is no server to write with.
  plugins: [react(), inlineEdit()],
});
