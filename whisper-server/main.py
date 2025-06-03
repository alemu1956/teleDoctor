from fastapi import FastAPI, UploadFile, File, Form
import requests

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "FastAPI is working!"}

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = Form(...)):
    # Send audio to your whisper server
    files = {'file': (audio.filename, await audio.read(), audio.content_type)}
    data = {'language': language}

    response = requests.post('http://localhost:8080/inference', files=files, data=data)
    transcription = response.json()

    return {
        "local": transcription.get("text", ""),
        "english": "Translation not implemented yet."  # Placeholder
    }