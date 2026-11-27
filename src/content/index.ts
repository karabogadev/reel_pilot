/** Content script entry: one runtime, the features on top of it, and the popup's diagnostics request. */
import type { Message } from '../shared/types.ts';
import { ads } from './features/ads.ts';
import { fullscreen } from './features/fullscreen.ts';
import { session } from './features/session.ts';
import { viewing } from './features/viewing.ts';
import { createRuntime } from './runtime.ts';

declare const __VERSION__: string;

const flag = globalThis as { __reelPilotLoaded?: boolean };

if (!flag.__reelPilotLoaded) {
  flag.__reelPilotLoaded = true;

  const runtime = createRuntime(__VERSION__);
  viewing(runtime);
  session(runtime);
  ads(runtime);
  fullscreen(runtime);
  runtime.start();

  chrome.runtime.onMessage.addListener((message: Message, _sender, respond) => {
    if (message?.type === 'diag') respond(runtime.diagnostics());
  });
}
