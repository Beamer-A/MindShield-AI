# Privacy
This experimental extension accesses page images and selected paragraph text and sends them to a local Flask AI service at 127.0.0.1:5055 for inference. The service does not intentionally log or store image contents or text. Browser extension storage contains only preferences and aggregate counts. No cloud inference provider is contacted by the application; model weights download from pretrained model hosting on first use. The extension can access public HTTP(S) image URLs with browser host permissions. Avoid sensitive sites and private content. Disable protection or remove the extension at any time.


## Unified YouTube module
The extension captures the visible active YouTube tab for frame classification and sends the image to a Python server on 127.0.0.1:5001. It does not intentionally persist the captured frame. Captions are inspected in the browser for profanity using a local word list. No cloud inference is performed by these server scripts; model downloads may contact external model hosts.
