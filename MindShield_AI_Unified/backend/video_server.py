import base64, io, logging, threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
app=Flask(__name__);CORS(app,resources={r'/api/*':{'origins':'*'}})
model=None;processor=None;error=None;lock=threading.Lock()
# CLIP text-image similarities are RELATIVE, not calibrated probabilities.
PROMPTS={
 'nudity':['a movie frame showing a nude adult person with exposed intimate body parts','a scene depicting visible bare breasts or buttocks'],
 'sexual':['a movie scene showing two people kissing passionately on the lips','a movie scene depicting a sexual encounter in bed'],
 'violence':['an action movie scene with people punching or kicking each other in a fight','a movie scene showing a person being attacked with a weapon'],
 'gore':['a close up of a bloody face with visible cuts and wounds','a graphic movie scene showing blood, gore, and severe injuries'],
 'drugs':['a person smoking a cigarette or vaping in a movie','a movie scene showing a person injecting drugs or snorting cocaine','a person drinking alcohol from a beer bottle or liquor glass'],
 'disturbing':['a horror movie scene showing a frightening monster or demon','a scary movie scene showing a terrifying face or sinister ghost'],
 'safe':['a peaceful movie scene showing two people talking','a person standing normally in a room','a beautiful city or mountain landscape in a movie','people dancing happily at a celebration','a movie close-up of a normal face without blood','two people smiling together','a person walking outdoors']}
LABELS=[(k,p) for k,items in PROMPTS.items() for p in items]
def get_model():
 global model,processor,error
 with lock:
  if model is not None:return model,processor
  if error:raise RuntimeError(error)
  try:
   from transformers import CLIPModel,CLIPProcessor
   model=CLIPModel.from_pretrained('openai/clip-vit-base-patch32');processor=CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32');model.eval()
   return model,processor
  except Exception as exc:error=str(exc);raise
@app.get('/api/health')
def health():return jsonify(ok=True,model_loaded=model is not None,error=error)
@app.post('/api/analyze')
def analyze():
 try:
  data=request.get_json(force=True);raw=data['image'].split(',',1)[-1]
  if len(raw)>9_000_000:return jsonify(ok=False,error='Image too large'),413
  img=Image.open(io.BytesIO(base64.b64decode(raw))).convert('RGB');crop=data.get('crop');viewport=data.get('viewport')
  if crop and viewport and float(viewport.get('width',0))>0 and float(viewport.get('height',0))>0:
   sx=img.width/float(viewport['width']);sy=img.height/float(viewport['height']);l=max(0,int(float(crop['x'])*sx));t=max(0,int(float(crop['y'])*sy));r=min(img.width,int((float(crop['x'])+float(crop['width']))*sx));b=min(img.height,int((float(crop['y'])+float(crop['height']))*sy))
   if r-l>120 and b-t>80:img=img.crop((l,t,r,b))
  img.thumbnail((640,640));m,p=get_model();import torch
  inp=p(text=[label for _,label in LABELS],images=img,return_tensors='pt',padding=True)
  with torch.no_grad():logits=m(**inp).logits_per_image[0];values=(logits/100.0).tolist()
  scores={k:max(v for v,(category,_) in zip(values,LABELS) if category==k) for k in PROMPTS}
  return jsonify(ok=True,scores={k:round(v,5) for k,v in scores.items()},note='CLIP cosine similarities, not calibrated probabilities')
 except Exception as exc:app.logger.exception('Analysis failed');return jsonify(ok=False,error=str(exc)),500
if __name__=='__main__':
 print('SceneSafe AI running at http://127.0.0.1:5001');app.run(host='127.0.0.1',port=5001,debug=False,threaded=True)
