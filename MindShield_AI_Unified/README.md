# MindShield AI — Unified Chrome Extension

This package combines the uploaded MindShield AI webpage image/text classifier and SceneSafe 7 YouTube video filter. Both use genuine pretrained CLIP models; webpage text uses a pretrained NLI model. The two existing Python backends remain separate to avoid changing their tested inference logic.

## Install (Mac)
1. Unzip this archive. Open Terminal and navigate to the `MindShield_AI_Unified/backend` folder.
2. Create a Python environment: `python3 -m venv .venv`
3. Activate it: `source .venv/bin/activate`
4. Install dependencies: `python -m pip install -r requirements.txt -r video_requirements.txt`
5. Start the webpage AI server: `python server.py` (leave Terminal open).
6. Open a SECOND Terminal window, navigate to the same backend folder, activate the environment, then run: `python video_server.py` (leave this open too).
7. Open Chrome → `chrome://extensions` → enable Developer mode → Load unpacked → select the `extension` folder.
8. Turn on protection in the MindShield popup, enable YouTube scene analysis, and choose your filtering categories. Refresh existing webpages/YouTube tabs after installing.

The webpage server listens on 127.0.0.1:5055; the video server listens on 127.0.0.1:5001. The first analysis may download model weights and take time. No paid APIs or accounts required.

## Important
- Uninstall or DISABLE the original SceneSafe and MindShield extensions while testing the unified extension, or both will filter simultaneously. Do not delete the original project folders.
- Existing statistics belong to the original extension ID and do not automatically transfer to this new installation. The dashboard starts fresh.
- YouTube video analysis requires the YouTube tab to be active and visible. Scenes can appear before detection; skipping is experimental.
- The main protection switch and pause setting apply to both systems. Webpage and video categories have separate settings.
- Webpage filtering is intended for supported images and visible text, not every page element or browser.
- This is NOT a clinical mental-health intervention, and classifier scores are not calibrated probabilities. False positives (especially educational content) are possible.
- The YouTube module retains the original experimental caption profanity word-list detection, which is rule-based, not AI.
- Website images/text are sent to a local Python process, not to a hosted inference provider by this application. Pretrained weights may download from model repositories.

## Verification
1. Open the popup; confirm both AI engine status lines report connected.
2. Test webpage image blurring on an ordinary website and check the dashboard count.
3. Test a text overlay and Show Anyway; check the Revealed count.
4. Open a YouTube video, keep tab visible, enable video analysis, and verify the on-video MindShield panel displays status.
5. Turn off the main Protection switch and verify both systems stop filtering.

These integration checks must be performed locally. Packaging and syntax checks do not establish detection accuracy or runtime compatibility.
