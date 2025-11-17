from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import BertTokenizer, BertModel
import torch
import uvicorn

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🚀 Loading BERT model...")
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print(f"Using device: {device}")

tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
model = BertModel.from_pretrained('bert-base-uncased', output_attentions=True).to(device)
model.eval()
print("✅ Model loaded successfully!")

# Request model
class AnalyzeRequest(BaseModel):
    text: str
    layer: int = 6

@app.post('/analyze')
async def analyze(request: AnalyzeRequest):
    print(f"📥 Received analyze request")
    print(f"Text: {request.text}")
    print(f"Layer: {request.layer}")
    
    inputs = tokenizer(request.text, return_tensors='pt')
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
    attention = outputs.attentions[request.layer][0].cpu().numpy()
    
    print(f"✅ Returning {len(tokens)} tokens")
    
    return {
        'tokens': tokens,
        'attention': attention.tolist(),
        'num_heads': attention.shape[0]
    }

@app.get('/health')
async def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    print("🌟 Starting FastAPI server on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)