from fastapi import FastAPI, UploadFile, File, HTTPException
import subprocess
import os
import logging

app = FastAPI()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_FOLDER, file.filename)

    try:
        # Save the uploaded file
        with open(file_location, "wb") as f:
            f.write(await file.read())
    except Exception as e:
        logging.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    # Build command
    cmd = [
        "./whisper.cpp/build/bin/whisper-cli",
        "-m", "./whisper.cpp/models/ggml-base.en.bin",
        "-f", file_location,
        "--output-txt",  # Optional: output to text file for easier parsing
    ]

    try:
        # Run whisper-cli process
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        logging.error("Whisper CLI timed out.")
        raise HTTPException(status_code=504, detail="Transcription timed out.")
    except Exception as e:
        logging.error(f"Error running whisper-cli: {e}")
        raise HTTPException(status_code=500, detail="Error during transcription.")

    # Check if whisper-cli failed
    if result.returncode != 0:
        logging.error(f"Whisper CLI failed: {result.stderr}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {result.stderr}")

    transcription_text = result.stdout.strip()

    # If output is large or has extra lines, you can do some cleaning here
    # For example, keep only lines starting after some marker, etc.

    return {"transcription": transcription_text}