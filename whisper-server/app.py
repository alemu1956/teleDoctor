from fastapi import FastAPI, UploadFile, File
import whisper
import os

# Load the Whisper model once at startup
model = whisper.load_model("base")  # Options: base, small, medium, large

# Initialize FastAPI app
app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Welcome to malifoClinic! Use /inference to transcribe audio."}

@app.post("/inference")
async def inference(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    contents = await file.read()
    temp_file = "temp.wav"
    with open(temp_file, "wb") as f:
        f.write(contents)

    # Transcribe the audio file
    result = model.transcribe(temp_file)

    # Clean up the temporary file
    os.remove(temp_file)

    # Return the transcription result
    return {"text": result["text"]}
@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # Save uploaded file temporarily
    contents = await audio.read()
    temp_file = "temp.wav"
    with open(temp_file, "wb") as f:
        f.write(contents)

    # Transcribe the audio file
    result = model.transcribe(temp_file)

    # Clean up the temporary file
    os.remove(temp_file)

    # Return the transcription in two forms:
    return {
        "local": result["text"],        # original language
        "english": result["text"]       # just repeat it for now
    }