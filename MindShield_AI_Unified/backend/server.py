import base64, io, os, threading, logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
logging.basicConfig(level=logging.INFO)
lock = threading.RLock()
image_model = None
image_processor = None
text_classifier = None
IMAGE_MODEL = "openai/clip-vit-base-patch32"
TEXT_MODEL = "cross-encoder/nli-MiniLM2-L6-H768"
PROMPTS = {
 "violence": ["a photograph showing blood and graphic injuries", "a photograph of a bloody wound", "a graphic violent injury with blood"],
 "explicit": ["a photograph showing explicit nudity with exposed genitals", "an explicit pornographic photograph"],
 "safe": ["a photograph of people talking normally", "a landscape photograph of trees and mountains", "a photograph of a smiling person", "a photograph of food on a plate", "a photograph of people exercising", "a normal family photograph"]
}
TEXT_LABELS = {
 "cyber": "direct personal harassment or bullying",
 "body": "encouragement of dangerous eating behaviors or extreme weight loss",
 "selfharm": "encouragement to self-injure",
 "safe": "neutral educational supportive or ordinary communication"
}
def load_image():
 global image_model, image_processor
 if image_model is None:
  from transformers import CLIPModel, CLIPProcessor
  app.logger.info("Loading CLIP model; first run downloads model weights.")
  image_model = CLIPModel.from_pretrained(IMAGE_MODEL)
  image_processor = CLIPProcessor.from_pretrained(IMAGE_MODEL)
  image_model.eval()
 return image_model, image_processor
def load_text():
 global text_classifier
 if text_classifier is None:
  from transformers import pipeline
  app.logger.info("Loading NLI text model; first run downloads model weights.")
  text_classifier = pipeline("zero-shot-classification", model=TEXT_MODEL, device=-1)
 return text_classifier
@app.get("/api/health")
def health():
 return jsonify(ok=True, image_ready=image_model is not None, text_ready=text_classifier is not None, local_only=True)
@app.post("/api/image")
def image():
 try:
  payload=request.get_json(force=True)
  raw=payload.get("image","")
  if len(raw)>5_000_000: return jsonify(ok=False,error="Image too large"),413
  raw=raw.split(",",1)[-1]
  picture=Image.open(io.BytesIO(base64.b64decode(raw,validate=True))).convert("RGB")
  picture.thumbnail((512,512))
  with lock:
   model,proc=load_image()
   import torch
   labels=[(category,prompt) for category,phrases in PROMPTS.items() for prompt in phrases]
   batch=proc(text=[p for _,p in labels],images=picture,return_tensors="pt",padding=True)
   with torch.inference_mode():
    scores=model(**batch).logits_per_image[0].softmax(dim=-1).tolist()
  per={category:max(v for (cat,_),v in zip(labels,scores) if cat==category) for category in PROMPTS}
  # Contrastive similarities are not calibrated risk probabilities.
  best=max(per,key=per.get)
  return jsonify(ok=True,category=best,relative_scores=per,model=IMAGE_MODEL,calibrated=False)
 except Exception as exc:
  app.logger.exception("Image inference failed")
  return jsonify(ok=False,error=str(exc)),500
@app.post("/api/text")
def text():
 try:
  value=str(request.get_json(force=True).get("text",""))[:900]
  if not value.strip():return jsonify(ok=False,error="Empty text"),400
  with lock:
   classifier=load_text()
   result=classifier(value,list(TEXT_LABELS.values()),multi_label=False,
       hypothesis_template="This text contains {}.")
  ranked=[{"category":next(k for k,v in TEXT_LABELS.items() if v==label),"score":float(score)}
          for label,score in zip(result["labels"],result["scores"])]
  return jsonify(ok=True,ranking=ranked,model=TEXT_MODEL,calibrated=False)
 except Exception as exc:
  app.logger.exception("Text inference failed")
  return jsonify(ok=False,error=str(exc)),500
if __name__=="__main__":
 app.run(host="127.0.0.1",port=5055,threaded=True,debug=False)
